// ============================================================
// GrindKeeper - Streak Calculation Engine
//
// ALGORITHM OVERVIEW:
// 1. For each habit, determine the "period" based on schedule type:
//    - daily: each day is a period
//    - x_per_week: each Mon-Sun week is a period
//    - every_n_days: rolling N-day windows
//    - specific_days: only scheduled days matter
//
// 2. Walk backwards from today, checking if each period was met.
//    - If met: increment streak counter
//    - If missed AND grace days available: use one grace day, keep streak
//    - If missed AND no grace days: streak breaks
//
// EDGE CASES:
// - Timezone boundaries: all dates are stored as DATE (user's timezone)
// - Schedule edits: changing schedule only affects future (default policy)
// - Backfills: counted as normal completions for streak purposes
// - Pauses: paused days are skipped (don't count as met OR missed)
// - Same-day multiple completions: only one counts
// ============================================================

import { Habit, Completion, HabitPause, ScheduleConfig } from '@/types'
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  subDays,
  addDays,
  differenceInDays,
  getDay,
  eachDayOfInterval,
  startOfMonth,
  isBefore,
  isAfter,
  isEqual,
} from 'date-fns'

// ============================================================
// Core: Is a date required for a given schedule?
// ============================================================
export function isDateRequired(
  date: Date,
  scheduleType: string,
  scheduleConfig: ScheduleConfig
): boolean {
  switch (scheduleType) {
    case 'daily':
      return true

    case 'specific_days': {
      // days: 0=Mon, 1=Tue, ..., 6=Sun
      // date-fns getDay: 0=Sun, 1=Mon, ..., 6=Sat
      const dayOfWeek = getDay(date) // 0=Sun
      const normalizedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 0=Mon, 6=Sun
      return (scheduleConfig.days ?? []).includes(normalizedDay)
    }

    case 'x_per_week':
      // All days are potentially required; the week determines met/unmet
      return true

    case 'every_n_days':
      // Not applicable per-day; handled in period check
      return true

    default:
      return false
  }
}

// ============================================================
// Core: Was a period "met" by completions?
// ============================================================
export function wasPeriodMet(
  date: Date,
  scheduleType: string,
  scheduleConfig: ScheduleConfig,
  completionDates: Set<string>
): boolean {
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd')

  switch (scheduleType) {
    case 'daily':
      return completionDates.has(fmt(date))

    case 'specific_days': {
      const dayOfWeek = getDay(date)
      const normalizedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      if (!(scheduleConfig.days ?? []).includes(normalizedDay)) {
        return true // Not a required day, skip
      }
      return completionDates.has(fmt(date))
    }

    case 'x_per_week': {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 }) // Monday
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
      const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })
      const completionsThisWeek = daysInWeek.filter(d => completionDates.has(fmt(d))).length
      return completionsThisWeek >= (scheduleConfig.times ?? 1)
    }

    case 'every_n_days': {
      const n = scheduleConfig.n ?? 1
      // Check if there's a completion within the last N days
      for (let i = 0; i < n; i++) {
        if (completionDates.has(fmt(subDays(date, i)))) return true
      }
      return false
    }

    default:
      return false
  }
}

// ============================================================
// Core: Get unique periods to check for streak
// For daily/specific_days: each day
// For x_per_week: each week (represented by Monday)
// For every_n_days: rolling windows
// ============================================================
function getPeriodsToCheck(
  scheduleType: string,
  scheduleConfig: ScheduleConfig,
  today: Date,
  daysBack: number = 365
): Date[] {
  const periods: Date[] = []

  switch (scheduleType) {
    case 'daily':
    case 'specific_days':
      for (let i = 0; i <= daysBack; i++) {
        periods.push(subDays(today, i))
      }
      break

    case 'x_per_week': {
      // Get Mondays going back
      let current = startOfWeek(today, { weekStartsOn: 1 })
      for (let i = 0; i < Math.ceil(daysBack / 7); i++) {
        periods.push(current)
        current = subDays(current, 7)
      }
      break
    }

    case 'every_n_days': {
      const n = scheduleConfig.n ?? 1
      for (let i = 0; i <= daysBack; i += n) {
        periods.push(subDays(today, i))
      }
      break
    }
  }

  return periods
}

// ============================================================
// Check if a date falls within any pause period
// ============================================================
export function isDatePaused(date: Date, pauses: HabitPause[]): boolean {
  const dateStr = format(date, 'yyyy-MM-dd')
  return pauses.some(pause => {
    const startDate = parseISO(pause.start_date)
    const endDate = pause.end_date ? parseISO(pause.end_date) : new Date()
    return dateStr >= pause.start_date &&
      (pause.end_date === null || dateStr <= pause.end_date)
  })
}

