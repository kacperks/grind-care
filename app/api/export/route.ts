import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') ?? 'json'

  const [habitsRes, completionsRes, streaksRes] = await Promise.all([
    supabase.from('habits').select('*').eq('user_id', user.id),
    supabase.from('completions').select('*').eq('user_id', user.id).order('completion_date'),
    supabase.from('streaks').select('*').eq('user_id', user.id),
  ])

  if (format === 'csv') {
    const habits = habitsRes.data ?? []
    const completions = completionsRes.data ?? []

    const rows = [
      ['date', 'habit_name', 'item_type', 'level', 'note', 'is_backfill', 'streak'],
      ...completions.map(c => {
        const habit = habits.find(h => h.id === c.habit_id)
        const streak = streaksRes.data?.find(s => s.habit_id === c.habit_id)
        return [
          c.completion_date,
          habit?.name ?? '',
          habit?.item_type ?? '',
          c.level,
          c.note ?? '',
          c.is_backfill ? 'yes' : 'no',
          streak?.current_streak ?? '',
        ]
      })
    ]

    const csv = rows
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="grindkeeper-export.csv"',
      },
    })
  }

  const data = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    habits: habitsRes.data ?? [],
    completions: completionsRes.data ?? [],
    streaks: streaksRes.data ?? [],
  }

  return NextResponse.json(data, {
    headers: { 'Content-Disposition': 'attachment; filename="grindkeeper-export.json"' },
  })
}
