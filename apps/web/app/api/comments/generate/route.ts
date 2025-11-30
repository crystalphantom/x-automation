import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'
import { posts, generatedComments, userPreferences as userPrefsTable, processingHistory } from '@/db/schema'
import {
  analyzePost,
  makeStrategyDecision,
  generateComments,
  assessQuality,
} from '@repo/agents'
import type { RawPost, UserPreferences, PostMetadata } from '@repo/agents'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const { postId } = await request.json()

    if (!postId) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 })
    }

    // Fetch post using Drizzle
    const [post] = await db.select().from(posts).where(eq(posts.id, postId))

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Fetch user preferences
    const prefs = await db.select().from(userPrefsTable)

    // Transform preferences to expected format
    const userPreferences: UserPreferences = {
      categories: prefs.map((p) => ({
        category: p.category as any,
        is_enabled: p.isEnabled ?? true,
        tone_profile: p.toneProfile as any,
      })),
      preferred_length: 'medium',
      auto_post_threshold: 0.9,
      max_comments_per_day: 10,
    }

    // Step 1: Analyze post (if not already analyzed)
    let metadata: PostMetadata
    if (post.metadata) {
      metadata = post.metadata as PostMetadata
    } else {
      const rawPost: RawPost = {
        id: post.id,
        author: post.author,
        content: post.content,
        timestamp: post.timestamp.toISOString(),
      }
      metadata = await analyzePost(rawPost)

      // Update post with metadata
      await db.update(posts).set({ metadata }).where(eq(posts.id, postId))
    }

    // Step 2: Make strategy decision
    const strategy = await makeStrategyDecision(metadata, userPreferences)

    // Store processing history
    await db.insert(processingHistory).values({
      postId,
      shouldComment: strategy.should_comment,
      confidence: strategy.confidence,
      selectedTone: strategy.selected_tone,
      riskLevel: strategy.risk_level,
      reasoning: strategy.reasoning,
    })

    // If should not comment, return early
    if (!strategy.should_comment) {
      return NextResponse.json({
        should_comment: false,
        reasoning: strategy.reasoning,
      })
    }

    // Step 3: Generate comments
    const rawPost: RawPost = {
      id: post.id,
      author: post.author,
      content: post.content,
      timestamp: post.timestamp.toISOString(),
    }
    const comments = await generateComments(rawPost, strategy)

    // Step 4: Quality assurance
    const qaAssessment = await assessQuality(post.content, comments)

    // Step 5: Store generated comments
    const commentInserts = comments.variants.map((variant, idx) => {
      const score = qaAssessment.variant_scores[idx]
      return {
        postId,
        variantNumber: variant.version,
        commentText: variant.comment,
        style: variant.style,
        wordCount: variant.length,
        qualityScore: score?.quality_score,
        relevanceScore: score?.relevance_score,
        safetyScore: score?.safety_score,
        engagementScore: score?.engagement_potential,
        recommendation: score?.recommendation,
      }
    })

    await db.insert(generatedComments).values(commentInserts)

    return NextResponse.json({
      metadata,
      strategy,
      comments: comments.variants,
      quality_assessment: qaAssessment,
    })
  } catch (error) {
    console.error('Comment generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate comments', details: String(error) },
      { status: 500 }
    )
  }
}
