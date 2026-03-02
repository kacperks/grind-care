import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { format } from 'date-fns'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { habit_id, completion_date, level = 'normal', note = null, is_backfill = false } = body

  if (!habit_id || !completion_date) {
    return NextResponse.json({ error: 'habit_id and completion_date required' }, { status: 400 })
  }

  // Verify habit belongs to user
  const { data: habit } = await supabase
    .from('habits')
    .select('id, item_type')
    .eq('id', habit_id)
    .eq('user_id', user.id)
    .single()

  if (!habit) return NextResponse.json({ error: 'Habit not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('completions')
    .insert({
      user_id: user.id,
      habit_id,
      completion_date,
      completed_at: new Date().toISOString(),
      level,
      note,
      is_backfill,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update streak if habit type
  if (habit.item_type === 'habit') {
    await supabase.from('streaks').upsert({
      user_id: user.id,
      habit_id,
      last_completion_date: completion_date,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,habit_id' })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('completions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
