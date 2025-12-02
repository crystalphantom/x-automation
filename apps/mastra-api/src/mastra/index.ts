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

  // Storage for traces (separate from application data)
  storage: new LibSQLStore({
    url: "file:mastra.db",
  }),
});

// Export agent functions for use in web app
export { analyzePost, makeStrategyDecision, generateComments, assessQuality };

// Export types
export type { RawPost, UserPreferences, PostMetadata };
