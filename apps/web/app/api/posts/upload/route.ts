import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'
import { posts } from '@/db/schema'
import { z } from 'zod'

const UploadSchema = z.object({
  posts: z.array(
    z.object({
      id: z.string(),
      author: z.string(),
      content: z.string(),
      timestamp: z.string().datetime(),
    })
  ),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = UploadSchema.parse(body)

    // Insert posts into database using Drizzle
    await db.insert(posts).values(
      parsed.posts.map((post) => ({
        id: post.id,
        author: post.author,
        content: post.content,
        timestamp: new Date(post.timestamp),
        metadata: null,
      }))
    )

    return NextResponse.json({
      success: true,
      count: parsed.posts.length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }

    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload posts' },
      { status: 500 }
    )
  }
}
