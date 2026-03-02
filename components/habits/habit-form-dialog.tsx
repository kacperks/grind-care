'use client'

import { useState, useEffect, useTransition } from 'react'
import { Habit, HabitFormData, ScheduleType, ItemType, CompletionLevelDef } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { HABIT_COLORS, HABIT_ICONS, getDayName } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Plus, Minus } from 'lucide-react'

const DEFAULT_FORM: HabitFormData = {
  name: '',
  description: '',
  item_type: 'habit',
  schedule_type: 'daily',
  schedule_config: {},
  difficulty: 3,
  color: '#6366f1',
  icon: '✓',
  completion_levels: [{ key: 'normal', label: 'Done' }],
  note_template: '',
}

interface HabitFormDialogProps {
  open: boolean
  onClose: () => void
  habit?: Habit | null
  userId: string
  itemType?: ItemType
}

export function HabitFormDialog({ open, onClose, habit, userId, itemType = 'habit' }: HabitFormDialogProps) {
  const [form, setForm] = useState<HabitFormData>({ ...DEFAULT_FORM, item_type: itemType })
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (habit) {
      setForm({
        name: habit.name,
        description: habit.description ?? '',
        item_type: habit.item_type,
        schedule_type: habit.schedule_type ?? 'daily',
        schedule_config: habit.schedule_config ?? {},
        difficulty: habit.difficulty,
        color: habit.color,
        icon: habit.icon,
        completion_levels: habit.completion_levels,
        note_template: habit.note_template ?? '',
      })
    } else {
      setForm({ ...DEFAULT_FORM, item_type: itemType })
    }
  }, [habit, itemType, open])

  function setField<K extends keyof HabitFormData>(key: K, value: HabitFormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function toggleDay(day: number) {
    const days = (form.schedule_config.days ?? []) as number[]
    const updated = days.includes(day) ? days.filter(d => d !== day) : [...days, day]
    setField('schedule_config', { ...form.schedule_config, days: updated })
  }

  function addLevel() {
    if (form.completion_levels.length >= 3) return
    const keys: Array<'normal' | 'light' | 'crisis'> = ['normal', 'light', 'crisis']
    const nextKey = keys[form.completion_levels.length]
    setField('completion_levels', [...form.completion_levels, { key: nextKey, label: nextKey.charAt(0).toUpperCase() + nextKey.slice(1) }])
  }

  function updateLevel(index: number, label: string) {
    const updated = [...form.completion_levels]
    updated[index] = { ...updated[index], label }
    setField('completion_levels', updated)
  }

  function removeLevel(index: number) {
    if (index === 0) return
    setField('completion_levels', form.completion_levels.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return

    const payload = {
      user_id: userId,
      name: form.name.trim(),
      description: form.description || null,
      item_type: form.item_type,
      schedule_type: form.item_type === 'event' ? null : form.schedule_type,
      schedule_config: form.item_type === 'event' ? {} : form.schedule_config,
      difficulty: form.difficulty,
      color: form.color,
      icon: form.icon,
      completion_levels: form.completion_levels,
      note_template: form.note_template || null,
      updated_at: new Date().toISOString(),
    }

    if (habit) {
      await supabase.from('habits').update(payload).eq('id', habit.id)
    } else {
      const { data: newHabit } = await supabase.from('habits').insert(payload).select().single()
      if (newHabit) {
        await supabase.from('streaks').insert({
          user_id: userId,
          habit_id: newHabit.id,
          current_streak: 0,
          longest_streak: 0,
        })
      }
    }

    onClose()
    startTransition(() => router.refresh())
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent
        title={habit ? 'Edit Habit' : `New ${itemType === 'event' ? 'Event' : 'Habit'}`}
        description={itemType === 'event' ? 'Track a sporadic activity or event' : 'Define a recurring routine'}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <Input
            label="Name"
            value={form.name}
            onChange={e => setField('name', e.target.value)}
            placeholder={itemType === 'event' ? 'e.g. Doctor visit' : 'e.g. Morning workout'}
            required
            autoFocus
          />

          {/* Icon + Color */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#8888a8] uppercase tracking-wide">Icon</label>
            <div className="flex flex-wrap gap-2">
              {HABIT_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setField('icon', icon)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all border ${
                    form.icon === icon
                      ? 'border-indigo-500 bg-indigo-500/20'
                      : 'border-[#2a2a3a] hover:border-[#4a4a6a]'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[#8888a8] uppercase tracking-wide">Color</label>
            <div className="flex flex-wrap gap-2">
              {HABIT_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setField('color', color)}
                  className={`w-7 h-7 rounded-full transition-all border-2 ${
                    form.color === color ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Schedule (only for habits) */}
          {form.item_type === 'habit' && (
            <div className="space-y-3">
              <label className="text-xs font-medium text-[#8888a8] uppercase tracking-wide">Schedule</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['daily', 'Every day'],
                  ['x_per_week', 'X per week'],
                  ['every_n_days', 'Every N days'],
                  ['specific_days', 'Specific days'],
                ] as [ScheduleType, string][]).map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setField('schedule_type', type)}
                    className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                      form.schedule_type === type
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                        : 'border-[#2a2a3a] text-[#8888a8] hover:border-[#4a4a6a]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {form.schedule_type === 'x_per_week' && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#8888a8]">Times per week:</span>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={form.schedule_config.times ?? 5}
                    onChange={e => setField('schedule_config', { times: parseInt(e.target.value) })}
                    className="w-16 bg-[#111118] border border-[#2a2a3a] rounded-lg px-2 py-1 text-sm text-center"
                  />
                </div>
              )}

              {form.schedule_type === 'every_n_days' && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#8888a8]">Every</span>
                  <input
                    type="number"
                    min={2}
                    max={30}
                    value={form.schedule_config.n ?? 2}
                    onChange={e => setField('schedule_config', { n: parseInt(e.target.value) })}
                    className="w-16 bg-[#111118] border border-[#2a2a3a] rounded-lg px-2 py-1 text-sm text-center"
                  />
                  <span className="text-sm text-[#8888a8]">days</span>
                </div>
              )}

              {form.schedule_type === 'specific_days' && (
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5, 6].map(day => {
                    const selected = (form.schedule_config.days ?? []).includes(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                          selected
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                            : 'border-[#2a2a3a] text-[#4a4a6a] hover:border-[#4a4a6a]'
                        }`}
                      >
                        {getDayName(day)}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Difficulty */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#8888a8] uppercase tracking-wide">
              Difficulty (energy cost): {form.difficulty}/5
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={form.difficulty}
              onChange={e => setField('difficulty', parseInt(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-[#4a4a6a]">
              <span>Easy</span><span>Medium</span><span>Intense</span>
            </div>
          </div>

          {/* Completion levels */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#8888a8] uppercase tracking-wide">
                Completion Levels
              </label>
              {form.completion_levels.length < 3 && (
                <button type="button" onClick={addLevel} className="text-xs text-indigo-400 hover:text-indigo-300">
                  + Add level
                </button>
              )}
            </div>
            <div className="space-y-2">
              {form.completion_levels.map((level, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-[#4a4a6a] w-12 shrink-0">{level.key}</span>
                  <input
                    type="text"
                    value={level.label}
                    onChange={e => updateLevel(i, e.target.value)}
                    className="flex-1 bg-[#111118] border border-[#2a2a3a] rounded-lg px-3 py-1.5 text-sm text-[#e8e8f0] focus:border-indigo-500 focus:outline-none"
                  />
                  {i > 0 && (
                    <button type="button" onClick={() => removeLevel(i)} className="text-[#4a4a6a] hover:text-red-400 p-1">
                      <Minus size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Note template */}
          <Input
            label="Note template (optional prompt for quick notes)"
            value={form.note_template}
            onChange={e => setField('note_template', e.target.value)}
            placeholder="e.g. Mood 1-5? What did you study?"
          />

          {/* Description */}
          <Textarea
            label="Description (optional)"
            value={form.description}
            onChange={e => setField('description', e.target.value)}
            placeholder="What is this habit about?"
            rows={2}
          />

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {habit ? 'Save Changes' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
