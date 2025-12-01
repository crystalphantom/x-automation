import { Agent } from '@mastra/core'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import type { RawPost, PostMetadata } from './types'

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

export const postAnalyzerAgent = new Agent({
  name: 'Post Analyzer',
  instructions: analyzerPrompt,
  model: google(process.env.MODEL_NAME || 'gemini-2.5-flash'),
})

export async function analyzePost(post: RawPost): Promise<PostMetadata> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY

  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not found in environment')
  }

  const prompt = `Analyze this post:

Author: ${post.author}
Content: ${post.content}
Posted at: ${post.timestamp}

Provide metadata as JSON.`

  const result = await generateText({
    model: google(process.env.MODEL_NAME || 'gemini-2.5-flash'),
    prompt: `${analyzerPrompt}\n\n${prompt}`,
    temperature: 0.3,
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
