/**
 * Opik Exporter for Mastra AI Tracing
 *
 * This exporter sends observability data to Opik (Comet.com).
 * Root spans start traces in Opik.
 * MODEL_GENERATION spans become Opik spans with type 'llm',
 * TOOL_CALL spans become type 'tool', all others become type 'general'.
 */

import {
  BaseExporter,
  type BaseExporterConfig,
  AISpanType,
  type AITracingEvent,
  type AnyExportedAISpan,
  type ModelGenerationAttributes,
  type UsageStats,
} from "@mastra/core/ai-tracing";
import { Opik } from "opik";
import type { Trace, Span as OpikSpan } from "opik";

/**
 * Configuration for the Opik exporter
 */
export interface OpikExporterConfig extends BaseExporterConfig {
  /** Opik API key */
  apiKey?: string;
  /** Opik API URL (for self-hosted or cloud) */
  apiUrl?: string;
  /** Opik project name */
  projectName?: string;
  /** Opik workspace name */
  workspaceName?: string;
  /** Enable realtime mode - flushes after each event for immediate visibility */
  realtime?: boolean;
}

type TraceData = {
  trace: Trace;
  spans: Map<string, OpikSpan>;
  activeSpans: Set<string>;
  rootSpanId?: string;
};

/**
 * Token usage format compatible with Opik.
 */
export interface OpikUsageMetrics {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

/**
 * Formats UsageStats to Opik's expected format.
 */
export function formatUsageMetrics(usage?: UsageStats): OpikUsageMetrics {
  if (!usage) return {};

  const metrics: OpikUsageMetrics = {};

  // Support both naming conventions
  const inputTokens = usage.inputTokens ?? usage.promptTokens;
  const outputTokens = usage.outputTokens ?? usage.completionTokens;

  if (inputTokens !== undefined) {
    metrics.prompt_tokens = inputTokens;
  }

  if (outputTokens !== undefined) {
    metrics.completion_tokens = outputTokens;
  }

  if (
    metrics.prompt_tokens !== undefined &&
    metrics.completion_tokens !== undefined
  ) {
    metrics.total_tokens = metrics.prompt_tokens + metrics.completion_tokens;
  } else if (usage.totalTokens !== undefined) {
    metrics.total_tokens = usage.totalTokens;
  }

  return metrics;
}

/**
 * Maps Mastra span types to Opik span types
 */
function mapSpanType(mastraType: AISpanType): "general" | "llm" | "tool" {
  switch (mastraType) {
    case AISpanType.MODEL_GENERATION:
    case AISpanType.MODEL_STEP:
      return "llm";
    case AISpanType.TOOL_CALL:
    case AISpanType.MCP_TOOL_CALL:
      return "tool";
    default:
      return "general";
  }
}

/**
 * Opik Exporter for Mastra AI Tracing
 *
 * Exports traces and spans to Opik platform for monitoring and debugging
 * LLM applications.
 *
 * @example
 * ```typescript
 * import { OpikExporter } from '@mastra/opik';
 *
 * const mastra = new Mastra({
 *   observability: {
 *     configs: {
 *       opik: {
 *         serviceName: 'my-service',
 *         exporters: [
 *           new OpikExporter({
 *             apiKey: process.env.OPIK_API_KEY,
 *             projectName: 'my-project',
 *           }),
 *         ],
 *       },
 *     },
 *   },
 * });
 * ```
 */
export class OpikExporter extends BaseExporter {
  name = "opik";
  private client: Opik | null = null;
  private realtime: boolean;
  private traceMap = new Map<string, TraceData>();

  constructor(config: OpikExporterConfig) {
    super(config);

    this.realtime = config.realtime ?? false;

    if (!config.apiKey) {
      this.setDisabled(`Missing required apiKey`);
      return;
    }

    try {
      this.client = new Opik({
        apiKey: config.apiKey,
        apiUrl: config.apiUrl,
        projectName: config.projectName,
        workspaceName: config.workspaceName,
      });
    } catch (error) {
      this.setDisabled(`Failed to initialize Opik client: ${error}`);
    }
  }

