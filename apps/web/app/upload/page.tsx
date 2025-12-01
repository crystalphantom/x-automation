'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, CheckCircle2, AlertCircle, FileJson, Loader2, ArrowLeft, Type } from 'lucide-react'

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ count: number } | null>(null)
  
  // Text paste mode state
  const [tweetText, setTweetText] = useState('')
  const [tweetAuthor, setTweetAuthor] = useState('')

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    setError(null)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === 'application/json') {
        setFile(droppedFile)
      } else {
        setError('Please upload a JSON file')
      }
    }
  }, [])

  const handleTextSubmit = async () => {
    if (!tweetText.trim()) {
      setError('Please enter tweet text')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const post = {
        id: `post_${Date.now()}`,
        author: tweetAuthor.trim() || 'Unknown',
        content: tweetText.trim(),
        timestamp: new Date().toISOString(),
      }

      const response = await fetch('/api/posts/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ posts: [post] }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setSuccess({ count: 1 })
      setTweetText('')
      setTweetAuthor('')
      
      setTimeout(() => {
        router.push('/posts')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload post')
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0]
      if (selectedFile.type === 'application/json') {
        setFile(selectedFile)
      } else {
        setError('Please upload a JSON file')
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const fileContent = await file.text()
      const jsonData = JSON.parse(fileContent)

      const response = await fetch('/api/posts/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setSuccess({ count: data.count })
      setTimeout(() => {
        router.push('/posts')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload posts')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Upload Posts</h1>
              <p className="text-muted-foreground">
                Paste tweet text directly or upload a JSON file
              </p>
            </div>
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Successfully uploaded {success.count} {success.count === 1 ? 'post' : 'posts'}! Redirecting...
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="paste" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paste">
                <Type className="mr-2 h-4 w-4" />
                Paste Text
              </TabsTrigger>
              <TabsTrigger value="json">
                <FileJson className="mr-2 h-4 w-4" />
                Upload JSON
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paste">
              <Card>
                <CardHeader>
                  <CardTitle>Paste Tweet Text</CardTitle>
                  <CardDescription>
                    Paste a tweet directly - no JSON file needed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tweet-text">Tweet Content *</Label>
                    <Textarea
                      id="tweet-text"
                      placeholder="Paste the tweet text here...Example: 'Just launched our new product! Check it out at...'"
                      value={tweetText}
                      onChange={(e) => setTweetText(e.target.value)}
                      className="min-h-[150px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      {tweetText.length} characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tweet-author">Author (Optional)</Label>
                    <Input
                      id="tweet-author"
                      placeholder="@username or name"
                      value={tweetAuthor}
                      onChange={(e) => setTweetAuthor(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={handleTextSubmit}
                    disabled={uploading || !tweetText.trim()}
                    className="w-full"
                    size="lg"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Analyze Tweet
                      </>
                    )}
                  </Button>

                  <div className="p-4 bg-muted rounded-lg text-sm">
                    <p className="font-medium mb-2">💡 Quick Tips:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                      <li>Paste the complete tweet text</li>
                      <li>Author is optional - defaults to "Unknown"</li>
                      <li>Timestamp is auto-generated</li>
                      <li>Perfect for quick single-tweet analysis</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="json">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Posts (JSON)</CardTitle>
                  <CardDescription>
                    Upload a JSON file containing one or more posts for batch processing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                      dragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="rounded-full bg-primary/10 p-4">
                        {file ? (
                          <FileJson className="h-8 w-8 text-primary" />
                        ) : (
                          <Upload className="h-8 w-8 text-primary" />
                        )}
                      </div>
                      <div>
                        {file ? (
                          <>
                            <p className="text-lg font-medium">{file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-lg font-medium">
                              {dragActive ? 'Drop your file here' : 'Drag & drop your JSON file'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              or click to browse
                            </p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                      />
                      <Button
                        onClick={() => document.getElementById('file-upload')?.click()}
                        disabled={uploading}
                        variant="outline"
                      >
                        <FileJson className="mr-2 h-4 w-4" />
                        Choose File
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="w-full"
                    size="lg"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Posts
                      </>
                    )}
                  </Button>

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Expected JSON format:</p>
                    <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
                      {JSON.stringify(
                        {
                          posts: [
                            {
                              id: 'post_001',
                              author: '@username',
                              content: 'Tweet content here...',
                              timestamp: '2024-01-01T12:00:00Z',
                            },
                          ],
                        },
                        null,
                        2
                      )}
                    </pre>
                    <p className="text-xs text-muted-foreground mt-2">
                      Sample file available at: <code>apps/web/sample-posts.json</code>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
