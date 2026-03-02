// ============================================================
// GrindKeeper - Core TypeScript Types
// ============================================================

export type ScheduleType = 'daily' | 'x_per_week' | 'every_n_days' | 'specific_days'
export type ItemType = 'habit' | 'event'
export type CompletionLevel = 'normal' | 'light' | 'crisis'
export type NotificationType = 'reminder' | 'streak_milestone' | 'streak_broken' | 'weekly_summary' | 'escalation'

export interface ScheduleConfig {
  times?: number       // for x_per_week
  n?: number           // for every_n_days
  days?: number[]      // for specific_days: 0=Mon, 6=Sun
}

export interface CompletionLevelDef {
  key: CompletionLevel
  label: string
}

export interface Profile {
  id: string
  display_name: string | null
  timezone: string
  grace_days_per_month: number
  daily_energy_budget: number
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  created_at: string
  updated_at: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  description: string | null
  item_type: ItemType
  schedule_type: ScheduleType | null
  schedule_config: ScheduleConfig
  difficulty: number
  color: string
  icon: string
  completion_levels: CompletionLevelDef[]
  note_template: string | null
  is_paused: boolean
  is_archived: boolean
  grace_days_remaining: number
  grace_days_reset_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Completion {
  id: string
  user_id: string
  habit_id: string
  completion_date: string  // YYYY-MM-DD
  completed_at: string     // ISO timestamp
  level: CompletionLevel
  note: string | null
  is_backfill: boolean
  created_at: string
}

export interface Streak {
  id: string
  user_id: string
  habit_id: string
  current_streak: number
  longest_streak: number
  last_completion_date: string | null
  grace_days_used_this_month: number
  grace_month: string | null
  updated_at: string
}

export interface HabitPause {
  id: string
  user_id: string
  habit_id: string
  start_date: string
  end_date: string | null
  reason: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  habit_id: string | null
  type: NotificationType
  title: string
  message: string
  read_at: string | null
  snoozed_until: string | null
  created_at: string
}

export interface NotificationSetting {
  id: string
  user_id: string
  habit_id: string
  enabled: boolean
  reminder_time: string | null  // HH:MM
  use_smart_window: boolean
  escalation_time: string | null
  email_enabled: boolean
  created_at: string
  updated_at: string
}

export interface WeeklyReflection {
  id: string
  user_id: string
  week_start_date: string
  note: string
  mood: number | null
  created_at: string
  updated_at: string
}

// ============================================================
// Derived / Computed types for UI
// ============================================================

export interface HabitWithStreak extends Habit {
  streak?: Streak
  today_completion?: Completion | null
}

export interface DayStats {
  date: string
  completions: Completion[]
  habits_due: Habit[]
  completion_rate: number
  total_energy: number
}

export interface HabitStats {
  habit_id: string
  current_streak: number
  longest_streak: number
  completion_rate_7d: number
  completion_rate_30d: number
  completion_rate_90d: number
  best_day_of_week: number | null  // 0=Mon
  most_missed_day: number | null
  last_completed: string | null
  avg_interval_days: number | null  // for events
}

export interface WeeklyStats {
  week_start: string
  consistency_score: number  // 0-100
  no_zero_days: number
  total_completions: number
  trend_vs_prev: 'up' | 'down' | 'same'
}

// ============================================================
// Form types
// ============================================================

export interface HabitFormData {
  name: string
  description: string
  item_type: ItemType
  schedule_type: ScheduleType
  schedule_config: ScheduleConfig
  difficulty: number
  color: string
  icon: string
  completion_levels: CompletionLevelDef[]
  note_template: string
}

export interface CompletionFormData {
  habit_id: string
  completion_date: string
  level: CompletionLevel
  note: string
  is_backfill: boolean
}
