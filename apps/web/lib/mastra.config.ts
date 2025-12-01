import { Mastra } from '@mastra/core'
import { LibSQLStore } from '@mastra/libsql'
import {
  DefaultExporter,
  SensitiveDataFilter,
} from '@mastra/core/ai-tracing'
import {
  postAnalyzerAgent,
  strategyAgent,
  commentGeneratorAgent,
  qaAgent,
} from '@repo/agents'

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
