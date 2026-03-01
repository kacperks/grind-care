'use client'

import { useState, useTransition } from 'react'
import { Habit, Completion, Streak, CompletionLevel } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { cn, scheduleLabel } from '@/lib/utils'
import { formatStreak } from '@/lib/streak/calculator'
import { ChevronDown, ChevronUp, Flame, Clock, Pencil, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface TodayChecklistProps {
  habits: Habit[]
  completionMap: Map<string, Completion>
  streakMap: Map<string, Streak>
  today: string
  userId: string
}

export function TodayChecklist({ habits, completionMap, streakMap, today, userId }: TodayChecklistProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [levels, setLevels] = useState<Record<string, CompletionLevel>>({})
  const supabase = createClient()

  const done = habits.filter(h => completionMap.has(h.id))
  const pending = habits.filter(h => !completionMap.has(h.id) && !h.is_paused)
  const paused = habits.filter(h => h.is_paused)

  async function toggleHabit(habit: Habit) {
    const existing = completionMap.get(habit.id)

    if (existing) {
      await supabase.from('completions').delete().eq('id', existing.id)
    } else {
      const level = levels[habit.id] ?? 'normal'
      const note = notes[habit.id] ?? null

      await supabase.from('completions').insert({
        user_id: userId,
        habit_id: habit.id,
        completion_date: today,
        completed_at: new Date().toISOString(),
        level,
        note: note || null,
        is_backfill: false,
      })

      // Update/upsert streak
      const streak = streakMap.get(habit.id)
      await supabase.from('streaks').upsert({
        user_id: userId,
        habit_id: habit.id,
        current_streak: (streak?.current_streak ?? 0) + 1,
        longest_streak: Math.max(streak?.longest_streak ?? 0, (streak?.current_streak ?? 0) + 1),
        last_completion_date: today,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,habit_id' })

      setExpandedNote(null)
    }

    startTransition(() => router.refresh())
  }

  async function saveNote(habitId: string) {
    const existing = completionMap.get(habitId)
    if (!existing) return
    const note = notes[habitId] ?? ''
    await supabase.from('completions').update({ note }).eq('id', existing.id)
    startTransition(() => router.refresh())
  }

  const completionRate = habits.length > 0
    ? Math.round((done.length / habits.filter(h => !h.is_paused).length) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      {habits.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#8888a8]">{done.length} of {habits.filter(h => !h.is_paused).length} done</span>
            <span className="font-medium text-[#e8e8f0]">{completionRate}%</span>
          </div>
          <div className="h-2 bg-[#1a1a25] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Pending habits */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-[#8888a8] uppercase tracking-wide mb-3">
            To Do
          </h2>
          <div className="space-y-2">
            {pending.map(habit => (
              <HabitItem
                key={habit.id}
                habit={habit}
                completion={null}
                streak={streakMap.get(habit.id)}
                expanded={expandedNote === habit.id}
                onToggle={() => toggleHabit(habit)}
                onExpandNote={() => setExpandedNote(expandedNote === habit.id ? null : habit.id)}
                note={notes[habit.id] ?? ''}
                onNoteChange={v => setNotes(prev => ({ ...prev, [habit.id]: v }))}
                level={levels[habit.id] ?? 'normal'}
                onLevelChange={v => setLevels(prev => ({ ...prev, [habit.id]: v }))}
              />
            ))}
          </div>
        </div>
      )}

      {/* Done habits */}
      {done.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-[#8888a8] uppercase tracking-wide mb-3">
            Completed ✓
          </h2>
          <div className="space-y-2">
            {done.map(habit => (
              <HabitItem
                key={habit.id}
                habit={habit}
                completion={completionMap.get(habit.id) ?? null}
                streak={streakMap.get(habit.id)}
                expanded={expandedNote === habit.id}
                onToggle={() => toggleHabit(habit)}
                onExpandNote={() => setExpandedNote(expandedNote === habit.id ? null : habit.id)}
                note={notes[habit.id] ?? completionMap.get(habit.id)?.note ?? ''}
                onNoteChange={v => setNotes(prev => ({ ...prev, [habit.id]: v }))}
                onNoteSave={() => saveNote(habit.id)}
                level={levels[habit.id] ?? completionMap.get(habit.id)?.level ?? 'normal'}
                onLevelChange={v => setLevels(prev => ({ ...prev, [habit.id]: v }))}
                done
              />
            ))}
          </div>
        </div>
      )}

      {/* Paused */}
      {paused.length > 0 && (
        <div className="opacity-50">
          <h2 className="text-xs font-semibold text-[#8888a8] uppercase tracking-wide mb-3">
            Paused
          </h2>
          <div className="space-y-2">
            {paused.map(habit => (
              <div key={habit.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#2a2a3a] bg-[#111118]">
                <span className="text-lg">{habit.icon}</span>
                <span className="text-sm text-[#8888a8] line-through">{habit.name}</span>
                <Badge variant="muted" className="ml-auto">Paused</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {habits.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="font-semibold text-[#e8e8f0] mb-1">No habits yet</h3>
          <p className="text-sm text-[#8888a8]">
            Go to <a href="/habits" className="text-indigo-400 hover:text-indigo-300">Habits</a> to add your first habit.
          </p>
        </div>
      )}
    </div>
  )
}

interface HabitItemProps {
  habit: Habit
  completion: Completion | null
  streak?: Streak
  expanded: boolean
  onToggle: () => void
  onExpandNote: () => void
  note: string
  onNoteChange: (v: string) => void
  onNoteSave?: () => void
  level: CompletionLevel
  onLevelChange: (v: CompletionLevel) => void
  done?: boolean
}

function HabitItem({
  habit, completion, streak, expanded, onToggle, onExpandNote,
  note, onNoteChange, onNoteSave, level, onLevelChange, done = false
}: HabitItemProps) {
  const currentStreak = streak?.current_streak ?? 0

  return (
    <div className={cn(
      'rounded-xl border transition-all',
      done
        ? 'border-green-600/30 bg-green-600/5'
        : 'border-[#2a2a3a] bg-[#111118] hover:border-indigo-500/30'
    )}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={cn(
            'w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all',
            done
              ? 'border-green-500 bg-green-500'
              : 'border-[#4a4a6a] hover:border-indigo-500'
          )}
          style={!done ? { borderColor: habit.color + '80' } : undefined}
        >
          {done && (
            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Icon + name */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-base leading-none">{habit.icon}</span>
          <div className="min-w-0">
            <span className={cn(
              'text-sm font-medium block truncate',
              done ? 'text-[#8888a8] line-through' : 'text-[#e8e8f0]'
            )}>
              {habit.name}
            </span>
            {habit.schedule_type && (
              <span className="text-xs text-[#4a4a6a]">
                {scheduleLabel(habit.schedule_type, habit.schedule_config as Record<string, unknown>)}
              </span>
            )}
          </div>
        </div>

        {/* Streak badge */}
        {currentStreak > 0 && (
          <div className="flex items-center gap-1 text-xs text-orange-400 shrink-0">
            <Flame size={13} />
            <span className="font-semibold">{currentStreak}</span>
          </div>
        )}

        {/* Completion level selector */}
        {!done && habit.completion_levels.length > 1 && (
          <select
            value={level}
            onChange={e => onLevelChange(e.target.value as CompletionLevel)}
            onClick={e => e.stopPropagation()}
            className="text-xs bg-[#1a1a25] border border-[#2a2a3a] rounded-lg px-2 py-1 text-[#8888a8] shrink-0"
          >
            {habit.completion_levels.map(l => (
              <option key={l.key} value={l.key}>{l.label}</option>
            ))}
          </select>
        )}

        {done && completion?.level && completion.level !== 'normal' && (
          <Badge variant={completion.level === 'light' ? 'warning' : 'muted'}>
            {completion.level}
          </Badge>
        )}

        {/* Note expand */}
        <button
          onClick={onExpandNote}
          className="p-1 rounded hover:bg-white/5 text-[#4a4a6a] hover:text-[#8888a8] shrink-0"
          title="Add note"
        >
          <Pencil size={13} />
        </button>
      </div>

      {/* Expanded note area */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-[#2a2a3a]/50 pt-3 space-y-2">
          {habit.note_template && (
            <p className="text-xs text-[#4a4a6a] italic">{habit.note_template}</p>
          )}
          <Textarea
            placeholder={habit.note_template ?? 'Quick note...'}
            value={note}
            onChange={e => onNoteChange(e.target.value)}
            rows={2}
            className="text-xs"
          />
          {done && onNoteSave && (
            <Button size="sm" onClick={onNoteSave} variant="outline">
              Save note
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
