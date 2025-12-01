'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'

type UserPreference = {
  id: string
  category: string
  isEnabled: boolean
  toneProfile: string
}

const toneProfiles = [
  { value: 'professional_insightful', label: 'Professional + Insightful' },
  { value: 'friendly_supportive', label: 'Friendly + Supportive' },
  { value: 'analytical_question_driven', label: 'Analytical + Question-driven' },
  { value: 'casual_authentic', label: 'Casual + Authentic' },
]

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<UserPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/preferences')
      const data = await response.json()
      setPreferences(data.preferences)
    } catch (err) {
      console.error('Failed to fetch preferences:', err)
    } finally {
      setLoading(false)
    }
  }

  const updatePreference = async (category: string, updates: Partial<UserPreference>) => {
    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          is_enabled: updates.isEnabled,
          tone_profile: updates.toneProfile,
        }),
      })

      if (response.ok) {
        setPreferences((prev) =>
          prev.map((pref) =>
            pref.category === category ? { ...pref, ...updates } : pref
          )
        )
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (err) {
      console.error('Failed to update preference:', err)
    }
  }

  const handleToggle = (category: string, enabled: boolean) => {
    updatePreference(category, { isEnabled: enabled })
  }

  const handleToneChange = (category: string, tone: string) => {
    updatePreference(category, { toneProfile: tone })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="space-y-2">
            <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Configure your category preferences and tone profiles
            </p>
          </div>

          {saved && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Settings saved successfully!
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Category Preferences</CardTitle>
              <CardDescription>
                Enable or disable categories and set the tone for each
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {preferences.map((pref) => (
                <div
                  key={pref.category}
                  className="flex flex-col md:flex-row md:items-center gap-4 pb-6 border-b last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Switch
                      id={`enable-${pref.category}`}
                      checked={pref.isEnabled}
                      onCheckedChange={(checked) => handleToggle(pref.category, checked)}
                    />
                    <Label
                      htmlFor={`enable-${pref.category}`}
                      className="font-medium capitalize cursor-pointer"
                    >
                      {pref.category.replace('_', ' ')}
                    </Label>
                  </div>

                  <div className="flex-1">
                    <Select
                      value={pref.toneProfile}
                      onValueChange={(value) => handleToneChange(pref.category, value)}
                      disabled={!pref.isEnabled}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {toneProfiles.map((tone) => (
                          <SelectItem key={tone.value} value={tone.value}>
                            {tone.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tone Profiles Explained</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {toneProfiles.map((tone) => (
                <div key={tone.value}>
                  <p className="font-medium">{tone.label}</p>
                  <p className="text-muted-foreground text-xs">
                    {tone.value === 'professional_insightful' &&
                      'Industry expertise and thoughtful analysis'}
                    {tone.value === 'friendly_supportive' &&
                      'Encouraging, warm, and collaborative approach'}
                    {tone.value === 'analytical_question_driven' &&
                      'Data-focused with curiosity-led questions'}
                    {tone.value === 'casual_authentic' &&
                      'Personal, relatable, and conversational'}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