  protected async _exportEvent(event: AITracingEvent): Promise<void> {
    if (!this.client) return;

    const span = event.exportedSpan;

    switch (event.type) {
      case "span_started":
        await this.handleSpanStarted(span);
        break;
      case "span_updated":
        await this.handleSpanUpdateOrEnd(span, false);
        break;
      case "span_ended":
        await this.handleSpanUpdateOrEnd(span, true);
        break;
    }

    // Flush immediately in realtime mode for instant visibility
    if (this.realtime && this.client) {
      await this.client.flush();
    }
  }

  private async handleSpanStarted(span: AnyExportedAISpan): Promise<void> {
    if (span.isRootSpan) {
      this.initTrace(span);
    }

    const traceData = this.getTraceData(span, "handleSpanStarted");
    if (!traceData) return;

    // For non-root spans, create an Opik span
    if (!span.isRootSpan) {
      const opikParent = this.getOpikParent(traceData, span);
      if (!opikParent) return;

      const payload = this.buildSpanPayload(span, true);
      const opikSpan = opikParent.span(payload);

      traceData.spans.set(span.id, opikSpan);
      traceData.activeSpans.add(span.id);
    }
  }

  private async handleSpanUpdateOrEnd(
    span: AnyExportedAISpan,
    isEnd: boolean
  ): Promise<void> {
    const traceData = this.getTraceData(
      span,
      isEnd ? "handleSpanEnd" : "handleSpanUpdate"
    );
    if (!traceData) return;

    if (span.isRootSpan) {
      // Update or end the root trace
      const updatePayload = this.buildTraceUpdatePayload(span);
      traceData.trace.update(updatePayload);

      if (isEnd) {
        traceData.trace.end();
        traceData.activeSpans.delete(span.id);

        // Clean up when all spans are done
        if (traceData.activeSpans.size === 0) {
          this.traceMap.delete(span.traceId);
        }
      }
      return;
    }

    const opikSpan = traceData.spans.get(span.id);
    if (!opikSpan) {
      this.logger.warn("No Opik span found for span update/end", {
        traceId: span.traceId,
        spanId: span.id,
        spanName: span.name,
      });
      return;
    }

    // Update span with new data
    const updatePayload = this.buildSpanUpdatePayload(span);
    opikSpan.update(updatePayload);

    if (isEnd) {
      opikSpan.end();
      traceData.activeSpans.delete(span.id);

      // Clean up when all spans are done
      if (traceData.activeSpans.size === 0) {
        this.traceMap.delete(span.traceId);
      }
    }
  }

  private initTrace(span: AnyExportedAISpan): void {
    if (this.traceMap.has(span.traceId)) {
      this.logger.debug("Reusing existing trace", { traceId: span.traceId });
      return;
    }

    if (!this.client) return;

    const payload = this.buildTracePayload(span);
    const trace = this.client.trace(payload);

    this.traceMap.set(span.traceId, {
      trace,
      spans: new Map(),
      activeSpans: new Set([span.id]),
      rootSpanId: span.id,
    });
  }

  private getTraceData(
    span: AnyExportedAISpan,
    method: string
  ): TraceData | undefined {
    const traceData = this.traceMap.get(span.traceId);
    if (!traceData) {
      this.logger.warn(`No trace data found for span in ${method}`, {
        traceId: span.traceId,
        spanId: span.id,
        spanName: span.name,
      });
    }
    return traceData;
  }

  private getOpikParent(
    traceData: TraceData,
    span: AnyExportedAISpan
  ): Trace | OpikSpan | undefined {
    const parentId = span.parentSpanId;
    if (!parentId) {
      return traceData.trace;
    }

    const parentSpan = traceData.spans.get(parentId);
    if (parentSpan) {
      return parentSpan;
    }

    // If parent is the root span, return the trace
    if (parentId === traceData.rootSpanId) {
      return traceData.trace;
    }

    this.logger.warn("No parent found for span", {
      traceId: span.traceId,
      spanId: span.id,
      parentSpanId: parentId,
    });
    return undefined;
  }

