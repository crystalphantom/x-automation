import { Agent } from '@mastra/core'
import { google } from '@ai-sdk/google'
import {
  createAnswerRelevancyScorer,
} from '@mastra/evals/scorers/llm'
import type { GeneratedComments, QAAssessment } from '../types'

const qaPrompt = `You are a quality assurance expert for social media comments. Your task is to evaluate generated comments for:

1. **Quality**: Grammar, clarity, professionalism
2. **Relevance**: How well it relates to the original post
3. **Safety**: No offensive content, controversial statements, or brand risks
4. **Engagement Potential**: Likelihood of starting meaningful conversation

Score each variant from 0.0 to 1.0 on each dimension.

Provide your assessment as valid JSON following this structure:
{
  "variant_scores": [
    {
      "version": number,
      "quality_score": number,
      "relevance_score": number,
      "safety_score": number,
      "engagement_potential": number,
      "recommendation": "highly_recommended|recommended|acceptable|not_recommended",
      "issues": ["string array of any concerns"]
    }
  ],
  "recommended_variant": number,
  "overall_assessment": "safe_to_post|needs_review|do_not_post"
}

Be thorough and objective.`

const scorerModel = google(process.env.MODEL_NAME || 'gemini-2.5-flash')

export const qaAgent = new Agent({
  name: 'Quality Assurance Agent',
  instructions: qaPrompt,
  model: google(process.env.MODEL_NAME || 'gemini-2.5-flash'),
  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: scorerModel }),
      sampling: { type: 'ratio', rate: 1 },
    },
  },
})

export async function assessQuality(
  originalPost: string,
  comments: GeneratedComments
): Promise<QAAssessment> {
  const prompt = `Evaluate these comment variants for the original post:

Original Post:
${originalPost}

Comment Variants:
${comments.variants.map((v) => `Version ${v.version}: "${v.comment}"`).join('\n')}

Provide detailed quality assessment as JSON.`

  // Use agent's generate method for automatic tracing
  const result = await qaAgent.generate(prompt, {
    modelSettings: {
      temperature: 0.2,
    },
  })

  // Parse JSON from response
  const jsonMatch = result.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from QA assessment')
  }

  return JSON.parse(jsonMatch[0]) as QAAssessment
}
