'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react'

type Post = {
  id: string
  author: string
  content: string
  timestamp: string
  metadata: {
    primary_category?: string
    sentiment?: string
    post_type?: string
    tone?: string
    complexity?: string
  } | null
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch posts')
      }

      setPosts(data.posts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch posts')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateComments = async (postId: string) => {
    setGenerating(postId)
    try {
      // First, check if comments already exist
      const checkResponse = await fetch(`/api/comments/${postId}/check`)
      const checkData = await checkResponse.json()

      if (checkData.exists) {
        // Comments already exist, navigate to view them
        window.location.href = `/posts/${postId}/comments`
        return
      }

      // No comments exist, generate new ones
      const response = await fetch('/api/comments/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate comments')
      }

      // Redirect to comments view
      window.location.href = `/posts/${postId}/comments`
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate comments')
    } finally {
      setGenerating(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading posts...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
              <h1 className="text-3xl font-bold">Posts</h1>
              <p className="text-muted-foreground">
                {posts.length} posts uploaded
              </p>
            </div>
            <Link href="/upload">
              <Button>Upload More</Button>
            </Link>
          </div>

          {posts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No posts uploaded yet.</p>
                <Link href="/upload">
                  <Button className="mt-4">Upload Posts</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg">{post.author}</CardTitle>
                        <CardDescription className="text-xs">
                          {new Date(post.timestamp).toLocaleString()}
                        </CardDescription>
                      </div>
                      {post.metadata && (
                        <div className="flex flex-wrap gap-2">
                          {post.metadata.primary_category && (
                            <Badge variant="secondary">
                              {post.metadata.primary_category}
                            </Badge>
                          )}
                          {post.metadata.sentiment && (
                            <Badge
                              variant={
                                post.metadata.sentiment === 'positive'
                                  ? 'default'
                                  : post.metadata.sentiment === 'negative'
                                  ? 'destructive'
                                  : 'outline'
                              }
                            >
                              {post.metadata.sentiment}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm">{post.content}</p>

                    {post.metadata && (
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {post.metadata.post_type && (
                          <span>Type: {post.metadata.post_type}</span>
                        )}
                        {post.metadata.tone && (
                          <span>Tone: {post.metadata.tone}</span>
                        )}
                        {post.metadata.complexity && (
                          <span>Complexity: {post.metadata.complexity}</span>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleGenerateComments(post.id)}
                        disabled={generating === post.id}
                      >
                        {generating === post.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          'View/Generate Comments'
                        )}
                      </Button>
                      {!post.metadata && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          Not analyzed yet
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
