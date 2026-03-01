-- ============================================================
-- GrindKeeper MVP - Initial Schema Migration
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users with app-specific settings)
-- ============================================================
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  timezone      TEXT NOT NULL DEFAULT 'Europe/Warsaw',
  grace_days_per_month INT NOT NULL DEFAULT 2,
  daily_energy_budget  INT NOT NULL DEFAULT 20,
  quiet_hours_start    TIME DEFAULT '22:00',
  quiet_hours_end      TIME DEFAULT '07:00',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- HABITS (both routine habits and sporadic events)
-- ============================================================
CREATE TABLE public.habits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  -- 'habit' = recurring, 'event' = sporadic/one-off logs
  item_type       TEXT NOT NULL DEFAULT 'habit' CHECK (item_type IN ('habit', 'event')),
  -- Schedule types (only relevant for item_type = 'habit')
  schedule_type   TEXT CHECK (schedule_type IN ('daily', 'x_per_week', 'every_n_days', 'specific_days')),
  schedule_config JSONB NOT NULL DEFAULT '{}',
  -- Difficulty 1-5 for energy budget
  difficulty      INT NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  color           TEXT NOT NULL DEFAULT '#6366f1',
  icon            TEXT NOT NULL DEFAULT '✓',
  -- Completion levels: JSON array of {key, label} e.g. [{key:'normal',label:'Done'},{key:'light',label:'Light'},{key:'crisis',label:'Crisis mode'}]
  completion_levels JSONB NOT NULL DEFAULT '[{"key":"normal","label":"Done"}]',
  -- Note template for quick notes
  note_template   TEXT,
  -- Paused: tracks if habit is currently paused
  is_paused       BOOLEAN NOT NULL DEFAULT false,
  is_archived     BOOLEAN NOT NULL DEFAULT false,
  -- Grace days budget resets monthly
  grace_days_remaining INT NOT NULL DEFAULT 0,
  grace_days_reset_at  DATE,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_habits_user_id ON public.habits(user_id);
CREATE INDEX idx_habits_item_type ON public.habits(item_type);
CREATE INDEX idx_habits_is_archived ON public.habits(is_archived);

-- ============================================================
-- COMPLETIONS (each check-off of a habit or event log)
-- ============================================================
CREATE TABLE public.completions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id      UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  -- The date this completion is for (in user's timezone, stored as date)
  completion_date DATE NOT NULL,
  -- The actual timestamp
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Completion level: normal / light / crisis
  level         TEXT NOT NULL DEFAULT 'normal' CHECK (level IN ('normal', 'light', 'crisis')),
  -- Optional note
  note          TEXT,
  -- Whether this was added retroactively
  is_backfill   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_completions_user_id ON public.completions(user_id);
CREATE INDEX idx_completions_habit_id ON public.completions(habit_id);
CREATE INDEX idx_completions_date ON public.completions(completion_date);
CREATE INDEX idx_completions_user_date ON public.completions(user_id, completion_date);
-- Unique: one completion per habit per day (for habits; events can have multiple)
-- We enforce this in application logic / per item_type

-- ============================================================
-- STREAKS (pre-computed streak data per habit)
-- ============================================================
CREATE TABLE public.streaks (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id              UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  current_streak        INT NOT NULL DEFAULT 0,
  longest_streak        INT NOT NULL DEFAULT 0,
  last_completion_date  DATE,
  grace_days_used_this_month INT NOT NULL DEFAULT 0,
  grace_month           DATE, -- first day of month when grace was last used
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, habit_id)
);

CREATE INDEX idx_streaks_user_id ON public.streaks(user_id);
CREATE INDEX idx_streaks_habit_id ON public.streaks(habit_id);

-- ============================================================
-- HABIT PAUSES (pausing a habit prevents streak penalty)
-- ============================================================
CREATE TABLE public.habit_pauses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id    UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  start_date  DATE NOT NULL,
  end_date    DATE,  -- NULL means paused indefinitely
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_habit_pauses_habit_id ON public.habit_pauses(habit_id);

-- ============================================================
-- NOTIFICATIONS (in-app notification center)
-- ============================================================
CREATE TABLE public.notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id        UUID REFERENCES public.habits(id) ON DELETE SET NULL,
  type            TEXT NOT NULL CHECK (type IN ('reminder', 'streak_milestone', 'streak_broken', 'weekly_summary', 'escalation')),
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  read_at         TIMESTAMPTZ,
  snoozed_until   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read_at ON public.notifications(user_id, read_at) WHERE read_at IS NULL;

-- ============================================================
-- NOTIFICATION SETTINGS (per-habit reminder config)
-- ============================================================
CREATE TABLE public.notification_settings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id            UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  enabled             BOOLEAN NOT NULL DEFAULT true,
  -- fixed time reminder (e.g. '19:00')
  reminder_time       TIME,
  -- smart window: system picks time based on user history
  use_smart_window    BOOLEAN NOT NULL DEFAULT false,
  -- escalation: if not done by this time, send another reminder
  escalation_time     TIME,
  -- email reminders
  email_enabled       BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, habit_id)
);

CREATE INDEX idx_notification_settings_habit_id ON public.notification_settings(habit_id);

-- ============================================================
-- WEEKLY REFLECTIONS
-- ============================================================
CREATE TABLE public.weekly_reflections (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Monday of the week
  week_start_date DATE NOT NULL,
  note            TEXT NOT NULL DEFAULT '',
  mood            INT CHECK (mood BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start_date)
);

CREATE INDEX idx_weekly_reflections_user_id ON public.weekly_reflections(user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_habits_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_weekly_reflections_updated_at
  BEFORE UPDATE ON public.weekly_reflections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
