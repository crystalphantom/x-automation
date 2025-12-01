
import { Mastra } from '@mastra/core'
import { LibSQLStore } from '@mastra/libsql'
import { postAnalyzerAgent } from './agents/post-analyzer'
import { strategyAgent } from './agents/strategy-agent'
import { commentGeneratorAgent } from './agents/comment-generator'
import { qaAgent } from './agents/quality-assurance'

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
    url: 'file:./mastra.db',
  }),
})