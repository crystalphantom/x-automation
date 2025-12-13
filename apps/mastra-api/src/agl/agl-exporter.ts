/**
 * AGL Span Exporter
 * 
 * Exports spans to AGL server using the SDK's addSpan method.
 * This is an alternative to OTLP that uses AGL's native API.
 */
import type { SpanExporter, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import type { ExportResult } from '@opentelemetry/core';
import { ExportResultCode } from '@opentelemetry/core';
import {
    getAGLClient,
    getRolloutContext,
    convertToAGLSpan,
    AGL_ENABLED,
} from './agl-integration';

export class AGLSpanExporter implements SpanExporter {

    async export(
        spans: ReadableSpan[],
        resultCallback: (result: ExportResult) => void
    ): Promise<void> {
        if (!AGL_ENABLED) {
            resultCallback({ code: ExportResultCode.SUCCESS });
            return;
        }

        const client = getAGLClient();

        try {
            for (const span of spans) {
                const traceId = span.spanContext().traceId;
                const context = getRolloutContext(traceId);

                if (!context || context.rollout_id.startsWith('temp-')) {
                    continue; // Skip spans without valid rollout context
                }

                const aglSpan = convertToAGLSpan(span, context);

                try {
                    await client.addSpan(aglSpan);
                } catch (error) {
                    console.debug(`[AGL Exporter] Failed to export span: ${span.name}`, error);
                }
            }

            resultCallback({ code: ExportResultCode.SUCCESS });
        } catch (error) {
            console.error('[AGL Exporter] Export failed:', error);
            resultCallback({
                code: ExportResultCode.FAILED,
                error: error as Error,
            });
        }
    }

    async shutdown(): Promise<void> {
        // Nothing to clean up
    }

    async forceFlush(): Promise<void> {
        // No batching, nothing to flush
    }
}
