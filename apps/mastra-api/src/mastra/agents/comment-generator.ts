import { Agent } from '@mastra/core'
import { google } from '@ai-sdk/google'
import type {
  RawPost,
  StrategyDecision,
  GeneratedComments,
} from '../types'

const generatorPrompt = `You are an expert social media comment writer. Your task is to generate engaging, contextually relevant comments for Twitter/X posts.

Guidelines:
- Be authentic and add value to the conversation
- Match the specified tone and style
- Stay within the specified length range
- Reference specific points from the original post
- Avoid generic responses like "Great post!"
- Make comments that encourage further discussion

Generate 3 different comment variants with different approaches.

Provide your comments as valid JSON following this structure:
{
  "variants": [
    {
      "version": 1,
      "comment": "string",
      "style": "string",
      "length": number (word count)
    }
  ]
}

Be creative and engaging.`

export const commentGeneratorAgent = new Agent({
  name: 'Comment Generator',
  instructions: generatorPrompt,
  model: google(process.env.MODEL_NAME || 'gemini-2.5-flash'),
})

export async function generateComments(
  post: RawPost,
  strategy: StrategyDecision
): Promise<GeneratedComments> {
  const lengthGuidance = {
    short: '10-15 words',
    medium: '20-35 words',
    long: '40-60 words',
  }

  const prompt = `Generate 3 comment variants for this post:

Original Post:
Author: ${post.author}
Content: ${post.content}

Strategy Parameters:
- Tone: ${strategy.selected_tone}
- Style: ${strategy.comment_style}
- Length: ${strategy.length} (${lengthGuidance[strategy.length]})
- Include emoji: ${strategy.include_emoji}

Generate creative, engaging comments as JSON.`

  // Use agent's generate method for automatic tracing
  const result = await commentGeneratorAgent.generate(prompt, {
    modelSettings: {
      temperature: 0.8,
    },
  })

  // Parse JSON from response
  const jsonMatch = result.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from generated comments')
  }

  return JSON.parse(jsonMatch[0]) as GeneratedComments
}