  private buildTracePayload(span: AnyExportedAISpan): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      name: span.name,
    };

    if (span.input) payload.input = span.input;
    if (span.output) payload.output = span.output;
    if (span.metadata) payload.metadata = span.metadata;

    return payload;
  }

  private buildTraceUpdatePayload(
    span: AnyExportedAISpan
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (span.output !== undefined) payload.output = span.output;
    if (span.metadata) payload.metadata = span.metadata;

    return payload;
  }

  private buildSpanPayload(
    span: AnyExportedAISpan,
    isCreate: boolean
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (isCreate) {
      payload.name = span.name;
      payload.type = mapSpanType(span.type);
      if (span.input !== undefined) payload.input = span.input;
    }

    if (span.output !== undefined) payload.output = span.output;

    const attributes = span.attributes;

    // For MODEL_GENERATION spans, extract model and usage info
    if (
      span.type === AISpanType.MODEL_GENERATION ||
      span.type === AISpanType.MODEL_STEP
    ) {
      const modelAttr = attributes as ModelGenerationAttributes | undefined;
      if (modelAttr) {
        if (modelAttr.model !== undefined) {
          payload.model = modelAttr.model;
        }

        if (modelAttr.usage !== undefined) {
          payload.usage = formatUsageMetrics(modelAttr.usage);
        }

        if (modelAttr.parameters !== undefined) {
          payload.metadata = {
            ...((payload.metadata as Record<string, unknown>) ?? {}),
            parameters: modelAttr.parameters,
          };
        }
      }
    }

    // Merge remaining metadata
    if (span.metadata) {
      payload.metadata = {
        ...((payload.metadata as Record<string, unknown>) ?? {}),
        ...span.metadata,
      };
    }

    // Add error info if present
    if (span.errorInfo) {
      payload.metadata = {
        ...((payload.metadata as Record<string, unknown>) ?? {}),
        error: true,
        errorMessage: span.errorInfo.message,
      };
    }

    return payload;
  }

  private buildSpanUpdatePayload(
    span: AnyExportedAISpan
  ): Record<string, unknown> {
    return this.buildSpanPayload(span, false);
  }

  /**
   * Add a score/feedback to a trace
   */
  override async addScoreToTrace({
    traceId,
    spanId,
    score,
    reason,
    scorerName,
  }: {
    traceId: string;
    spanId?: string;
    score: number;
    reason?: string;
    scorerName: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.client || this.isDisabled) return;

    const traceData = this.traceMap.get(traceId);
    if (!traceData) {
      this.logger.warn("Cannot add score - trace not found", { traceId });
      return;
    }

    try {
      if (spanId) {
        const opikSpan = traceData.spans.get(spanId);
        if (opikSpan) {
          opikSpan.score({
            name: scorerName,
            value: score,
            reason: reason,
          });
        }
      } else {
        traceData.trace.score({
          name: scorerName,
          value: score,
          reason: reason,
        });
      }
    } catch (error) {
      this.logger.error("Error adding score to trace", {
        error,
        traceId,
        spanId,
        scorerName,
      });
    }
  }

  /**
   * Flush all pending data to Opik
   */
  async flush(): Promise<void> {
    if (this.client) {
      await this.client.flush();
    }
  }

  /**
   * Shutdown the exporter and flush all pending data
   */
  override async shutdown(): Promise<void> {
    await this.flush();
    this.traceMap.clear();
    await super.shutdown();
  }
}

// Re-export types from Mastra for convenience
export { AISpanType } from "@mastra/core/ai-tracing";
export type { UsageStats } from "@mastra/core/ai-tracing";
