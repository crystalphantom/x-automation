import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase'
import { posts } from '@/db/schema'
import { desc } from 'drizzle-orm'

export async function GET() {
  try {
    const allPosts = await db.select().from(posts).orderBy(desc(posts.createdAt))

    return NextResponse.json({ posts: allPosts })
  } catch (error) {
    console.error('Fetch posts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}
