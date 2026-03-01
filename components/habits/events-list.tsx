'use client'

import { useState, useTransition } from 'react'
import { Habit, Completion } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HabitFormDialog } from './habit-form-dialog'
import { avgEventInterval } from '@/lib/streak/calculator'
import { format, parseISO, differenceInDays } from 'date-fns'
import { Plus, Clock, TrendingUp, LogIn } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Textarea } from '../ui/input'
import { Dialog, DialogContent } from '../ui/dialog'

interface EventsListProps {
  events: Habit[]
  completions: Completion[]
  userId: string
}

export function EventsList({ events, completions, userId }: EventsListProps) {
  const [showForm, setShowForm] = useState(false)
  const [loggingEvent, setLoggingEvent] = useState<Habit | null>(null)
  const [logNote, setLogNote] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  const completionsByEvent = new Map<string, Completion[]>()
  for (const c of completions) {
    const list = completionsByEvent.get(c.habit_id) ?? []
    list.push(c)
    completionsByEvent.set(c.habit_id, list)
  }

  async function logEvent(event: Habit) {
    const today = format(new Date(), 'yyyy-MM-dd')
    await supabase.from('completions').insert({
      user_id: userId,
      habit_id: event.id,
      completion_date: today,
      completed_at: new Date().toISOString(),
      level: 'normal',
      note: logNote || null,
      is_backfill: false,
    })
    setLoggingEvent(null)
    setLogNote('')
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => setShowForm(true)}>
        <Plus size={16} /> New Event Type
      </Button>

      {events.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#2a2a3a] rounded-2xl">
          <div className="text-4xl mb-3">⚡</div>
          <h3 className="font-semibold text-[#e8e8f0] mb-1">No event types yet</h3>
          <p className="text-sm text-[#8888a8]">Create event types to track sporadic activities.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(event => {
            const eventCompletions = completionsByEvent.get(event.id) ?? []
            const lastCompletion = eventCompletions[0]
            const avgInterval = avgEventInterval(eventCompletions)
            const daysSinceLast = lastCompletion
              ? differenceInDays(new Date(), parseISO(lastCompletion.completion_date))
              : null

            return (
              <div key={event.id} className="bg-[#111118] rounded-xl border border-[#2a2a3a] p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{event.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[#e8e8f0]">{event.name}</h3>
                      <Badge variant="muted">Event</Badge>
                    </div>
                    {event.description && (
                      <p className="text-sm text-[#8888a8] mt-0.5">{event.description}</p>
                    )}

                    {/* Stats */}
                    <div className="flex flex-wrap gap-4 mt-3">
                      <div className="flex items-center gap-1.5 text-xs text-[#8888a8]">
                        <Clock size={12} />
                        {daysSinceLast !== null
                          ? daysSinceLast === 0 ? 'Today' : `${daysSinceLast}d ago`
                          : 'Never'}
                      </div>
                      {avgInterval && (
                        <div className="flex items-center gap-1.5 text-xs text-[#8888a8]">
                          <TrendingUp size={12} />
                          Avg every {avgInterval}d
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-[#8888a8]">
                        <LogIn size={12} />
                        {eventCompletions.length} total logs
                      </div>
                    </div>

                    {/* Recent logs */}
                    {eventCompletions.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {eventCompletions.slice(0, 3).map(c => (
                          <div key={c.id} className="flex items-start gap-2 text-xs text-[#4a4a6a]">
                            <span className="shrink-0">{format(parseISO(c.completion_date), 'MMM d')}</span>
                            {c.note && <span className="text-[#8888a8] italic truncate">"{c.note}"</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => { setLoggingEvent(event); setLogNote('') }}
                    style={{ borderColor: event.color + '50', color: event.color }}
                    className="shrink-0 border bg-transparent hover:opacity-80"
                  >
                    Log it
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Log event dialog */}
      <Dialog open={!!loggingEvent} onOpenChange={v => !v && setLoggingEvent(null)}>
        <DialogContent title={`Log: ${loggingEvent?.name}`} description="Record that you did this today">
          <div className="space-y-4">
            {loggingEvent?.note_template && (
              <p className="text-xs text-[#8888a8] italic">{loggingEvent.note_template}</p>
            )}
            <Textarea
              placeholder={loggingEvent?.note_template ?? 'Optional note...'}
              value={logNote}
              onChange={e => setLogNote(e.target.value)}
              rows={3}
            />
            <div className="flex gap-3">
              <Button onClick={() => loggingEvent && logEvent(loggingEvent)} className="flex-1">
                Log Event
              </Button>
              <Button variant="outline" onClick={() => setLoggingEvent(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create event form */}
      <HabitFormDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        userId={userId}
        itemType="event"
      />
    </div>
  )
}
