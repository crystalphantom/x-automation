/**
 * AGL Span Processor
 * 
 * Integrates with Mastra's AI Tracing to:
 * 1. Create AGL rollouts when agent spans start
 * 2. Enrich spans with rollout_id/attempt_id
 * 3. Complete rollouts when agent spans end
 */
import type { SpanProcessor, ReadableSpan, Span } from '@opentelemetry/sdk-trace-base';
import {
    createAgentRollout,
    completeAgentRollout,
    getRolloutContext,
    AGL_ENABLED,
} from './agl-integration';

// Pattern to detect agent root spans in Mastra
const AGENT_SPAN_PATTERNS = [
    /^mastra\.agent\./i,
    /^agent\./i,
    /\.generate$/i,
    /postAnalyzer/i,
    /strategyAgent/i,
    /commentGenerator/i,
    /qaAgent/i,
    /Post Analyzer/i,
    /Strategy Agent/i,
    /Comment Generator/i,
    /Quality Assurance/i,
];

export class AGLSpanProcessor implements SpanProcessor {

    onStart(span: Span, _parentContext?: unknown): void {
        if (!AGL_ENABLED) return;

        const spanName = span.name || '';
        const traceId = span.spanContext().traceId;

        // Check if this is an agent root span
        if (this.isAgentRootSpan(spanName)) {
            // Create rollout asynchronously (don't block span start)
            const agentName = this.extractAgentName(spanName);
            createAgentRollout(traceId, agentName, {
                span_name: spanName,
            }).then(context => {
                // Add rollout info as attributes after creation
                span.setAttribute('agl.rollout_id', context.rollout_id);
                span.setAttribute('agl.attempt_id', context.attempt_id);
            }).catch(err => {
                console.error('[AGL Processor] Failed to create rollout:', err);
            });
        } else {
            // For child spans, try to get existing rollout context
            const context = getRolloutContext(traceId);
            if (context) {
                span.setAttribute('agl.rollout_id', context.rollout_id);
                span.setAttribute('agl.attempt_id', context.attempt_id);
            }
        }
    }

    onEnd(span: ReadableSpan): void {
        if (!AGL_ENABLED) return;

        const spanName = span.name || '';
        const traceId = span.spanContext().traceId;

        // Complete rollout when root agent span ends
        if (this.isAgentRootSpan(spanName)) {
            const success = span.status.code !== 2; // 2 = ERROR

            // Extract output info from span
            const output = {
                span_name: spanName,
                duration_ms: this.calculateDuration(span),
                status_code: span.status.code,
                status_message: span.status.message,
                // Include any output attributes
                ...this.extractOutputAttributes(span),
            };

            completeAgentRollout(traceId, output, success).catch(err => {
                console.error('[AGL Processor] Failed to complete rollout:', err);
            });
        }
    }

    private isAgentRootSpan(name: string): boolean {
        return AGENT_SPAN_PATTERNS.some(p => p.test(name));
    }

    private extractAgentName(spanName: string): string {
        // Try to extract agent name from span name patterns
        // e.g., "mastra.agent.postAnalyzer.generate" -> "postAnalyzer"
        const patterns = [
            /agent\.(\w+)/i,
            /^(\w+Agent)/i,
            /^(\w+Analyzer)/i,
            /^(\w+Generator)/i,
            /Post Analyzer/i,
            /Strategy Agent/i,
            /Comment Generator/i,
            /Quality Assurance/i,
        ];

        for (const pattern of patterns) {
            const match = spanName.match(pattern);
            if (match) return match[1] || match[0];
        }

        // Clean up common span name formats
        if (spanName.includes('Post Analyzer')) return 'postAnalyzer';
        if (spanName.includes('Strategy')) return 'strategyAgent';
        if (spanName.includes('Comment')) return 'commentGenerator';
        if (spanName.includes('Quality') || spanName.includes('QA')) return 'qaAgent';

        return 'unknown';
    }

    private calculateDuration(span: ReadableSpan): number {
        const startMs = span.startTime[0] * 1000 + span.startTime[1] / 1e6;
        const endMs = span.endTime[0] * 1000 + span.endTime[1] / 1e6;
        return endMs - startMs;
    }

    private extractOutputAttributes(span: ReadableSpan): Record<string, unknown> {
        const output: Record<string, unknown> = {};
        const attrs = span.attributes;

        // Extract commonly useful output attributes
        const outputKeys = ['output', 'result', 'response', 'text', 'content'];
        for (const key of Object.keys(attrs)) {
            if (outputKeys.some(ok => key.toLowerCase().includes(ok))) {
                output[key] = attrs[key];
            }
        }

        return output;
    }

    forceFlush(): Promise<void> {
        return Promise.resolve();
    }

    shutdown(): Promise<void> {
        return Promise.resolve();
    }
}
