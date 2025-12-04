/**
 * Custom OTLP-to-AGL Span Exporter
 * 
 * This exporter bridges Mastra's OpenTelemetry traces to AGL's format.
 * 
 * How it works:
 * 1. Mastra agent runs normally in your web app
 * 2. Mastra's OTel instrumentation creates spans
 * 3. This custom exporter converts and sends spans to AGL
 * 4. AGL stores them for analysis/training
 * 
 * Key Concept:
 * - AGL requires rollout_id and attempt_id for each span
 * - We create a new rollout for each "root" trace (agent execution)
 * - Child spans inherit the rollout_id from the root
 */

import {
    SpanExporter,
    ReadableSpan,
} from "@opentelemetry/sdk-trace-base";
import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import axios from "axios";

const AGL_SERVER_URL = process.env.AGL_SERVER_URL || "http://localhost:4747";

// Cache to map trace_id -> rollout_id
const traceToRollout: Map<string, { rollout_id: string; attempt_id: string }> = new Map();

// Sequence counter per rollout
const sequenceCounters: Map<string, number> = new Map();

/**
 * Custom SpanExporter that sends traces to AGL server
 */
export class AGLSpanExporter implements SpanExporter {
    private client = axios.create({
        baseURL: AGL_SERVER_URL,
        timeout: 10000,
        headers: { "Content-Type": "application/json" },
    });

    /**
     * Export spans to AGL
     */
    async export(
        spans: ReadableSpan[],
        resultCallback: (result: ExportResult) => void
    ): Promise<void> {
        try {
            for (const span of spans) {
                await this.exportSpan(span);
            }
            resultCallback({ code: ExportResultCode.SUCCESS });
        } catch (error) {
            console.error("[AGL Exporter] Export error:", error);
            resultCallback({
                code: ExportResultCode.FAILED,
                error: error as Error,
            });
        }
    }

    /**
     * Export a single span
     */
    private async exportSpan(span: ReadableSpan): Promise<void> {
        const traceId = span.spanContext().traceId;
        const spanId = span.spanContext().spanId;
        // parentSpanId is available on the span but not in the type definition
        const parentSpanId = (span as any).parentSpanId as string | undefined;

        // Check if this is a root span (no parent) or starts a new agent execution
        const isRootSpan = !parentSpanId || this.isAgentRootSpan(span);

        // Get or create rollout for this trace
        let rolloutInfo = traceToRollout.get(traceId);

        if (!rolloutInfo && isRootSpan) {
            // Create new rollout for this agent execution
            rolloutInfo = await this.createRollout(span, traceId);
            traceToRollout.set(traceId, rolloutInfo);
            sequenceCounters.set(rolloutInfo.rollout_id, 0);
        }

        if (!rolloutInfo) {
            // This is a child span but we haven't seen the parent yet
            // This can happen with async processing - skip for now
            console.debug(`[AGL Exporter] Skipping orphan span: ${span.name}`);
            return;
        }

        // Get next sequence ID
        const sequenceId = sequenceCounters.get(rolloutInfo.rollout_id) || 0;
        sequenceCounters.set(rolloutInfo.rollout_id, sequenceId + 1);

        // Convert span to AGL format
        const aglSpan = this.convertToAGLSpan(span, rolloutInfo, sequenceId);

        // Send to AGL
        try {
            await this.client.post("/add_span", aglSpan);
            console.debug(`[AGL Exporter] Sent span: ${span.name}`);
        } catch (error: any) {
            console.error(`[AGL Exporter] Failed to send span:`, error.message);
        }
    }

    /**
     * Check if this span represents the start of an agent execution
     */
    private isAgentRootSpan(span: ReadableSpan): boolean {
        const name = span.name.toLowerCase();
        return (
            name.includes("agent") ||
            name.includes("generate") ||
            name.includes("mastra")
        );
    }

