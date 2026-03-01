import { createClient } from '@/lib/supabase/server'
import { Habit, Completion } from '@/types'
import { CalendarView } from '@/components/calendar/calendar-view'
import { format, subDays } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const view = (params.view as 'month' | 'week' | 'day') ?? 'month'
  const today = format(new Date(), 'yyyy-MM-dd')
  const selectedDate = params.date ?? today

  // Fetch last 90 days of completions for heatmap
  const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd')

  const [habitsRes, completionsRes] = await Promise.all([
    supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('sort_order'),
    supabase
      .from('completions')
      .select('*')
      .eq('user_id', user.id)
      .gte('completion_date', ninetyDaysAgo)
      .order('completion_date', { ascending: false }),
  ])

  const habits = (habitsRes.data ?? []) as Habit[]
  const completions = (completionsRes.data ?? []) as Completion[]

  return (
    <div className="px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#e8e8f0]">Calendar</h1>
        <p className="text-sm text-[#8888a8] mt-1">View your habit history and completion heatmap</p>
      </div>
      <CalendarView
        habits={habits}
        completions={completions}
        initialView={view}
        initialDate={selectedDate}
        userId={user.id}
      />
    </div>
  )
}
