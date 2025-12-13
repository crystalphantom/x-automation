import { Mastra } from "@mastra/core";
import { LibSQLStore } from "@mastra/libsql";
import { google } from "@ai-sdk/google";
import {
  createAnswerRelevancyScorer,
  createToxicityScorer,
  createBiasScorer,
} from "@mastra/evals/scorers/llm";
import { postAnalyzerAgent, analyzePost } from "./agents/post-analyzer";
import { strategyAgent, makeStrategyDecision } from "./agents/strategy-agent";
import {
  commentGeneratorAgent,
  generateComments,
} from "./agents/comment-generator";
import { qaAgent, assessQuality } from "./agents/quality-assurance";
import type { RawPost, UserPreferences, PostMetadata } from "./types";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// AGL Integration
import { AGL_ENABLED, checkAGLHealth } from "../agl/agl-integration";
import { wrapAgentWithAGL } from "../agl/agl-agent-wrapper";

// Get the directory of this module file (use unique names to avoid Mastra bundler conflicts)
const _moduleFilename = fileURLToPath(import.meta.url);
const _moduleDirname = dirname(_moduleFilename);

// Use absolute path to ensure database is always in mastra-api directory
// This is critical: both mastra-api server and web app will use the SAME file
const DB_PATH = join(_moduleDirname, "..", "..", "mastra.db");

console.log("🗄️  Mastra database path:", DB_PATH);

// Initialize AGL status logging
if (AGL_ENABLED) {
  console.log("🚀 AGL integration enabled");
  console.log(`   Server: ${process.env.AGL_SERVER_URL || "http://localhost:4747"}`);

  // Check health asynchronously
  checkAGLHealth().then(healthy => {
    if (healthy) {
      console.log("   Status: ✅ Connected to AGL server");
    } else {
      console.warn("   Status: ⚠️ AGL server not reachable");
    }
  });

  // Wrap agents with AGL integration
  wrapAgentWithAGL(postAnalyzerAgent, "postAnalyzer");
  wrapAgentWithAGL(strategyAgent, "strategyAgent");
  wrapAgentWithAGL(commentGeneratorAgent, "commentGenerator");
  wrapAgentWithAGL(qaAgent, "qaAgent");
  console.log("   Agents: ✅ Wrapped with AGL integration");
}

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

  // Enable AI Tracing - AGL integration hooks in via agent wrapper
  observability: {
    default: {
      enabled: true, // Enables DefaultExporter with 'always' sampling
    },
  },

  // Storage for traces - using absolute path
  // This ensures both web app and mastra-api use the SAME database
  storage: new LibSQLStore({
    url: `file:${DB_PATH}`,
  }),
});

// Export agent functions for use in web app
export { analyzePost, makeStrategyDecision, generateComments, assessQuality };

// Export agent instances for custom Mastra clients
export { postAnalyzerAgent, strategyAgent, commentGeneratorAgent, qaAgent };

// Export types
export type { RawPost, UserPreferences, PostMetadata };

