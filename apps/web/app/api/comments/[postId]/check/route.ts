import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'
import { generatedComments } from '@/db/schema'
import { eq, count } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params

    // Check if comments exist for this post using count
    const [result] = await db
      .select({ count: count() })
      .from(generatedComments)
      .where(eq(generatedComments.postId, postId))

    const commentCount = result?.count || 0

    return NextResponse.json({
      exists: commentCount > 0,
      count: commentCount,
    })
  } catch (error) {
    console.error('Check comments error:', error)
    return NextResponse.json(
      { error: 'Failed to check comments' },
      { status: 500 }
    )
  }
}