// ============================================================
// Main: Calculate current streak for a habit
// ============================================================
export interface StreakResult {
  currentStreak: number
  longestStreak: number
  graceDaysUsed: number
  lastCompletionDate: string | null
  isActiveToday: boolean
  todayMet: boolean
}

export function calculateStreak(
  habit: Pick<Habit, 'schedule_type' | 'schedule_config' | 'created_at'>,
  completions: Completion[],
  pauses: HabitPause[],
  graceDaysPerMonth: number,
  today: Date = new Date()
): StreakResult {
  if (!habit.schedule_type) {
    // Event type - no streak
    return {
      currentStreak: 0, longestStreak: 0, graceDaysUsed: 0,
      lastCompletionDate: completions[0]?.completion_date ?? null,
      isActiveToday: false, todayMet: false,
    }
  }

  const completionDates = new Set(completions.map(c => c.completion_date))
  const lastCompletion = completions.sort((a, b) =>
    b.completion_date.localeCompare(a.completion_date)
  )[0]

  const periods = getPeriodsToCheck(
    habit.schedule_type,
    habit.schedule_config,
    today,
    365
  )

  let currentStreak = 0
  let longestStreak = 0
  let runningStreak = 0
  let graceDaysUsed = 0
  let currentGraceMonth: string | null = null

  for (const period of periods) {
    // Don't count periods before habit was created
    if (isBefore(period, parseISO(habit.created_at))) break

    // Skip paused periods
    if (isDatePaused(period, pauses)) {
      runningStreak++ // Pause days don't break streak (counted as met)
      continue
    }

    const isPeriodMet = wasPeriodMet(
      period,
      habit.schedule_type,
      habit.schedule_config,
      completionDates
    )

    // For specific_days, skip non-required days
    if (habit.schedule_type === 'specific_days') {
      const dayOfWeek = getDay(period)
      const normalizedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      if (!(habit.schedule_config.days ?? []).includes(normalizedDay)) {
        if (runningStreak > 0) runningStreak++ // Non-required day, don't break
        continue
      }
    }

    if (isPeriodMet) {
      runningStreak++
      if (runningStreak > longestStreak) longestStreak = runningStreak
    } else {
      // Try grace day
      const periodMonth = format(period, 'yyyy-MM')
      if (currentGraceMonth !== periodMonth) {
        currentGraceMonth = periodMonth
        graceDaysUsed = 0
      }

      if (graceDaysUsed < graceDaysPerMonth) {
        graceDaysUsed++
        runningStreak++ // Grace day used, streak continues
      } else {
        // Streak broken
        if (runningStreak > longestStreak) longestStreak = runningStreak
        if (currentStreak === 0 && periods.indexOf(period) > 0) {
          currentStreak = runningStreak
        }
        break
      }
    }
  }

  if (currentStreak === 0) currentStreak = runningStreak
  if (runningStreak > longestStreak) longestStreak = runningStreak

  const todayStr = format(today, 'yyyy-MM-dd')
  const todayMet = wasPeriodMet(today, habit.schedule_type, habit.schedule_config, completionDates)

  return {
    currentStreak,
    longestStreak,
    graceDaysUsed,
    lastCompletionDate: lastCompletion?.completion_date ?? null,
    isActiveToday: completionDates.has(todayStr),
    todayMet,
  }
}

// ============================================================
// Stats: Completion rate for a date range
// ============================================================
export function completionRate(
  completions: Completion[],
  habit: Pick<Habit, 'schedule_type' | 'schedule_config'>,
  days: number,
  today: Date = new Date()
): number {
  if (!habit.schedule_type) return 0

  const completionDates = new Set(completions.map(c => c.completion_date))
  const start = subDays(today, days - 1)
  const allDays = eachDayOfInterval({ start, end: today })

  let required = 0
  let met = 0

  for (const day of allDays) {
    if (habit.schedule_type === 'specific_days') {
      const dayOfWeek = getDay(day)
      const normalizedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      if (!(habit.schedule_config.days ?? []).includes(normalizedDay)) continue
    }
    required++
    if (completionDates.has(format(day, 'yyyy-MM-dd'))) met++
  }

  if (habit.schedule_type === 'x_per_week') {
    // Calculate by week
    const weeks = Math.ceil(days / 7)
    let weeksMet = 0
    for (let w = 0; w < weeks; w++) {
      const weekEnd = subDays(today, w * 7)
      const weekStart = startOfWeek(weekEnd, { weekStartsOn: 1 })
      const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })
      const count = daysInWeek.filter(d => completionDates.has(format(d, 'yyyy-MM-dd'))).length
      if (count >= (habit.schedule_config.times ?? 1)) weeksMet++
    }
    return weeks > 0 ? Math.round((weeksMet / weeks) * 100) : 0
  }

  return required > 0 ? Math.round((met / required) * 100) : 0
}

