import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/supabase'
import { userPreferences } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function GET() {
  try {
    const prefs = await db
      .select()
      .from(userPreferences)
      .orderBy(asc(userPreferences.category))

    return NextResponse.json({ preferences: prefs })
  } catch (error) {
    console.error('Fetch preferences error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { category, is_enabled, tone_profile } = await request.json()

    const [updated] = await db
      .update(userPreferences)
      .set({
        isEnabled: is_enabled,
        toneProfile: tone_profile,
        updatedAt: new Date(),
      })
      .where(eq(userPreferences.category, category))
      .returning()

    return NextResponse.json({ preference: updated })
  } catch (error) {
    console.error('Update preference error:', error)
    return NextResponse.json(
      { error: 'Failed to update preference' },
      { status: 500 }
    )
  }
}
