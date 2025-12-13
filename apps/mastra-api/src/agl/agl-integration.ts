/**
 * AGL Integration Module
 * 
 * Uses agent-lightning-sdk for rollout management.
 * Provides utilities for Mastra agent integration.
 */
import { LightningStoreClient, Span as AGLSpan } from 'agent-lightning-sdk';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';

// Environment configuration
const AGL_SERVER_URL = process.env.AGL_SERVER_URL || 'http://localhost:4747';
export const AGL_ENABLED = process.env.AGL_ENABLED === 'true';

// Singleton client
let _client: LightningStoreClient | null = null;

export function getAGLClient(): LightningStoreClient {
    if (!_client) {
        _client = new LightningStoreClient(AGL_SERVER_URL);
    }
    return _client;
}

// Active rollouts indexed by trace ID
interface RolloutContext {
    rollout_id: string;
    attempt_id: string;
    sequence_id: number;
}
const activeRollouts = new Map<string, RolloutContext>();

/**
 * Create a new rollout when an agent execution starts
 */
export async function createAgentRollout(
    traceId: string,
    agentName: string,
    input: Record<string, unknown>
): Promise<RolloutContext> {
    const client = getAGLClient();

    try {
        // Use startRollout which creates both rollout and attempt
        const result = await client.startRollout(
            {
                agent: agentName,
                trace_id: traceId,
                started_at: new Date().toISOString(),
                ...input,
            },
            'train',  // mode
            undefined, // resources_id
            { max_attempts: 1, timeout_seconds: 300 }
        );

        const context: RolloutContext = {
            rollout_id: result.rollout_id,
            attempt_id: result.attempt!.attempt_id,
            sequence_id: 0,
        };

        activeRollouts.set(traceId, context);
        console.log(`[AGL] Created rollout: ${context.rollout_id}`);

        return context;
    } catch (error) {
        console.error('[AGL] Failed to create rollout:', error);
        // Return a temporary context so processing can continue
        const tempContext: RolloutContext = {
            rollout_id: `temp-${traceId.substring(0, 8)}`,
            attempt_id: `temp-attempt`,
            sequence_id: 0,
        };
        activeRollouts.set(traceId, tempContext);
        return tempContext;
    }
}

/**
 * Complete a rollout when agent execution finishes
 */
export async function completeAgentRollout(
    traceId: string,
    output: Record<string, unknown>,
    success: boolean = true
): Promise<void> {
    const context = activeRollouts.get(traceId);
    if (!context || context.rollout_id.startsWith('temp-')) {
        return; // No valid rollout to complete
    }

    const client = getAGLClient();
    const status = success ? 'succeeded' : 'failed';

    try {
        // Update attempt with output
        await client.updateAttempt(
            context.rollout_id,
            context.attempt_id,
            {
                status,
                metadata: { output, completed_at: new Date().toISOString() },
            }
        );

        // Update rollout status
        await client.updateRollout(context.rollout_id, { status });

        console.log(`[AGL] Completed rollout: ${context.rollout_id} (${status})`);
    } catch (error) {
        console.error('[AGL] Failed to complete rollout:', error);
    } finally {
        activeRollouts.delete(traceId);
    }
}

/**
 * Get rollout context for a trace
 */
export function getRolloutContext(traceId: string): RolloutContext | undefined {
    return activeRollouts.get(traceId);
}

/**
 * Get next sequence ID for a span in a rollout
 */
export function getNextSequenceId(traceId: string): number {
    const context = activeRollouts.get(traceId);
    if (!context) return 0;
    return context.sequence_id++;
}

/**
 * Convert OpenTelemetry span to AGL Span format
 */
export function convertToAGLSpan(
    span: ReadableSpan,
    context: RolloutContext
): AGLSpan {
    return {
        rollout_id: context.rollout_id,
        attempt_id: context.attempt_id,
        sequence_id: getNextSequenceId(span.spanContext().traceId),
        trace_id: span.spanContext().traceId,
        span_id: span.spanContext().spanId,
        parent_id: (span as unknown as { parentSpanId?: string }).parentSpanId || null,
        name: span.name,
        status: {
            status_code: span.status.code === 0 ? 'UNSET' :
                span.status.code === 1 ? 'OK' : 'ERROR',
            description: span.status.message || null,
        },
        attributes: sanitizeAttributes(span.attributes as Record<string, unknown>),
        events: span.events.map(e => ({
            name: e.name,
            timestamp: e.time[0] + e.time[1] / 1e9,
            attributes: sanitizeAttributes((e.attributes || {}) as Record<string, unknown>),
        })),
        links: span.links.map(l => ({
            context: {
                trace_id: l.context.traceId,
                span_id: l.context.spanId,
                is_remote: l.context.isRemote || false,
                trace_state: {},
            },
            attributes: sanitizeAttributes((l.attributes || {}) as Record<string, unknown>),
        })),
        start_time: span.startTime[0] + span.startTime[1] / 1e9,
        end_time: span.endTime[0] + span.endTime[1] / 1e9,
        context: {
            trace_id: span.spanContext().traceId,
            span_id: span.spanContext().spanId,
            is_remote: span.spanContext().isRemote || false,
            trace_state: {},
        },
        parent: (span as unknown as { parentSpanId?: string }).parentSpanId ? {
            trace_id: span.spanContext().traceId,
            span_id: (span as unknown as { parentSpanId?: string }).parentSpanId!,
            is_remote: false,
            trace_state: {},
        } : null,
        resource: {
            attributes: sanitizeAttributes((span.resource?.attributes || {}) as Record<string, unknown>),
            schema_url: '',
        },
    };
}

function sanitizeAttributes(attrs: Record<string, unknown>): Record<string, string | number | boolean | string[] | number[] | boolean[]> {
    const result: Record<string, string | number | boolean | string[] | number[] | boolean[]> = {};
    for (const [key, value] of Object.entries(attrs)) {
        if (value === undefined || value === null) continue;
        if (typeof value === 'function') continue;
        if (typeof value === 'object' && !Array.isArray(value)) {
            result[key] = JSON.stringify(value);
        } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || Array.isArray(value)) {
            result[key] = value as string | number | boolean | string[] | number[] | boolean[];
        }
    }
    return result;
}

/**
 * Check if AGL server is available
 */
export async function checkAGLHealth(): Promise<boolean> {
    if (!AGL_ENABLED) return false;

    try {
        const client = getAGLClient();
        const health = await client.health();
        return health.status === 'ok';
    } catch {
        return false;
    }
}