    /**
     * Create a new rollout for an agent execution
     */
    private async createRollout(
        span: ReadableSpan,
        traceId: string
    ): Promise<{ rollout_id: string; attempt_id: string }> {
        // Extract input from span attributes
        const attributes = span.attributes;
        const input = {
            trace_id: traceId,
            span_name: span.name,
            agent: attributes["agent.name"] || attributes["mastra.agent.name"] || "unknown",
            timestamp: new Date().toISOString(),
            // Include any useful attributes as input
            attributes: Object.fromEntries(
                Object.entries(attributes).filter(([k]) =>
                    !k.startsWith("_") && typeof attributes[k] !== "undefined"
                )
            ),
        };

        try {
            // Create rollout
            const response = await this.client.post("/enqueue_rollout", {
                input,
                mode: "train",
                config: { max_attempts: 1, timeout_seconds: 300 },
            });
            const rollout_id = response.data.rollout_id;

            // Start the rollout immediately
            await this.client.post("/start_rollout", { rollout_id });

            // Create attempt
            const attemptResponse = await this.client.post("/start_attempt", {
                rollout_id,
            });
            const attempt_id = attemptResponse.data.attempt_id;

            console.debug(`[AGL Exporter] Created rollout: ${rollout_id}`);

            return { rollout_id, attempt_id };
        } catch (error: any) {
            console.error("[AGL Exporter] Failed to create rollout:", error.message);
            // Return a temporary ID - span won't be stored but won't crash
            return {
                rollout_id: `temp-${traceId.substring(0, 8)}`,
                attempt_id: `temp-attempt`,
            };
        }
    }

    /**
     * Convert OpenTelemetry span to AGL span format
     */
    private convertToAGLSpan(
        span: ReadableSpan,
        rolloutInfo: { rollout_id: string; attempt_id: string },
        sequenceId: number
    ): any {
        return {
            rollout_id: rolloutInfo.rollout_id,
            attempt_id: rolloutInfo.attempt_id,
            sequence_id: sequenceId,
            trace_id: span.spanContext().traceId,
            span_id: span.spanContext().spanId,
            parent_id: (span as any).parentSpanId || null,
            name: span.name,
            status: {
                status_code: span.status.code === 0 ? "UNSET" :
                    span.status.code === 1 ? "OK" : "ERROR",
                description: span.status.message || null,
            },
            attributes: this.sanitizeAttributes(span.attributes),
            events: span.events.map((e) => ({
                name: e.name,
                timestamp: e.time[0] + e.time[1] / 1e9,
                attributes: this.sanitizeAttributes(e.attributes || {}),
            })),
            links: span.links.map((l) => ({
                trace_id: l.context.traceId,
                span_id: l.context.spanId,
                attributes: this.sanitizeAttributes(l.attributes || {}),
            })),
            start_time: span.startTime[0] + span.startTime[1] / 1e9,
            end_time: span.endTime[0] + span.endTime[1] / 1e9,
            context: {
                trace_id: span.spanContext().traceId,
                span_id: span.spanContext().spanId,
                is_remote: span.spanContext().isRemote || false,
                trace_state: {},
            },
            parent: (span as any).parentSpanId
                ? {
                    trace_id: span.spanContext().traceId,
                    span_id: (span as any).parentSpanId,
                    is_remote: false,
                    trace_state: {},
                }
                : null,
            resource: {
                attributes: this.sanitizeAttributes(
                    span.resource?.attributes || {}
                ),
            },
        };
    }

    /**
     * Sanitize attributes for JSON serialization
     */
    private sanitizeAttributes(
        attrs: Record<string, any>
    ): Record<string, any> {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(attrs)) {
            if (value === undefined || value === null) continue;
            if (typeof value === "function") continue;
            if (typeof value === "object" && !Array.isArray(value)) {
                // Skip complex objects, convert to string
                result[key] = JSON.stringify(value);
            } else {
                result[key] = value;
            }
        }
        return result;
    }

    /**
     * Shutdown the exporter
     */
    async shutdown(): Promise<void> {
        // Complete any pending rollouts
        for (const [traceId, rolloutInfo] of traceToRollout.entries()) {
            try {
                await this.client.post("/update_rollout", {
                    rollout_id: rolloutInfo.rollout_id,
                    status: "succeeded",
                });
                await this.client.post("/update_attempt", {
                    rollout_id: rolloutInfo.rollout_id,
                    attempt_id: rolloutInfo.attempt_id,
                    status: "succeeded",
                });
            } catch (error) {
                // Ignore errors during shutdown
            }
        }
        traceToRollout.clear();
        sequenceCounters.clear();
    }

    /**
     * Force flush (no-op for this exporter)
     */
    async forceFlush(): Promise<void> {
        // No batching, so nothing to flush
    }
}

export default AGLSpanExporter;
