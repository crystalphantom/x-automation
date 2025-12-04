/**
 * OpenTelemetry Instrumentation for AGL Integration
 * 
 * This file sets up the custom SpanExporter that sends traces to AGL.
 * Import this BEFORE importing any Mastra code.
 * 
 * Usage:
 * 1. Import this at the very top of your entry point
 * 2. Set AGL_ENABLED=true environment variable
 * 
 * Example:
 *   import './agl/instrumentation';  // Must be first!
 *   import { mastra } from './mastra';
 */

import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { AGLSpanExporter } from "./otel-exporter";

const AGL_ENABLED = process.env.AGL_ENABLED === "true";

let aglExporter: AGLSpanExporter | null = null;
let provider: NodeTracerProvider | null = null;

if (AGL_ENABLED) {
    console.log("🚀 Initializing AGL OTEL instrumentation...");

    // Create resource with service name
    const resource = resourceFromAttributes({
        [ATTR_SERVICE_NAME]: "mastra-x-automation",
    });

    // Create our custom AGL exporter
    aglExporter = new AGLSpanExporter();

    // Create a TracerProvider with the resource and span processor
    provider = new NodeTracerProvider({
        resource,
        // Pass span processors in config for newer OTEL versions
        spanProcessors: [new SimpleSpanProcessor(aglExporter)],
    });

    // Register the provider globally
    provider.register();

    console.log("✅ AGL OTEL instrumentation active - traces will be sent to AGL server");

    // Handle shutdown gracefully
    process.on("SIGTERM", async () => {
        if (aglExporter) await aglExporter.shutdown();
        if (provider) await provider.shutdown();
    });

    process.on("SIGINT", async () => {
        if (aglExporter) await aglExporter.shutdown();
        if (provider) await provider.shutdown();
        process.exit(0);
    });
} else {
    console.log("ℹ️  AGL OTEL instrumentation disabled (set AGL_ENABLED=true to enable)");
}

export { AGL_ENABLED };
