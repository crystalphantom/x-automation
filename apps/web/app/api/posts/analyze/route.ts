import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { posts } from "@/db/schema";
import { analyzePost } from "mastra-api";
import type { RawPost } from "mastra-api";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { postId } = await request.json();

    if (!postId) {
      return NextResponse.json({ error: "Post ID required" }, { status: 400 });
    }

    // Fetch post from database using Drizzle
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Transform to RawPost format
    const rawPost: RawPost = {
      id: post.id,
      author: post.author,
      content: post.content,
      timestamp: post.timestamp.toISOString(),
    };

    // Analyze the post
    const metadata = await analyzePost(rawPost);

    // Update post with metadata using Drizzle
    await db.update(posts).set({ metadata }).where(eq(posts.id, postId));

    return NextResponse.json({ metadata });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze post" },
      { status: 500 },
    );
  }
}
