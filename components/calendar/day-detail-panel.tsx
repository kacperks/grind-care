'use client'

import { useState, useTransition } from 'react'
import { Habit, Completion, CompletionLevel } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { X, Plus, Check, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface DayDetailPanelProps {
  date: string
  habits: Habit[]
  completions: Completion[]
  userId: string
  onClose: () => void
}

export function DayDetailPanel({ date, habits, completions, userId, onClose }: DayDetailPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const isFuture = date > format(new Date(), 'yyyy-MM-dd')
  const isBackfill = date < format(new Date(), 'yyyy-MM-dd')
  const completionMap = new Map(completions.map(c => [c.habit_id, c]))

  async function toggleCompletion(habit: Habit) {
    const existing = completionMap.get(habit.id)

    if (existing) {
      await supabase.from('completions').delete().eq('id', existing.id)
    } else {
      await supabase.from('completions').insert({
        user_id: userId,
        habit_id: habit.id,
        completion_date: date,
        completed_at: new Date().toISOString(),
        level: 'normal',
        note: null,
        is_backfill: isBackfill,
      })
    }
    startTransition(() => router.refresh())
  }

  async function saveNote(completionId: string) {
    await supabase.from('completions').update({ note: noteText }).eq('id', completionId)
    setEditingNote(null)
    startTransition(() => router.refresh())
  }

  const formattedDate = format(parseISO(date), 'EEEE, MMMM d')

  return (
    <div className="bg-[#111118] rounded-2xl border border-[#2a2a3a] p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-[#e8e8f0]">{formattedDate}</h3>
          {isBackfill && (
            <Badge variant="muted" className="mt-1">Backfill mode</Badge>
          )}
          {isFuture && (
            <Badge variant="warning" className="mt-1">Future date — planning mode</Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>

      <div className="space-y-2">
        {habits.filter(h => !h.is_archived).map(habit => {
          const completion = completionMap.get(habit.id)
          const done = !!completion

          return (
            <div key={habit.id} className={cn(
              'rounded-xl border p-3 transition-all',
              done ? 'border-green-600/30 bg-green-600/5' : 'border-[#2a2a3a]'
            )}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleCompletion(habit)}
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
                    done ? 'border-green-500 bg-green-500' : 'border-[#4a4a6a] hover:border-indigo-500'
                  )}
                >
                  {done && <Check size={10} className="text-white" strokeWidth={3} />}
                </button>

                <span className="text-sm font-medium text-[#e8e8f0] flex-1 min-w-0 truncate">
                  {habit.icon} {habit.name}
                </span>

                {done && completion.is_backfill && (
                  <Badge variant="muted">edited later</Badge>
                )}

                {done && (
                  <button
                    onClick={() => {
                      setEditingNote(editingNote === completion.id ? null : completion.id)
                      setNoteText(completion.note ?? '')
                    }}
                    className="p-1 text-[#4a4a6a] hover:text-[#8888a8]"
                  >
                    <Pencil size={12} />
                  </button>
                )}
              </div>

              {/* Note display / edit */}
              {done && completion.note && editingNote !== completion.id && (
                <p className="mt-2 ml-8 text-xs text-[#8888a8] italic">"{completion.note}"</p>
              )}

              {done && editingNote === completion.id && (
                <div className="mt-2 ml-8 space-y-2">
                  <Textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder={habit.note_template ?? 'Add a note...'}
                    rows={2}
                    className="text-xs"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveNote(completion.id)}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingNote(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {habits.length === 0 && (
          <p className="text-sm text-[#8888a8] text-center py-4">No habits to show</p>
        )}
      </div>
    </div>
  )
}
