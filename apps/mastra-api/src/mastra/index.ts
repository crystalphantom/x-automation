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
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT
);
console.log(
  "OTEL_EXPORTER_OTLP_HEADERS",
  process.env.OTEL_EXPORTER_OTLP_HEADERS
);

// Parse OTEL headers from environment variable string to object
const parseOtelHeaders = (
  headersStr: string | undefined
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
  parseOtelHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS)
);

// Model for scorers
const scorerModel = google(process.env.MODEL_NAME || "gemini-2.5-flash");

export const mastra = new Mastra({
  agents: {
    postAnalyzer: postAnalyzerAgent,
    strategy: strategyAgent,
    commentGenerator: commentGeneratorAgent,
    qa: qaAgent,
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
