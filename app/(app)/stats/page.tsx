import { createClient } from '@/lib/supabase/server'
import { Habit, Completion, Streak } from '@/types'
import { StatsView } from '@/components/stats/stats-view'
import { format, subDays, startOfWeek } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd')

  const [habitsRes, completionsRes, streaksRes] = await Promise.all([
    supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false),
    supabase
      .from('completions')
      .select('*')
      .eq('user_id', user.id)
      .gte('completion_date', ninetyDaysAgo)
      .order('completion_date', { ascending: false }),
    supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user.id),
  ])

  const habits = (habitsRes.data ?? []) as Habit[]
  const completions = (completionsRes.data ?? []) as Completion[]
  const streaks = (streaksRes.data ?? []) as Streak[]
  const streakMap = new Map(streaks.map(s => [s.habit_id, s]))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#e8e8f0]">Statistics</h1>
        <p className="text-sm text-[#8888a8] mt-1">Track your progress and discover patterns</p>
      </div>
      <StatsView habits={habits} completions={completions} streakMap={streakMap} />
    </div>
  )
}
