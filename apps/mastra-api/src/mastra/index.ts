import { google } from "@ai-sdk/google";
import { Mastra } from "@mastra/core";
import {
  createAnswerRelevancyScorer,
  createBiasScorer,
  createToxicityScorer,
} from "@mastra/evals/scorers/llm";
import { OpikExporter } from "@mastra/opik";
import { LibSQLStore } from "@mastra/libsql";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { writeFile, appendFile, readFile } from "fs/promises";
import {
  commentGeneratorAgent,
  generateComments,
} from "./agents/comment-generator";
import { analyzePost, postAnalyzerAgent } from "./agents/post-analyzer";
import { assessQuality, qaAgent } from "./agents/quality-assurance";
import { makeStrategyDecision, strategyAgent } from "./agents/strategy-agent";
import type { PostMetadata, RawPost, UserPreferences } from "./types";

// Get the directory of this module file (use unique names to avoid Mastra bundler conflicts)
const _moduleFilename = fileURLToPath(import.meta.url);
const _moduleDirname = dirname(_moduleFilename);

// Use absolute path to ensure database is always in mastra-api directory
// This is critical: both mastra-api server and web app will use the SAME file
const DB_PATH = join(_moduleDirname, "..", "..", "mastra.db");

console.log("🗄️  Mastra database path:", DB_PATH);

console.log("SOME_DUMMY_VARIABLE", process.env.SOME_DUMMY_VARIABLE);
console.log(
  "OTEL_EXPORTER_OTLP_ENDPOINT",
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
);
console.log(
  "OTEL_EXPORTER_OTLP_HEADERS",
  process.env.OTEL_EXPORTER_OTLP_HEADERS,
);

