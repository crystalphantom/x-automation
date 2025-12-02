import { Mastra } from "@mastra/core";
import { LibSQLStore } from "@mastra/libsql";
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

// Get the directory of this module file (use unique names to avoid Mastra bundler conflicts)
const _moduleFilename = fileURLToPath(import.meta.url);
const _moduleDirname = dirname(_moduleFilename);

// Use absolute path to ensure database is always in mastra-api directory
// This is critical: both mastra-api server and web app will use the SAME file
const DB_PATH = join(_moduleDirname, "..", "..", "mastra.db");

console.log("🗄️  Mastra database path:", DB_PATH);

export const mastra = new Mastra({
  agents: {
    postAnalyzer: postAnalyzerAgent,
    strategy: strategyAgent,
    commentGenerator: commentGeneratorAgent,
    qa: qaAgent,
  },

  // Enable AI Tracing with recommended configuration
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