// ============================================================
// Stats: Best and most missed days of week
// ============================================================
export function dayOfWeekStats(completions: Completion[]): {
  bestDay: number | null
  mostMissedDay: number | null
} {
  const dayCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }

  for (const c of completions) {
    const date = parseISO(c.completion_date)
    const dayOfWeek = getDay(date)
    const normalized = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    dayCount[normalized]++
  }

  const entries = Object.entries(dayCount).map(([day, count]) => ({
    day: parseInt(day), count
  }))
  entries.sort((a, b) => b.count - a.count)

  return {
    bestDay: entries[0]?.day ?? null,
    mostMissedDay: entries[entries.length - 1]?.day ?? null,
  }
}

// ============================================================
// Stats: Average interval for events (sporadic)
// ============================================================
export function avgEventInterval(completions: Completion[]): number | null {
  if (completions.length < 2) return null

  const sorted = [...completions].sort((a, b) =>
    a.completion_date.localeCompare(b.completion_date)
  )

  let totalDays = 0
  for (let i = 1; i < sorted.length; i++) {
    const prev = parseISO(sorted[i - 1].completion_date)
    const curr = parseISO(sorted[i].completion_date)
    totalDays += differenceInDays(curr, prev)
  }

  return Math.round(totalDays / (sorted.length - 1))
}

// ============================================================
// Stats: No-zero days (days with at least one completion)
// ============================================================
export function noZeroDays(completions: Completion[], days: number, today: Date = new Date()): number {
  const datesWithCompletions = new Set(completions.map(c => c.completion_date))
  const start = subDays(today, days - 1)
  const allDays = eachDayOfInterval({ start, end: today })
  return allDays.filter(d => datesWithCompletions.has(format(d, 'yyyy-MM-dd'))).length
}

// ============================================================
// Stats: Weekly consistency score (0-100)
// ============================================================
export function weeklyConsistencyScore(
  habits: Array<Pick<Habit, 'schedule_type' | 'schedule_config'>>,
  completions: Completion[],
  weekStart: Date
): number {
  if (habits.length === 0) return 0

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const completionDates = new Set(completions.map(c => c.completion_date))

  let totalRequired = 0
  let totalMet = 0

  for (const habit of habits) {
    if (!habit.schedule_type) continue

    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })
    for (const day of daysInWeek) {
      if (isAfter(day, new Date())) continue // Don't count future days

      if (habit.schedule_type === 'specific_days') {
        const dayOfWeek = getDay(day)
        const normalized = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        if (!(habit.schedule_config.days ?? []).includes(normalized)) continue
      }

      if (habit.schedule_type === 'x_per_week') continue // Handled separately

      totalRequired++
      if (completionDates.has(format(day, 'yyyy-MM-dd'))) totalMet++
    }

    if (habit.schedule_type === 'x_per_week') {
      totalRequired += habit.schedule_config.times ?? 1
      const daysCount = daysInWeek.filter(d =>
        !isAfter(d, new Date()) && completionDates.has(format(d, 'yyyy-MM-dd'))
      ).length
      totalMet += Math.min(daysCount, habit.schedule_config.times ?? 1)
    }
  }

  return totalRequired > 0 ? Math.round((totalMet / totalRequired) * 100) : 0
}

// ============================================================
// Utils: Format streak for display
// ============================================================
export function formatStreak(days: number): string {
  if (days === 0) return 'No streak'
  if (days === 1) return '1 day'
  if (days < 7) return `${days} days`
  if (days < 30) return `${Math.floor(days / 7)}w ${days % 7}d`
  return `${Math.floor(days / 30)}mo ${Math.floor((days % 30) / 7)}w`
}

// ============================================================
// Utils: Suggest anti-zero-day habit (smallest energy cost)
// ============================================================
export function suggestAntiZeroHabit(
  habits: Habit[],
  todayCompletions: Completion[]
): Habit | null {
  const completedIds = new Set(todayCompletions.map(c => c.habit_id))
  const pending = habits.filter(
    h => !completedIds.has(h.id) && h.item_type === 'habit' && !h.is_paused && !h.is_archived
  )
  if (pending.length === 0) return null
  return pending.sort((a, b) => a.difficulty - b.difficulty)[0]
}