// Parse OTEL headers from environment variable string to object
const parseOtelHeaders = (
  headersStr: string | undefined,
): Record<string, string> | undefined => {
  if (!headersStr) return undefined;

  try {
    // Remove quotes if present and split by comma
    const cleanHeaders = headersStr.replace(/^['"]|['"]$/g, "");
    const headers: Record<string, string> = {};

    cleanHeaders.split(",").forEach((header) => {
      const [key, value] = header.split("=");
      if (key && value) {
        headers[key.trim()] = value.trim();
      }
    });

    return headers;
  } catch (error) {
    console.error("Failed to parse OTEL headers:", error);
    return undefined;
  }
};

console.log(
  "Parsed OTEL headers:",
  parseOtelHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS),
);

// Model for scorers
const scorerModel = google(process.env.MODEL_NAME || "gemini-2.5-flash");

// 📁 Webhook events storage file
const WEBHOOK_EVENTS_FILE = join(_moduleDirname, "vapi-webhook-events.json");

// 💾 Store webhook event to file
const storeWebhookEvent = async (event: any) => {
  try {
    const timestamp = new Date().toISOString();
    const eventWithMetadata = {
      timestamp,
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event,
    };

    // Read existing events or create new array
    let events = [];
    try {
      const existingData = await readFile(WEBHOOK_EVENTS_FILE, "utf-8");
      events = JSON.parse(existingData);
      if (!Array.isArray(events)) {
        events = [];
      }
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
      events = [];
    }

    // Add new event
    events.push(eventWithMetadata);

    // Write back to file
    await writeFile(
      WEBHOOK_EVENTS_FILE,
      JSON.stringify(events, null, 2),
      "utf-8",
    );

    console.log(`💾 Webhook event stored: ${eventWithMetadata.id}`);
    return eventWithMetadata.id;
  } catch (error) {
    console.error("❌ Failed to store webhook event:", error);
    return null;
  }
};

import { registerApiRoute } from "@mastra/core/server";

export const mastra = new Mastra({
  agents: {
    postAnalyzer: postAnalyzerAgent,
    strategy: strategyAgent,
    commentGenerator: commentGeneratorAgent,
    qa: qaAgent,
  },

  // 🌐 Custom API routes for webhooks
  server: {
    apiRoutes: [
      registerApiRoute("/webhook/vapi", {
        method: "POST",
        handler: async (c) => {
          const startTime = Date.now();

          try {
            const body = await c.req.json();
            const timestamp = new Date().toISOString();

            // 📋 Enhanced logging
            console.log("\n" + "=".repeat(80));
            console.log("🔔 VAPI WEBHOOK RECEIVED");
            console.log("=".repeat(80));
            console.log(`⏰ Timestamp: ${timestamp}`);
            console.log(`📝 Event Type: ${body.type || "unknown"}`);
            console.log(`📞 Call ID: ${body.call?.id || "N/A"}`);
            console.log(`🎤 Status: ${body.call?.status || "N/A"}`);
            console.log(
              `👤 User: ${body.call?.user?.name || "N/A"} (${body.call?.user?.number || "N/A"})`,
            );

            // 💾 Store the event
            const eventId = await storeWebhookEvent(body);

            // 📊 Full event payload (truncated for readability)
            console.log("📦 Full Event Payload:");
            console.log(JSON.stringify(body, null, 2));

            // 🎯 Event-specific processing
            switch (body.type) {
              case "call.started":
                console.log("📞 Call started - Initializing conversation");
                break;
              case "call.ended":
                console.log("🏁 Call ended - Finalizing data");
                console.log(`⏱️ Duration: ${body.call?.duration || "N/A"}s`);
                console.log(`💰 Cost: $${body.call?.cost || "0.00"}`);
                break;
              case "function.started":
                console.log("⚡ Function started:", body.function?.name);
                break;
              case "function.finished":
                console.log("✅ Function completed:", body.function?.name);
                break;
              case "speech.started":
                console.log("🎤 Speech started");
                break;
              case "speech.finished":
                console.log("🔇 Speech finished");
                break;
              default:
                console.log(`🔍 Unknown event type: ${body.type}`);
            }

            console.log("=".repeat(80));
            console.log(`✅ Webhook processed in ${Date.now() - startTime}ms`);
            console.log("=".repeat(80) + "\n");

            return c.json({
              received: true,
              timestamp,
              eventId,
              processingTime: `${Date.now() - startTime}ms`,
              eventType: body.type,
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";

            console.error("\n❌ VAPI WEBHOOK ERROR");
            console.error("=".repeat(80));
            console.error(`⏰ Timestamp: ${new Date().toISOString()}`);
            console.error(`🚨 Error: ${errorMessage}`);
            console.error(
              `📝 Request headers:`,
              JSON.stringify(c.req.header(), null, 2),
            );
            console.error("=".repeat(80) + "\n");

            return c.json(
              {
                error: "Invalid JSON or processing error",
                timestamp: new Date().toISOString(),
                details: errorMessage,
              },
              400,
            );
          }
        },
      }),
    ],
  },

  // 📊 Scorers for trace evaluation in Mastra Studio
  scorers: {
    answerRelevancy: createAnswerRelevancyScorer({ model: scorerModel }),
    toxicity: createToxicityScorer({ model: scorerModel }),
    bias: createBiasScorer({ model: scorerModel }),
  },

  // telemetry: {
  //   enabled: true,
  //   serviceName: "mastra-automation",
  //   export: {
  //     type: "otlp",
  //     endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  //     headers: parseOtelHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS),
  //   },
  // },

  // 🔭 Alternative: Use OpikExporter for custom integration
  // Note: The OTEL export above is the recommended approach for Opik
  // since Opik has native OTEL support. Use OpikExporter only if you
  // need custom span handling or direct SDK access.
  //
  //
  // To use with observability config (requires Mastra 1.x+):
  observability: {
    configs: {
      opik: {
        serviceName: "mastra-automation",
        exporters: [
          new OpikExporter({
            apiKey: process.env.OPIK_API_KEY!,
            apiUrl: process.env.OTEL_EXPORTER_OTLP_ENDPOINT!,
            projectName: process.env.OPIK_PROJECT_NAME || "mastra-automation",
            workspaceName: "ent-buddy",
            realtime: true,
            logLevel: "debug",
          }),
        ],
      },
    },
  },

  // Storage for traces - using absolute path
  // This ensures both web app and mastra-api use the SAME database
  storage: new LibSQLStore({
    url: `file:${DB_PATH}`,
  }),
});

// Export agent functions for use in web app
export { analyzePost, assessQuality, generateComments, makeStrategyDecision };

// Export agent instances for custom Mastra clients
export { commentGeneratorAgent, postAnalyzerAgent, qaAgent, strategyAgent };

// Export types
export type { PostMetadata, RawPost, UserPreferences };
