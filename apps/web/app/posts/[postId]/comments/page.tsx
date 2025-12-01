'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { use } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Copy, Check, ArrowLeft, AlertCircle, Pencil, Save, X } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

type CommentData = {
  metadata: {
    primary_category: string
    sentiment: string
    post_type: string
    tone: string
    complexity: string
  }
  strategy: {
    should_comment: boolean
    confidence: number
    selected_tone: string
    comment_style: string
    length: string
    risk_level: string
    reasoning: string
  }
  comments: Array<{
    id?: string // Added optional ID
    version: number
    comment: string
    style: string
    length: number
  }>
  quality_assessment: {
    variant_scores: Array<{
      version: number
      quality_score: number
      relevance_score: number
      safety_score: number
      engagement_potential: number
      recommendation: string
      issues: string[]
    }>
    recommended_variant: number
    overall_assessment: string
  }
}

export default function CommentsPage({
  params,
}: {
  params: Promise<{ postId: string }>
}) {
  const { postId } = use(params)
  const [data, setData] = useState<CommentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    generateComments()
  }, [postId])

  const generateComments = async () => {
    try {
      // First, try to fetch existing comments
      const fetchResponse = await fetch(`/api/comments/${postId}`)
      
      if (fetchResponse.ok) {
        const existingData = await fetchResponse.json()
        setData(existingData)
        setLoading(false)
        return
      }

      // If no existing comments, generate new ones
      const response = await fetch('/api/comments/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate comments')
      }

      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate comments')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    if (!confirm('Are you sure you want to regenerate comments? This will delete existing comments and create new ones based on your current preferences.')) {
      return
    }

    setRegenerating(true)
    try {
      // Delete existing comments
      const deleteResponse = await fetch(`/api/comments/${postId}`, {
        method: 'DELETE',
      })

      if (!deleteResponse.ok) {
        throw new Error('Failed to delete existing comments')
      }

      // Generate new comments
      setLoading(true)
      setData(null)
      const response = await fetch('/api/comments/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate comments')
      }

      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate comments')
    } finally {
      setLoading(false)
      setRegenerating(false)
    }
  }

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const startEditing = (id: string, text: string) => {
    setEditingId(id)
    setEditText(text)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditText('')
  }

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return
    
    setIsSaving(true)
    try {
      const response = await fetch('/api/comments/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          commentText: editText,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update comment')
      }

      // Update local state
      setData((prev) => {
        if (!prev) return null
        return {
          ...prev,
          comments: prev.comments.map((c) => 
            c.id === id ? { ...c, comment: editText } : c
          ),
        }
      })
      
      setEditingId(null)
    } catch (err) {
      alert('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <div className="text-center">
            <p className="font-medium">Generating comments...</p>
            <p className="text-sm text-muted-foreground">This may take a moment</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Link href="/posts">
            <Button className="mt-4">Back to Posts</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Handle both API response formats
  const shouldNotComment = data?.strategy 
    ? !data.strategy.should_comment 
    : (data as any)?.should_comment === false
  
  if (shouldNotComment) {
    const reasoning = data?.strategy?.reasoning || (data as any)?.reasoning || 'Should not comment on this post'
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <Link href="/posts" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Posts
          </Link>
          <Alert>
            <AlertDescription>
              <strong>Strategy Decision:</strong> {reasoning}
            </AlertDescription>
          </Alert>
          <div className="flex gap-3">
            <Link href="/posts">
              <Button>Back to Posts</Button>
            </Link>
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={regenerating}
            >
              {regenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                'Regenerate with New Preferences'
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // TypeScript guard: data cannot be null at this point
  if (!data) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <Link href="/posts" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Posts
          </Link>

          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Generated Comments</h1>
              <p className="text-muted-foreground">
                AI analysis and comment suggestions
              </p>
            </div>
            <Button
              onClick={handleRegenerate}
              disabled={regenerating}
              variant="outline"
            >
              {regenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                'Regenerate Comments'
              )}
            </Button>
          </div>

          {/* Strategy Info */}
          <Card>
            <CardHeader>
              <CardTitle>Strategy Decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className="font-semibold">{(data.strategy.confidence * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tone</p>
                  <p className="font-semibold">{data.strategy.selected_tone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Style</p>
                  <p className="font-semibold">{data.strategy.comment_style}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Risk Level</p>
                  <Badge variant={data.strategy.risk_level === 'low' ? 'default' : 'destructive'}>
                    {data.strategy.risk_level}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground italic">
                {data.strategy.reasoning}
              </p>
            </CardContent>
          </Card>

          {/* Comment Variants */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Comment Variants</h2>
            {data.comments.map((comment, index) => {
              const score = data.quality_assessment.variant_scores[index]
              const isRecommended = data.quality_assessment.recommended_variant === comment.version
              const isEditing = editingId === comment.id

              if (!score) return null

              return (
                <Card key={`variant-${index}`} className={isRecommended ? 'border-primary' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Variant {comment.version}
                          {isRecommended && (
                            <Badge className="ml-2" variant="default">
                              Recommended
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{comment.style}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditing}
                              disabled={isSaving}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => comment.id && saveEdit(comment.id)}
                              disabled={isSaving}
                            >
                              {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        ) : (
                          <>
                            {comment.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditing(comment.id!, comment.comment)}
                              >
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(comment.comment, index)}
                            >
                              {copiedIndex === index ? (
                                <>
                                  <Check className="mr-2 h-4 w-4" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy
                                </>
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isEditing ? (
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="min-h-[100px]"
                      />
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.comment}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Quality</p>
                        <p className="font-semibold">{((score.quality_score || 0) * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Relevance</p>
                        <p className="font-semibold">{((score.relevance_score || 0) * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Safety</p>
                        <p className="font-semibold">{((score.safety_score || 0) * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Engagement</p>
                        <p className="font-semibold">{((score.engagement_potential || 0) * 100).toFixed(0)}%</p>
                      </div>
                    </div>

                    {score.issues && score.issues.length > 0 && (
                      <Alert>
                        <AlertDescription>
                          <strong>Issues:</strong> {score.issues.join(', ')}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
