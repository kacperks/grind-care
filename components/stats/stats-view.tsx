'use client'

import { Habit, Completion, Streak } from '@/types'
import {
  completionRate, noZeroDays, weeklyConsistencyScore,
  dayOfWeekStats, avgEventInterval, formatStreak
} from '@/lib/streak/calculator'
import { format, subDays, startOfWeek, parseISO } from 'date-fns'
import { Flame, TrendingUp, TrendingDown, Minus, Calendar, Award, Target } from 'lucide-react'
import { cn, getDayName, heatmapColor } from '@/lib/utils'
import { useState } from 'react'
import { HabitHeatmap } from './habit-heatmap'
import { ExportButton } from './export-button'

interface StatsViewProps {
  habits: Habit[]
  completions: Completion[]
  streakMap: Map<string, Streak>
}

export function StatsView({ habits, completions, streakMap }: StatsViewProps) {
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null)
  const today = new Date()

  // Global stats
  const noZero30 = noZeroDays(completions, 30, today)
  const noZero7 = noZeroDays(completions, 7, today)

  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 })
  const lastWeekStart = subDays(thisWeekStart, 7)

  const thisWeekScore = weeklyConsistencyScore(
    habits.filter(h => h.item_type === 'habit'),
    completions,
    thisWeekStart
  )
  const lastWeekScore = weeklyConsistencyScore(
    habits.filter(h => h.item_type === 'habit'),
    completions,
    lastWeekStart
  )

  const trend = thisWeekScore > lastWeekScore ? 'up' : thisWeekScore < lastWeekScore ? 'down' : 'same'
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-[#8888a8]'

  // Best streak across all habits
  const bestStreak = Math.max(...Array.from(streakMap.values()).map(s => s.longest_streak), 0)

  const selectedHabitData = selectedHabit ? habits.find(h => h.id === selectedHabit) : null
  const selectedCompletions = selectedHabit
    ? completions.filter(c => c.habit_id === selectedHabit)
    : []

  return (
    <div className="space-y-6">
      {/* Global summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Target size={18} className="text-indigo-400" />}
          label="Weekly Score"
          value={`${thisWeekScore}%`}
          sub={
            <span className={cn('flex items-center gap-1', trendColor)}>
              <TrendIcon size={12} />
              vs {lastWeekScore}% last week
            </span>
          }
        />
        <StatCard
          icon={<Calendar size={18} className="text-blue-400" />}
          label="No-Zero Days"
          value={`${noZero30}`}
          sub={<span className="text-[#4a4a6a]">last 30 days ({noZero7} this week)</span>}
        />
        <StatCard
          icon={<Flame size={18} className="text-orange-400" />}
          label="Best Streak Ever"
          value={formatStreak(bestStreak)}
          sub={<span className="text-[#4a4a6a]">across all habits</span>}
        />
        <StatCard
          icon={<Award size={18} className="text-yellow-400" />}
          label="Active Habits"
          value={`${habits.filter(h => h.item_type === 'habit' && !h.is_archived && !h.is_paused).length}`}
          sub={<span className="text-[#4a4a6a]">{habits.filter(h => h.is_paused).length} paused</span>}
        />
      </div>

      {/* Per-habit breakdown */}
      <div>
        <h2 className="text-sm font-semibold text-[#8888a8] uppercase tracking-wide mb-3">Per Habit</h2>
        <div className="space-y-2">
          {habits.filter(h => h.item_type === 'habit').map(habit => {
            const streak = streakMap.get(habit.id)
            const habitCompletions = completions.filter(c => c.habit_id === habit.id)
            const rate7 = completionRate(habitCompletions, habit, 7, today)
            const rate30 = completionRate(habitCompletions, habit, 30, today)
            const { bestDay, mostMissedDay } = dayOfWeekStats(habitCompletions)
            const isSelected = selectedHabit === habit.id

            return (
              <div
                key={habit.id}
                className={cn(
                  'rounded-xl border transition-all cursor-pointer',
                  isSelected
                    ? 'border-indigo-500/50 bg-indigo-500/5'
                    : 'border-[#2a2a3a] bg-[#111118] hover:border-[#3a3a4a]'
                )}
                onClick={() => setSelectedHabit(isSelected ? null : habit.id)}
              >
                <div className="flex items-center gap-3 p-4">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: habit.color }} />
                  <span className="text-base">{habit.icon}</span>
                  <span className="font-medium text-sm text-[#e8e8f0] flex-1">{habit.name}</span>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-center hidden sm:block">
                      <div className="font-semibold text-[#e8e8f0]">{rate7}%</div>
                      <div className="text-[#4a4a6a]">7d</div>
                    </div>
                    <div className="text-center hidden sm:block">
                      <div className="font-semibold text-[#e8e8f0]">{rate30}%</div>
                      <div className="text-[#4a4a6a]">30d</div>
                    </div>
                    {(streak?.current_streak ?? 0) > 0 && (
                      <div className="flex items-center gap-1 text-orange-400">
                        <Flame size={13} />
                        <span className="font-bold">{streak?.current_streak}</span>
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="px-4 pb-4 border-t border-[#2a2a3a]/50 pt-3 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <MiniStat label="Current streak" value={formatStreak(streak?.current_streak ?? 0)} />
                      <MiniStat label="Longest streak" value={formatStreak(streak?.longest_streak ?? 0)} />
                      <MiniStat label="90-day rate" value={`${completionRate(habitCompletions, habit, 90, today)}%`} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {bestDay !== null && <MiniStat label="Best day" value={getDayName(bestDay)} />}
                      {mostMissedDay !== null && <MiniStat label="Most missed" value={getDayName(mostMissedDay)} />}
                    </div>
                    <HabitHeatmap completions={habitCompletions} color={habit.color} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Events stats */}
      {habits.some(h => h.item_type === 'event') && (
        <div>
          <h2 className="text-sm font-semibold text-[#8888a8] uppercase tracking-wide mb-3">Events</h2>
          <div className="space-y-2">
            {habits.filter(h => h.item_type === 'event').map(event => {
              const eventCompletions = completions.filter(c => c.habit_id === event.id)
              const avg = avgEventInterval(eventCompletions)
              const last = eventCompletions[0]?.completion_date
              return (
                <div key={event.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#2a2a3a] bg-[#111118]">
                  <span>{event.icon}</span>
                  <span className="text-sm text-[#e8e8f0] flex-1">{event.name}</span>
                  <div className="text-xs text-[#4a4a6a] text-right">
                    {last ? `Last: ${format(parseISO(last), 'MMM d')}` : 'Never'}
                    {avg && <div>Avg: {avg}d interval</div>}
                    <div>{eventCompletions.length} total</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Export */}
      <div className="flex justify-end">
        <ExportButton habits={habits} completions={completions} />
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode
  label: string
  value: string
  sub: React.ReactNode
}) {
  return (
    <div className="bg-[#111118] rounded-xl border border-[#2a2a3a] p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-[#8888a8]">{label}</span>
      </div>
      <div className="text-xl font-bold text-[#e8e8f0]">{value}</div>
      <div className="text-xs mt-1">{sub}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0a0a0f] rounded-lg p-3">
      <div className="text-xs text-[#4a4a6a] mb-1">{label}</div>
      <div className="text-sm font-semibold text-[#e8e8f0]">{value}</div>
    </div>
  )
}
