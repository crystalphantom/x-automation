import { pgTable, text, timestamp, uuid, boolean, integer, real, jsonb } from 'drizzle-orm/pg-core'

export const posts = pgTable('posts', {
  id: text('id').primaryKey(),
  author: text('author').notNull(),
  content: text('content').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const generatedComments = pgTable('generated_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: text('post_id').references(() => posts.id, { onDelete: 'cascade' }),
  variantNumber: integer('variant_number').notNull(),
  commentText: text('comment_text').notNull(),
  style: text('style'),
  wordCount: integer('word_count'),
  qualityScore: real('quality_score'),
  relevanceScore: real('relevance_score'),
  safetyScore: real('safety_score'),
  engagementScore: real('engagement_score'),
  recommendation: text('recommendation'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: text('category').notNull().unique(),
  isEnabled: boolean('is_enabled').default(true),
  toneProfile: text('tone_profile').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const processingHistory = pgTable('processing_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: text('post_id').references(() => posts.id, { onDelete: 'cascade' }),
  shouldComment: boolean('should_comment'),
  confidence: real('confidence'),
  selectedTone: text('selected_tone'),
  riskLevel: text('risk_level'),
  reasoning: text('reasoning'),
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow(),
})

// Types
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
export type GeneratedComment = typeof generatedComments.$inferSelect
export type NewGeneratedComment = typeof generatedComments.$inferInsert
export type UserPreference = typeof userPreferences.$inferSelect
export type NewUserPreference = typeof userPreferences.$inferInsert
export type ProcessingHistory = typeof processingHistory.$inferSelect
export type NewProcessingHistory = typeof processingHistory.$inferInsert
