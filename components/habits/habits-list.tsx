'use client'

import { useState, useTransition } from 'react'
import { Habit, Streak } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HabitFormDialog } from './habit-form-dialog'
import { cn, scheduleLabel, difficultyLabel } from '@/lib/utils'
import { formatStreak } from '@/lib/streak/calculator'
import { Plus, Flame, Pause, Play, Archive, Pencil, MoreHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

interface HabitsListProps {
  habits: Habit[]
  streakMap: Map<string, Streak>
  userId: string
}

export function HabitsList({ habits, streakMap, userId }: HabitsListProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  const active = habits.filter(h => !h.is_archived)
  const archived = habits.filter(h => h.is_archived)

  async function togglePause(habit: Habit) {
    await supabase.from('habits')
      .update({ is_paused: !habit.is_paused, updated_at: new Date().toISOString() })
      .eq('id', habit.id)

    if (!habit.is_paused) {
      // Creating a pause record
      await supabase.from('habit_pauses').insert({
        user_id: userId,
        habit_id: habit.id,
        start_date: new Date().toISOString().split('T')[0],
      })
    } else {
      // Ending the pause
      await supabase.from('habit_pauses')
        .update({ end_date: new Date().toISOString().split('T')[0] })
        .eq('habit_id', habit.id)
        .is('end_date', null)
    }
    startTransition(() => router.refresh())
  }

  async function archiveHabit(habit: Habit) {
    await supabase.from('habits')
      .update({ is_archived: !habit.is_archived, updated_at: new Date().toISOString() })
      .eq('id', habit.id)
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      <Button onClick={() => { setEditingHabit(null); setShowForm(true) }}>
        <Plus size={16} /> New Habit
      </Button>

      {/* Active habits */}
      {active.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#2a2a3a] rounded-2xl">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="font-semibold text-[#e8e8f0] mb-1">No habits yet</h3>
          <p className="text-sm text-[#8888a8]">Click &quot;New Habit&quot; to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map(habit => {
            const streak = streakMap.get(habit.id)
            return (
              <div
                key={habit.id}
                className="flex items-center gap-4 px-4 py-4 rounded-xl border border-[#2a2a3a] bg-[#111118] hover:border-indigo-500/20 transition-all"
              >
                {/* Color dot */}
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: habit.color }}
                />

                {/* Icon */}
                <span className="text-xl shrink-0">{habit.icon}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      'font-medium text-sm',
                      habit.is_paused ? 'text-[#8888a8]' : 'text-[#e8e8f0]'
                    )}>
                      {habit.name}
                    </span>
                    {habit.is_paused && <Badge variant="muted">Paused</Badge>}
                    {habit.completion_levels.length > 1 && (
                      <Badge variant="muted">Levels</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-[#4a4a6a]">
                    <span>{scheduleLabel(habit.schedule_type ?? '', habit.schedule_config as Record<string, unknown>)}</span>
                    <span>·</span>
                    <span>{difficultyLabel(habit.difficulty)}</span>
                    {habit.note_template && (
                      <>
                        <span>·</span>
                        <span>Template set</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Streak */}
                {(streak?.current_streak ?? 0) > 0 && (
                  <div className="flex items-center gap-1 text-orange-400 shrink-0">
                    <Flame size={14} />
                    <span className="text-xs font-bold">{streak!.current_streak}</span>
                  </div>
                )}

                {/* Actions */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreHorizontal size={16} />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="z-50 min-w-[160px] bg-[#1a1a25] border border-[#2a2a3a] rounded-xl p-1 shadow-xl"
                      align="end"
                    >
                      <DropdownMenu.Item
                        onClick={() => { setEditingHabit(habit); setShowForm(true) }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-[#e8e8f0] rounded-lg cursor-pointer hover:bg-white/5 outline-none"
                      >
                        <Pencil size={14} /> Edit
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onClick={() => togglePause(habit)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-[#e8e8f0] rounded-lg cursor-pointer hover:bg-white/5 outline-none"
                      >
                        {habit.is_paused ? <Play size={14} /> : <Pause size={14} />}
                        {habit.is_paused ? 'Resume' : 'Pause'}
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onClick={() => archiveHabit(habit)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-yellow-400 rounded-lg cursor-pointer hover:bg-white/5 outline-none"
                      >
                        <Archive size={14} /> Archive
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            )
          })}
        </div>
      )}

      {/* Archived */}
      {archived.length > 0 && (
        <details className="group">
          <summary className="text-xs text-[#4a4a6a] cursor-pointer hover:text-[#8888a8] select-none">
            {archived.length} archived habit{archived.length > 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-2 opacity-50">
            {archived.map(habit => (
              <div key={habit.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#2a2a3a]">
                <span>{habit.icon}</span>
                <span className="text-sm text-[#8888a8] line-through">{habit.name}</span>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => archiveHabit(habit)}>
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Form Dialog */}
      <HabitFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditingHabit(null) }}
        habit={editingHabit}
        userId={userId}
        itemType="habit"
      />
    </div>
  )
}
