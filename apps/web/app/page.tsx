import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight">
              Twitter Comment Agent
            </h1>
            <p className="text-xl text-muted-foreground">
              AI-powered intelligent commenting system for Twitter/X
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>📤</span> Upload Posts
                </CardTitle>
                <CardDescription>
                  Upload JSON file with Twitter posts for analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/upload">
                  <Button className="w-full">Go to Upload</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>📝</span> Posts & Comments
                </CardTitle>
                <CardDescription>
                  View posts and generate AI comments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/posts">
                  <Button className="w-full">View Posts</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>⚙️</span> Settings
                </CardTitle>
                <CardDescription>
                  Configure categories and tone preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/settings">
                  <Button className="w-full">Open Settings</Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="mt-16 p-6 bg-white dark:bg-slate-800 rounded-lg border">
            <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
            <div className="grid md:grid-cols-4 gap-4 text-left">
              <div className="space-y-2">
                <div className="text-primary font-semibold">1. Analyze</div>
                <p className="text-sm text-muted-foreground">
                  AI analyzes post content, sentiment, and category
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-primary font-semibold">2. Strategize</div>
                <p className="text-sm text-muted-foreground">
                  Decides if and how to comment based on your preferences
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-primary font-semibold">3. Generate</div>
                <p className="text-sm text-muted-foreground">
                  Creates 2-3 comment variants with different tones
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-primary font-semibold">4. Quality Check</div>
                <p className="text-sm text-muted-foreground">
                  Scores each comment for quality, safety, and relevance
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
