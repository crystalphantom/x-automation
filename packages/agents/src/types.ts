import { z } from 'zod'

// Post categories
export const PostCategory = z.enum([
  'technology',
  'startups',
  'product_management',
  'general',
])
export type PostCategory = z.infer<typeof PostCategory>

// Tone profiles
export const ToneProfile = z.enum([
  'professional_insightful',
  'friendly_supportive',
  'analytical_question_driven',
  'casual_authentic',
])
export type ToneProfile = z.infer<typeof ToneProfile>

// Post sentiment
export const PostSentiment = z.enum(['positive', 'negative', 'neutral'])
export type PostSentiment = z.infer<typeof PostSentiment>

// Post type
export const PostType = z.enum([
  'question',
  'opinion',
  'news',
  'meme',
  'promotional',
  'discussion',
])
export type PostType = z.infer<typeof PostType>

// Comment style
export const CommentStyle = z.enum([
  'question_based',
  'insight_based',
  'agreement_based',
  'curiosity_driven',
  'analytical',
])
export type CommentStyle = z.infer<typeof CommentStyle>

// Comment length
export const CommentLength = z.enum(['short', 'medium', 'long'])
export type CommentLength = z.infer<typeof CommentLength>

// Raw post from user upload
export const RawPost = z.object({
  id: z.string(),
  author: z.string(),
  content: z.string(),
  timestamp: z.string().datetime(),
})
export type RawPost = z.infer<typeof RawPost>

// Post metadata from analyzer
export const PostMetadata = z.object({
  post_id: z.string(),
  primary_category: PostCategory,
  secondary_categories: z.array(z.string()).optional(),
  sentiment: PostSentiment,
  post_type: PostType,
  author_type: z.string().optional(),
  engagement_level: z.enum(['low', 'medium', 'high']).optional(),
  tone: z.string(),
  entities: z.array(z.string()).optional(),
  complexity: z.enum(['simple', 'moderate', 'complex']),
  flags: z.array(z.string()).optional(),
})
export type PostMetadata = z.infer<typeof PostMetadata>

// Strategy decision
export const StrategyDecision = z.object({
  should_comment: z.boolean(),
  confidence: z.number().min(0).max(1),
  selected_tone: ToneProfile,
  comment_style: CommentStyle,
  length: CommentLength,
  include_emoji: z.boolean(),
  risk_level: z.enum(['low', 'medium', 'high']),
  reasoning: z.string(),
})
export type StrategyDecision = z.infer<typeof StrategyDecision>

// Comment variant
export const CommentVariant = z.object({
  version: z.number(),
  comment: z.string(),
  style: CommentStyle,
  length: z.number(),
})
export type CommentVariant = z.infer<typeof CommentVariant>

// Generated comments
export const GeneratedComments = z.object({
  variants: z.array(CommentVariant),
})
export type GeneratedComments = z.infer<typeof GeneratedComments>

// Quality scores
export const QualityScore = z.object({
  version: z.number(),
  quality_score: z.number().min(0).max(1),
  relevance_score: z.number().min(0).max(1),
  safety_score: z.number().min(0).max(1),
  engagement_potential: z.number().min(0).max(1),
  recommendation: z.enum([
    'highly_recommended',
    'recommended',
    'acceptable',
    'not_recommended',
  ]),
  issues: z.array(z.string()),
})
export type QualityScore = z.infer<typeof QualityScore>

// QA assessment
export const QAAssessment = z.object({
  variant_scores: z.array(QualityScore),
  recommended_variant: z.number(),
  overall_assessment: z.enum(['safe_to_post', 'needs_review', 'do_not_post']),
})
export type QAAssessment = z.infer<typeof QAAssessment>

// User preferences
export const UserPreferences = z.object({
  categories: z.array(
    z.object({
      category: PostCategory,
      is_enabled: z.boolean(),
      tone_profile: ToneProfile,
    })
  ),
  preferred_length: CommentLength,
  auto_post_threshold: z.number().min(0).max(1).default(0.9),
  max_comments_per_day: z.number().default(10),
})
export type UserPreferences = z.infer<typeof UserPreferences>
