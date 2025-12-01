import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'
import { generatedComments } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PUT(request: NextRequest) {
  try {
    const { id, commentText } = await request.json()

    if (!id || !commentText) {
      return NextResponse.json(
        { error: 'Missing id or commentText' },
        { status: 400 }
      )
    }

    // Update the comment text
    const [updatedComment] = await db
      .update(generatedComments)
      .set({ 
        commentText,
        // Optionally update word count
        wordCount: commentText.split(/\s+/).length 
      })
      .where(eq(generatedComments.id, id))
      .returning()

    return NextResponse.json({ success: true, comment: updatedComment })
  } catch (error) {
    console.error('Update comment error:', error)
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    )
  }
}
