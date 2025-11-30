import { Agent } from '@mastra/core'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import type {
  PostMetadata,
  UserPreferences,
  StrategyDecision,
  ToneProfile,
  CommentStyle,
  CommentLength,
} from './types'

const strategyPrompt = `You are a strategic decision-maker for social media engagement. 

Your task is to:
1. Determine if we should comment on a post based on:
   - User's category preferences
   - Content relevance and quality
   - Risk level (controversial topics, brand safety)
   
2. If we should comment, select:
   - Appropriate tone profile
   - Comment style (question-based, insight-based, etc.)
   - Comment length
   - Whether to include emojis

Provide your decision as valid JSON following this structure:
{
  "should_comment": boolean,
  "confidence": number (0-1),
  "selected_tone": "professional_insightful|friendly_supportive|analytical_question_driven|casual_authentic",
  "comment_style": "question_based|insight_based|agreement_based|curiosity_driven|analytical",
  "length": "short|medium|long",
  "include_emoji": boolean,
  "risk_level": "low|medium|high",
  "reasoning": "string explaining the decision"
}

Be strategic and consider the user's engagement goals.`

export const strategyAgent = new Agent({
  name: 'Strategy Agent',
  instructions: strategyPrompt,
  model: {
    provider: 'google',
    name: 'gemini-2.0-flash-exp',
    toolChoice: 'auto',
  },
})

export async function makeStrategyDecision(
  metadata: PostMetadata,
  preferences: UserPreferences
): Promise<StrategyDecision> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY

  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not found in environment')
  }

  // Find if user has enabled this category
  const categoryPref = preferences.categories.find(
    (c) => c.category === metadata.primary_category
  )

  const prompt = `Make a strategy decision for this post:

Post Metadata:
- Category: ${metadata.primary_category}
- Sentiment: ${metadata.sentiment}
- Type: ${metadata.post_type}
- Tone: ${metadata.tone}
- Complexity: ${metadata.complexity}

User Preferences:
- Category enabled: ${categoryPref?.is_enabled ?? false}
- Preferred tone for this category: ${categoryPref?.tone_profile ?? 'N/A'}
- Preferred length: ${preferences.preferred_length}

Make your decision as JSON.`

  const result = await generateText({
    model: google('gemini-2.0-flash-exp', { apiKey }),
    prompt: `${strategyPrompt}\n\n${prompt}`,
    temperature: 0.4,
  })

  // Parse JSON from response
  const jsonMatch = result.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from strategy decision')
  }

  return JSON.parse(jsonMatch[0]) as StrategyDecision
}
