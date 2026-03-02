'use client'

import { Habit, Completion } from '@/types'
import { suggestAntiZeroHabit } from '@/lib/streak/calculator'
import { cn } from '@/lib/utils'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'

interface AntiZeroBannerProps {
  habits: Habit[]
  completions: Completion[]
  className?: string
}

export function AntiZeroBanner({ habits, completions, className }: AntiZeroBannerProps) {
  const suggested = suggestAntiZeroHabit(habits, completions)
  if (!suggested || completions.length >= habits.filter(h => !h.is_paused).length) return null

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5',
      className
    )}>
      <Sparkles size={16} className="text-indigo-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#8888a8]">Smallest win to keep momentum:</p>
        <p className="text-sm font-medium text-[#e8e8f0] truncate">
          {suggested.icon} {suggested.name}
        </p>
      </div>
      <span className="text-xs text-[#4a4a6a] shrink-0">
        {'⚡'.repeat(suggested.difficulty)}
      </span>
    </div>
  )
}
