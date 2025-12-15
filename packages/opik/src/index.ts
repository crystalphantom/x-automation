/**
 * Opik Observability Provider for Mastra
 *
 * This package provides Opik-specific observability features for Mastra applications.
 * Includes tracing support with automatic span type mapping and token usage tracking.
 */

// Tracing
export {
  OpikExporter,
  formatUsageMetrics,
  AISpanType,
  type OpikExporterConfig,
  type OpikUsageMetrics,
  type UsageStats,
} from "./tracing.js";
