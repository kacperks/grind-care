'use client'

import { Completion } from '@/types'
import { format, subDays, eachDayOfInterval, startOfWeek, getDay } from 'date-fns'
import { cn } from '@/lib/utils'

interface HabitHeatmapProps {
  completions: Completion[]
  color: string
  weeks?: number
}

export function HabitHeatmap({ completions, color, weeks = 12 }: HabitHeatmapProps) {
  const completionDates = new Set(completions.map(c => c.completion_date))
  const today = new Date()
  const start = subDays(today, weeks * 7 - 1)
  const days = eachDayOfInterval({ start, end: today })

  // Group by week
  const weeksData: string[][] = []
  let currentWeek: string[] = []

  // Fill leading empty days
  const firstDayOfWeek = getDay(start) === 0 ? 6 : getDay(start) - 1 // Mon=0
  for (let i = 0; i < firstDayOfWeek; i++) currentWeek.push('')

  for (const day of days) {
    const dateStr = format(day, 'yyyy-MM-dd')
    currentWeek.push(dateStr)
    const dow = getDay(day) === 0 ? 6 : getDay(day) - 1
    if (dow === 6) {
      weeksData.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) weeksData.push(currentWeek)

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {weeksData.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {Array(7).fill(0).map((_, di) => {
              const dateStr = week[di]
              if (!dateStr) return <div key={di} className="w-3 h-3" />
              const done = completionDates.has(dateStr)
              return (
                <div
                  key={di}
                  className={cn(
                    'w-3 h-3 rounded-sm transition-all',
                    done ? 'opacity-90' : 'bg-[#2a2a3a]'
                  )}
                  style={done ? { backgroundColor: color } : undefined}
                  title={dateStr}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-2 text-[10px] text-[#4a4a6a]">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-[#2a2a3a]" />
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color + '40' }} />
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
        <span>More</span>
      </div>
    </div>
  )
}
