import { createClient } from '@/lib/supabase/server'
import { Habit, Streak } from '@/types'
import { HabitsList } from '@/components/habits/habits-list'

export const dynamic = 'force-dynamic'

export default async function HabitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [habitsRes, streaksRes] = await Promise.all([
    supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('item_type', 'habit')
      .order('sort_order'),
    supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user.id),
  ])

  const habits = (habitsRes.data ?? []) as Habit[]
  const streaks = (streaksRes.data ?? []) as Streak[]
  const streakMap = new Map(streaks.map(s => [s.habit_id, s]))

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#e8e8f0]">Habits</h1>
        <p className="text-sm text-[#8888a8] mt-1">Manage your recurring habits and routines</p>
      </div>
      <HabitsList habits={habits} streakMap={streakMap} userId={user.id} />
    </div>
  )
}
