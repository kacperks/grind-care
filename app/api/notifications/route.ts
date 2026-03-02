import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET: Fetch unread notifications
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH: Mark as read / snooze
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, action, snooze_minutes } = body

  if (action === 'read') {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
  } else if (action === 'snooze') {
    const snoozedUntil = new Date()
    snoozedUntil.setMinutes(snoozedUntil.getMinutes() + (snooze_minutes ?? 30))
    await supabase
      .from('notifications')
      .update({ snoozed_until: snoozedUntil.toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
  } else if (action === 'read_all') {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null)
  }

  return NextResponse.json({ ok: true })
}

// POST: Create a notification (called by edge functions/cron)
export async function POST(request: Request) {
  // Validate service key
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { user_id, habit_id, type, title, message } = body

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .insert({ user_id, habit_id, type, title, message })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
