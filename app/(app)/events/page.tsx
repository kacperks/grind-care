import { createClient } from '@/lib/supabase/server'
import { Habit, Completion } from '@/types'
import { EventsList } from '@/components/habits/events-list'
import { format, subDays } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd')

  const [eventsRes, completionsRes] = await Promise.all([
    supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('item_type', 'event')
      .eq('is_archived', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('completions')
      .select('*')
      .eq('user_id', user.id)
      .gte('completion_date', ninetyDaysAgo)
      .order('completion_date', { ascending: false }),
  ])

  const events = (eventsRes.data ?? []) as Habit[]
  const completions = (completionsRes.data ?? []) as Completion[]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#e8e8f0]">Events</h1>
        <p className="text-sm text-[#8888a8] mt-1">Track sporadic activities and see when you last did them</p>
      </div>
      <EventsList events={events} completions={completions} userId={user.id} />
    </div>
  )
}
