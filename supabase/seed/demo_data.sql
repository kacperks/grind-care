-- ============================================================
-- GrindKeeper - Demo/Seed Data
-- Run AFTER creating a user via Supabase Auth
-- Replace 'YOUR_USER_ID' with the actual auth.users UUID
-- ============================================================

-- To use: replace the UUID below with your actual user ID from auth.users
DO $$
DECLARE
  demo_user_id UUID := (SELECT id FROM auth.users LIMIT 1);
  h1 UUID; h2 UUID; h3 UUID; h4 UUID; h5 UUID;
  today DATE := CURRENT_DATE;
BEGIN
  IF demo_user_id IS NULL THEN
    RAISE NOTICE 'No users found. Create a user first via Supabase Auth.';
    RETURN;
  END IF;

  -- Update profile
  UPDATE public.profiles SET
    display_name = 'Demo User',
    timezone = 'Europe/Warsaw',
    grace_days_per_month = 2,
    daily_energy_budget = 20
  WHERE id = demo_user_id;

  -- Insert demo habits
  INSERT INTO public.habits (id, user_id, name, description, item_type, schedule_type, schedule_config, difficulty, color, icon, completion_levels, note_template, sort_order)
  VALUES
    (uuid_generate_v4(), demo_user_id, 'Morning Workout', 'Gym or home exercise session', 'habit', 'daily', '{}', 4, '#ef4444', '💪',
     '[{"key":"normal","label":"Full workout"},{"key":"light","label":"Short walk"},{"key":"crisis","label":"5 min stretch"}]',
     'Sets/reps? Energy level 1-5?', 1),
    (uuid_generate_v4(), demo_user_id, 'Read', 'Read at least 20 pages', 'habit', 'daily', '{}', 2, '#3b82f6', '📚',
     '[{"key":"normal","label":"20+ pages"},{"key":"light","label":"5-10 pages"},{"key":"crisis","label":"Few paragraphs"}]',
     'What did you read? Key insight?', 2),
    (uuid_generate_v4(), demo_user_id, 'Meditate', 'Mindfulness session', 'habit', 'x_per_week', '{"times":5}', 2, '#8b5cf6', '🧘',
     '[{"key":"normal","label":"20 min"},{"key":"light","label":"10 min"},{"key":"crisis","label":"2 min breathing"}]',
     'Mood before/after (1-5)?', 3),
    (uuid_generate_v4(), demo_user_id, 'Language Study', 'Polish/Spanish practice', 'habit', 'specific_days', '{"days":[1,3,5]}', 3, '#10b981', '🌍',
     '[{"key":"normal","label":"30+ min"},{"key":"light","label":"15 min"},{"key":"crisis","label":"Duolingo streak"}]',
     'Topics covered?', 4),
    (uuid_generate_v4(), demo_user_id, 'Doctor Visit', 'Track medical appointments', 'event', NULL, '{}', 1, '#f59e0b', '🏥',
     '[{"key":"normal","label":"Done"}]',
     'Which doctor? Anything to follow up?', 5)
  RETURNING id INTO h1;

  -- Get all inserted habit IDs
  SELECT id INTO h1 FROM public.habits WHERE user_id = demo_user_id AND name = 'Morning Workout';
  SELECT id INTO h2 FROM public.habits WHERE user_id = demo_user_id AND name = 'Read';
  SELECT id INTO h3 FROM public.habits WHERE user_id = demo_user_id AND name = 'Meditate';
  SELECT id INTO h4 FROM public.habits WHERE user_id = demo_user_id AND name = 'Language Study';

  -- Insert completions for the past 14 days (simulating real usage)
  INSERT INTO public.completions (user_id, habit_id, completion_date, completed_at, level, note)
  SELECT
    demo_user_id, h1,
    today - interval '1 day' * s,
    now() - interval '1 day' * s + interval '7 hours',
    CASE WHEN s % 5 = 0 THEN 'light' ELSE 'normal' END,
    CASE WHEN s = 1 THEN 'Great session! 5x5 squats, felt strong.' WHEN s = 3 THEN 'Energy 4/5' ELSE NULL END
  FROM generate_series(0, 13) s
  WHERE s NOT IN (2, 8); -- missed a couple days

  INSERT INTO public.completions (user_id, habit_id, completion_date, completed_at, level, note)
  SELECT
    demo_user_id, h2,
    today - interval '1 day' * s,
    now() - interval '1 day' * s + interval '21 hours',
    'normal',
    CASE WHEN s = 0 THEN 'Started Atomic Habits. Really good first chapter.' ELSE NULL END
  FROM generate_series(0, 13) s;

  INSERT INTO public.completions (user_id, habit_id, completion_date, completed_at, level)
  SELECT
    demo_user_id, h3,
    today - interval '1 day' * s,
    now() - interval '1 day' * s + interval '8 hours',
    'normal'
  FROM generate_series(0, 13) s
  WHERE s % 2 = 0; -- every other day

  -- Initialize streaks
  INSERT INTO public.streaks (user_id, habit_id, current_streak, longest_streak, last_completion_date)
  VALUES
    (demo_user_id, h1, 12, 21, today),
    (demo_user_id, h2, 14, 14, today),
    (demo_user_id, h3, 7, 12, today - 1);

  -- Notification settings
  INSERT INTO public.notification_settings (user_id, habit_id, enabled, reminder_time, escalation_time, email_enabled)
  VALUES
    (demo_user_id, h1, true, '07:00', '09:00', false),
    (demo_user_id, h2, true, '21:00', '22:00', false),
    (demo_user_id, h3, true, '08:00', NULL, false);

  RAISE NOTICE 'Demo data inserted for user %', demo_user_id;
END $$;
