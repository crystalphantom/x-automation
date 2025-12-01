import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'
import { posts, generatedComments, processingHistory } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params

    // Fetch post
    const [post] = await db.select().from(posts).where(eq(posts.id, postId))

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Fetch existing comments (all batches) - select only existing columns
    const comments = await db
      .select({
        id: generatedComments.id,
        postId: generatedComments.postId,
        variantNumber: generatedComments.variantNumber,
        commentText: generatedComments.commentText,
        style: generatedComments.style,
        wordCount: generatedComments.wordCount,
        qualityScore: generatedComments.qualityScore,
        relevanceScore: generatedComments.relevanceScore,
        safetyScore: generatedComments.safetyScore,
        engagementScore: generatedComments.engagementScore,
        recommendation: generatedComments.recommendation,
        createdAt: generatedComments.createdAt,
      })
      .from(generatedComments)
      .where(eq(generatedComments.postId, postId))
      .orderBy(generatedComments.createdAt)

    // Fetch processing history
    const [history] = await db
      .select()
      .from(processingHistory)
      .where(eq(processingHistory.postId, postId))
      .limit(1)

    if (comments.length === 0) {
      return NextResponse.json(
        { error: 'No comments found for this post' },
        { status: 404 }
      )
    }

    // Transform to match expected format with sequential display numbering
    const commentVariants = comments.map((c, index) => ({
      version: index + 1, // Sequential numbering: 1, 2, 3, 4, 5...
      comment: c.commentText,
      style: c.style || '',
      length: c.wordCount || 0,
      createdAt: c.createdAt,
    }))

    const variantScores = comments.map((c, index) => ({
      version: index + 1, // Match the sequential numbering
      quality_score: c.qualityScore || 0,
      relevance_score: c.relevanceScore || 0,
      safety_score: c.safetyScore || 0,
      engagement_potential: c.engagementScore || 0,
      recommendation: c.recommendation || 'acceptable',
      issues: [],
    }))

    // Find recommended variant (highest quality score)
    const recommendedVariant =
      comments.reduce((prev, current) =>
        (current.qualityScore || 0) > (prev.qualityScore || 0) ? current : prev
      )?.variantNumber || 1

    const response = {
      metadata: post.metadata,
      strategy: {
        // If comments exist, should_comment must be true (override history)
        should_comment: true,
        confidence: history?.confidence ?? 0.8,
        selected_tone: history?.selectedTone || 'professional_insightful',
        comment_style: commentVariants[0]?.style || 'insight_based',
        length: 'medium',
        risk_level: history?.riskLevel || 'low',
        reasoning: history?.reasoning || 'Comments were previously generated',
      },
      comments: commentVariants,
      quality_assessment: {
        variant_scores: variantScores,
        recommended_variant: recommendedVariant,
        overall_assessment: 'safe_to_post' as const,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Fetch comments error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params

    // Note: We no longer delete old comments to preserve history
    // Regeneration will create a new batch with incremented batch_number
    // If you want to delete ALL comments, uncomment below:
    // await db.delete(generatedComments).where(eq(generatedComments.postId, postId))
    // await db.delete(processingHistory).where(eq(processingHistory.postId, postId))

    return NextResponse.json({ 
      success: true, 
      message: 'Ready to regenerate. New comments will be added to history.' 
    })
  } catch (error) {
    console.error('Delete comments error:', error)
    return NextResponse.json(
      { error: 'Failed to prepare regeneration' },
      { status: 500 }
    )
  }
}
