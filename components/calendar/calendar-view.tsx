'use client'

import { useState } from 'react'
import { Habit, Completion } from '@/types'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, parseISO, getDay, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, heatmapColor } from '@/lib/utils'
import { DayDetailPanel } from './day-detail-panel'

type ViewMode = 'month' | 'week' | 'day'

interface CalendarViewProps {
  habits: Habit[]
  completions: Completion[]
  initialView: ViewMode
  initialDate: string
  userId: string
}

export function CalendarView({ habits, completions, initialView, initialDate, userId }: CalendarViewProps) {
  const [view, setView] = useState<ViewMode>(initialView)
  const [currentDate, setCurrentDate] = useState(parseISO(initialDate))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Build completion map: date -> completions
  const completionsByDate = new Map<string, Completion[]>()
  for (const c of completions) {
    const list = completionsByDate.get(c.completion_date) ?? []
    list.push(c)
    completionsByDate.set(c.completion_date, list)
  }

  // Build date -> rate map for heatmap
  function getRateForDate(dateStr: string): number {
    const dayCompletions = completionsByDate.get(dateStr) ?? []
    const dayHabits = habits.filter(h => h.item_type === 'habit' && !h.is_archived)
    if (dayHabits.length === 0) return 0
    return Math.round((dayCompletions.length / dayHabits.length) * 100)
  }

  function navigatePrev() {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1))
    else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1))
    else setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n })
  }

  function navigateNext() {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1))
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1))
    else setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n })
  }

  const headerLabel = view === 'month'
    ? format(currentDate, 'MMMM yyyy')
    : view === 'week'
      ? `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')}–${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
      : format(currentDate, 'EEEE, MMMM d, yyyy')

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={navigatePrev}>
            <ChevronLeft size={16} />
          </Button>
          <span className="text-sm font-semibold text-[#e8e8f0] min-w-[200px] text-center">{headerLabel}</span>
          <Button variant="ghost" size="icon" onClick={navigateNext}>
            <ChevronRight size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
        </div>

        <div className="flex gap-1 bg-[#1a1a25] rounded-lg p-1">
          {(['month', 'week', 'day'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-all capitalize',
                view === v
                  ? 'bg-[#2a2a3a] text-[#e8e8f0]'
                  : 'text-[#8888a8] hover:text-[#e8e8f0]'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Month view */}
      {view === 'month' && (
        <MonthGrid
          currentDate={currentDate}
          completionsByDate={completionsByDate}
          getRateForDate={getRateForDate}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      )}

      {/* Week view */}
      {view === 'week' && (
        <WeekView
          currentDate={currentDate}
          habits={habits}
          completionsByDate={completionsByDate}
          getRateForDate={getRateForDate}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      )}

      {/* Day detail panel */}
      {selectedDate && (
        <DayDetailPanel
          date={selectedDate}
          habits={habits}
          completions={completionsByDate.get(selectedDate) ?? []}
          userId={userId}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
}

function MonthGrid({ currentDate, completionsByDate, getRateForDate, selectedDate, onSelectDate }: {
  currentDate: Date
  completionsByDate: Map<string, Completion[]>
  getRateForDate: (d: string) => number
  selectedDate: string | null
  onSelectDate: (d: string) => void
}) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="bg-[#111118] rounded-2xl border border-[#2a2a3a] overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[#2a2a3a]">
        {DAY_NAMES.map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-[#4a4a6a]">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isTodayDate = isToday(day)
          const rate = getRateForDate(dateStr)
          const comps = completionsByDate.get(dateStr) ?? []
          const isSelected = selectedDate === dateStr

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                'min-h-[80px] p-2 border-r border-b border-[#2a2a3a] last:border-r-0 text-left transition-all',
                !isCurrentMonth && 'opacity-30',
                isSelected && 'bg-indigo-500/10',
                isCurrentMonth && !isSelected && 'hover:bg-white/5'
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1',
                isTodayDate && 'bg-indigo-500 text-white',
                !isTodayDate && 'text-[#8888a8]'
              )}>
                {format(day, 'd')}
              </div>

              {/* Heatmap indicator */}
              {rate > 0 && (
                <div className={cn('w-full h-1.5 rounded-full mb-1', heatmapColor(rate))} />
              )}

              {/* Habit dots */}
              <div className="flex flex-wrap gap-0.5">
                {comps.slice(0, 6).map(c => (
                  <div key={c.id} className="w-1.5 h-1.5 rounded-full bg-green-500/70" />
                ))}
              </div>

              {comps.length > 6 && (
                <div className="text-[10px] text-[#4a4a6a]">+{comps.length - 6}</div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({ currentDate, habits, completionsByDate, getRateForDate, selectedDate, onSelectDate }: {
  currentDate: Date
  habits: Habit[]
  completionsByDate: Map<string, Completion[]>
  getRateForDate: (d: string) => number
  selectedDate: string | null
  onSelectDate: (d: string) => void
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) })

  return (
    <div className="bg-[#111118] rounded-2xl border border-[#2a2a3a] overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[#2a2a3a]">
        {weekDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const isTodayDate = isToday(day)
          const rate = getRateForDate(dateStr)
          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                'py-3 text-center border-r border-[#2a2a3a] last:border-r-0 hover:bg-white/5 transition-all',
                selectedDate === dateStr && 'bg-indigo-500/10'
              )}
            >
              <div className="text-xs text-[#4a4a6a]">{format(day, 'EEE')}</div>
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mx-auto mt-1',
                isTodayDate ? 'bg-indigo-500 text-white' : 'text-[#e8e8f0]'
              )}>
                {format(day, 'd')}
              </div>
              {rate > 0 && (
                <div className={cn('h-1 mx-2 mt-1 rounded-full', heatmapColor(rate))} />
              )}
            </button>
          )
        })}
      </div>

      {/* Habits rows */}
      <div className="overflow-x-auto">
        {habits.filter(h => h.item_type === 'habit').map(habit => (
          <div key={habit.id} className="grid grid-cols-7 border-b border-[#2a2a3a] last:border-b-0">
            <div className="col-span-7 grid grid-cols-7">
              {weekDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const comps = completionsByDate.get(dateStr) ?? []
                const done = comps.some(c => c.habit_id === habit.id)
                return (
                  <div
                    key={dateStr}
                    className={cn(
                      'py-3 border-r border-[#2a2a3a] last:border-r-0 flex items-center justify-center',
                    )}
                  >
                    {done ? (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                        style={{ backgroundColor: habit.color + '30', color: habit.color }}
                      >
                        {habit.icon}
                      </div>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-[#2a2a3a]" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-[#2a2a3a] flex flex-wrap gap-3">
        {habits.filter(h => h.item_type === 'habit').map(h => (
          <div key={h.id} className="flex items-center gap-1.5 text-xs text-[#8888a8]">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: h.color }} />
            {h.name}
          </div>
        ))}
      </div>
    </div>
  )
}
