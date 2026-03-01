import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO, startOfWeek } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt)
}

export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

export function getDayName(dayIndex: number): string {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return days[dayIndex] ?? ''
}

export function getDayNameFull(dayIndex: number): string {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  return days[dayIndex] ?? ''
}

export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function heatmapColor(rate: number): string {
  if (rate === 0) return 'bg-zinc-800'
  if (rate < 25) return 'bg-indigo-900/60'
  if (rate < 50) return 'bg-indigo-700/70'
  if (rate < 75) return 'bg-indigo-500/80'
  return 'bg-indigo-400'
}

export function energyColor(used: number, max: number): string {
  const pct = (used / max) * 100
  if (pct < 60) return 'text-green-400'
  if (pct < 85) return 'text-yellow-400'
  return 'text-red-400'
}

export function difficultyLabel(n: number): string {
  return ['', 'Easy', 'Light', 'Moderate', 'Hard', 'Intense'][n] ?? ''
}

export function scheduleLabel(type: string, config: Record<string, unknown>): string {
  switch (type) {
    case 'daily': return 'Every day'
    case 'x_per_week': return `${config.times}× per week`
    case 'every_n_days': return `Every ${config.n} days`
    case 'specific_days': {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      const selected = ((config.days as number[]) ?? []).map(d => days[d])
      return selected.join(', ')
    }
    default: return type
  }
}

export const HABIT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#f59e0b', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6', '#64748b', '#84cc16',
]

export const HABIT_ICONS = [
  '✓', '💪', '📚', '🧘', '🌍', '💧', '🏃', '🎯',
  '💊', '🍎', '😴', '✍️', '🎵', '🏥', '💻', '🌿',
]
