import { Agent } from '@mastra/core'
import { google } from '@ai-sdk/google'
import {
  createAnswerRelevancyScorer,
} from '@mastra/evals/scorers/llm'
import type { RawPost, PostMetadata } from '../types'

const analyzerPrompt = `You are an expert at analyzing Twitter/X posts. Your task is to deeply analyze the given post and extract structured metadata.

Analyze the following aspects:
1. **Primary Category**: Choose ONE from: technology, startups, product_management, general
2. **Sentiment**: positive, negative, or neutral
3. **Post Type**: question, opinion, news, meme, promotional, or discussion
4. **Tone**: Describe the tone (professional, casual, humorous, serious, etc.)
5. **Complexity**: simple, moderate, or complex

Provide your analysis as valid JSON following this exact structure:
{
  "post_id": "string",
  "primary_category": "technology|startups|product_management|general",
  "sentiment": "positive|negative|neutral",
  "post_type": "question|opinion|news|meme|promotional|discussion",
  "tone": "string describing the tone",
  "complexity": "simple|moderate|complex"
}

Be precise and analytical.`

const scorerModel = google(process.env.MODEL_NAME || 'gemini-2.5-flash')

export const postAnalyzerAgent = new Agent({
  name: 'Post Analyzer',
  instructions: analyzerPrompt,
  model: google(process.env.MODEL_NAME || 'gemini-2.5-flash'),
  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: scorerModel }),
      sampling: { type: 'ratio', rate: 1 },
    },
  },
})

export async function analyzePost(post: RawPost): Promise<PostMetadata> {
  const prompt = `Analyze this post:

Author: ${post.author}
Content: ${post.content}
Posted at: ${post.timestamp}

Provide metadata as JSON.`

  // Use agent's generate method for automatic tracing
  const result = await postAnalyzerAgent.generate(prompt, {
    modelSettings: {
      temperature: 0.3,
    },
  })

  // Parse JSON from response
  const jsonMatch = result.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from analysis')
  }

  const metadata = JSON.parse(jsonMatch[0]) as PostMetadata

  return {
    ...metadata,
    post_id: post.id,
  }
}
