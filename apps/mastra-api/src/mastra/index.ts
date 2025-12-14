import { google } from "@ai-sdk/google";
import { Mastra } from "@mastra/core";
import {
  createAnswerRelevancyScorer,
  createBiasScorer,
  createToxicityScorer,
} from "@mastra/evals/scorers/llm";
import { LangfuseExporter } from "@mastra/langfuse";
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

  telemetry: {
    enabled: true,
  },

  // Enable AI Tracing with Langfuse integration

  // AI Tracing Configuration
  observability: {
    default: { enabled: true }, // Enable by default
    
    configs: {
      langfuse: {
        serviceName: "my-mastra-service", // Your service name
        // Export to Langfuse
        exporters: [
          new LangfuseExporter({
            publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
            secretKey: process.env.LANGFUSE_SECRET_KEY!,
            baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com",
            realtime: true, // Send traces in real-time
            logLevel: "debug", // For debugging
            options: {
              environment: process.env.NODE_ENV || "development",
            },
          }),
        ],
      },
    },
    
    // (Optional) Dynamic config selector
    configSelector: (context, availableConfigs) => {
      // Use Langfuse tracing by default
      return "langfuse";
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

