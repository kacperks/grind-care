import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { TodayChecklist } from '@/components/habits/today-checklist'
import { AntiZeroBanner } from '@/components/habits/anti-zero-banner'
import { EnergyBudgetBar } from '@/components/habits/energy-budget-bar'
import { Habit, Completion, Streak } from '@/types'

export const dynamic = 'force-dynamic'

export default async function TodayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = format(new Date(), 'yyyy-MM-dd')

  const [habitsRes, completionsRes, streaksRes, profileRes] = await Promise.all([
    supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .eq('item_type', 'habit')
      .order('sort_order'),
    supabase
      .from('completions')
      .select('*')
      .eq('user_id', user.id)
      .eq('completion_date', today),
    supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user.id),
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
  ])

  const habits = (habitsRes.data ?? []) as Habit[]
  const completions = (completionsRes.data ?? []) as Completion[]
  const streaks = (streaksRes.data ?? []) as Streak[]
  const profile = profileRes.data

  const streakMap = new Map(streaks.map(s => [s.habit_id, s]))
  const completionMap = new Map(completions.map(c => [c.habit_id, c]))

  const totalEnergy = completions.reduce((sum, c) => {
    const habit = habits.find(h => h.id === c.habit_id)
    return sum + (habit?.difficulty ?? 0)
  }, 0)

  const dayName = format(new Date(), 'EEEE, MMMM d')

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-[#8888a8] font-medium">{dayName}</p>
        <h1 className="text-2xl font-bold text-[#e8e8f0]">Today</h1>
      </div>

      {/* Energy budget */}
      <EnergyBudgetBar
        used={totalEnergy}
        max={profile?.daily_energy_budget ?? 20}
        className="mb-4"
      />

      {/* Anti-zero suggestion */}
      <AntiZeroBanner
        habits={habits}
        completions={completions}
        className="mb-6"
      />

      {/* Checklist */}
      <TodayChecklist
        habits={habits}
        completionMap={completionMap}
        streakMap={streakMap}
        today={today}
        userId={user.id}
      />
    </div>
  )
}
