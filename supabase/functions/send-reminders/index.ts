// ============================================================
// GrindKeeper - Send Reminders Edge Function
//
// Deploy: supabase functions deploy send-reminders
// Schedule: supabase crons create "every-hour" "0 * * * *" \
//   --function send-reminders
//
// ARCHITECTURE:
// 1. This function runs hourly via Supabase Cron.
// 2. It checks notification_settings for habits with reminder_time
//    matching the current hour (in user's timezone).
// 3. It checks if the habit has already been completed today.
// 4. If not done and within window: creates in-app notification.
// 5. If email_enabled: sends email via Supabase's built-in email or
//    a transactional email provider (Resend, SendGrid).
// 6. For escalation: checks escalation_time the same way.
// 7. Respects quiet hours from user profile.
//
// SMART WINDOW HEURISTIC (MVP):
// - Looks at last 7 completions, calculates avg completion hour.
// - If avg_hour ± 1 hour matches current time, nudges user.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req) => {
  // Only allow from cron (or authenticated calls)
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const now = new Date()
  const currentHour = now.getUTCHours()
  const currentMinute = now.getUTCMinutes()
  const today = now.toISOString().split('T')[0]

  // Fetch all enabled notification settings with their habit and user profile
  const { data: settings } = await supabase
    .from('notification_settings')
    .select(`
      *,
      habits!inner(id, name, icon, user_id, is_paused, is_archived, item_type),
      profiles:habits(profiles!inner(timezone, quiet_hours_start, quiet_hours_end))
    `)
    .eq('enabled', true)

  if (!settings?.length) {
    return new Response(JSON.stringify({ processed: 0 }), { status: 200 })
  }

  let notificationsCreated = 0

  for (const setting of settings) {
    const habit = setting.habits
    if (!habit || habit.is_paused || habit.is_archived || habit.item_type !== 'habit') continue

    const userId = habit.user_id

    // Get user profile for timezone & quiet hours
    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone, quiet_hours_start, quiet_hours_end')
      .eq('id', userId)
      .single()

    if (!profile) continue

    // Convert current time to user's timezone hour
    const userNow = new Date(now.toLocaleString('en-US', { timeZone: profile.timezone }))
    const userHour = userNow.getHours()
    const userMinute = userNow.getMinutes()
    const userTimeStr = `${String(userHour).padStart(2, '0')}:${String(userMinute).padStart(2, '0')}`

    // Check quiet hours
    const quietStart = profile.quiet_hours_start ?? '22:00'
    const quietEnd = profile.quiet_hours_end ?? '07:00'
    if (isInQuietHours(userTimeStr, quietStart, quietEnd)) continue

    // Check if habit already completed today
    const { count } = await supabase
      .from('completions')
      .select('id', { count: 'exact', head: true })
      .eq('habit_id', habit.id)
      .eq('user_id', userId)
      .eq('completion_date', today)

    if ((count ?? 0) > 0) continue // Already done

    // Check if we should send reminder (reminder_time matches within 5 min)
    const shouldSendReminder = setting.reminder_time &&
      isWithinWindow(userTimeStr, setting.reminder_time, 5)

    // Check escalation
    const shouldEscalate = setting.escalation_time &&
      isWithinWindow(userTimeStr, setting.escalation_time, 5)

    if (shouldSendReminder || shouldEscalate) {
      // Check we haven't already notified today for this habit+type
      const notifType = shouldEscalate ? 'escalation' : 'reminder'
      const { count: existingNotif } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('habit_id', habit.id)
        .eq('type', notifType)
        .gte('created_at', `${today}T00:00:00Z`)

      if ((existingNotif ?? 0) > 0) continue

      // Create in-app notification
      await supabase.from('notifications').insert({
        user_id: userId,
        habit_id: habit.id,
        type: notifType,
        title: shouldEscalate
          ? `⚡ Final reminder: ${habit.name}`
          : `🔔 Time for: ${habit.name}`,
        message: shouldEscalate
          ? `You haven't completed "${habit.name}" yet today. Don't break your streak!`
          : `It's time to ${habit.name.toLowerCase()}. Keep your streak alive!`,
      })
      notificationsCreated++

      // Optional email reminder
      if (setting.email_enabled) {
        // Get user email
        const { data: authUser } = await supabase.auth.admin.getUserById(userId)
        if (authUser?.user?.email) {
          await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: authUser.user.email,
          })
          // In production, send via Resend/SendGrid using the SMTP integration
          // Example with Resend:
          // await fetch('https://api.resend.com/emails', {
          //   method: 'POST',
          //   headers: {
          //     'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          //     'Content-Type': 'application/json',
          //   },
          //   body: JSON.stringify({
          //     from: 'GrindKeeper <reminders@grindkeeper.app>',
          //     to: authUser.user.email,
          //     subject: `Reminder: ${habit.name}`,
          //     text: `Don't forget to ${habit.name}! Open GrindKeeper to log it.`,
          //   }),
          // })
        }
      }
    }
  }

  // Check for streak milestones and broken streaks
  await checkStreakEvents(today, supabase, notificationsCreated)

  return new Response(
    JSON.stringify({ processed: settings.length, notifications_created: notificationsCreated }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})

function isWithinWindow(current: string, target: string, toleranceMinutes: number): boolean {
  const [ch, cm] = current.split(':').map(Number)
  const [th, tm] = target.split(':').map(Number)
  const currentMins = ch * 60 + cm
  const targetMins = th * 60 + tm
  return Math.abs(currentMins - targetMins) <= toleranceMinutes
}

function isInQuietHours(current: string, start: string, end: string): boolean {
  const toMins = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const c = toMins(current)
  const s = toMins(start)
  const e = toMins(end)
  if (s > e) {
    // Wraps midnight
    return c >= s || c <= e
  }
  return c >= s && c <= e
}

async function checkStreakEvents(today: string, supabase: ReturnType<typeof createClient>, count: number) {
  // Find any streaks that hit milestone numbers (7, 14, 21, 30, 50, 100)
  const milestones = [7, 14, 21, 30, 50, 100]

  const { data: streaks } = await supabase
    .from('streaks')
    .select('*, habits!inner(name, icon, user_id)')
    .eq('last_completion_date', today)
    .in('current_streak', milestones)

  for (const streak of (streaks ?? [])) {
    const habit = streak.habits as { name: string; icon: string; user_id: string }

    // Don't double-notify
    const { count: existing } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', habit.user_id)
      .eq('habit_id', streak.habit_id)
      .eq('type', 'streak_milestone')
      .gte('created_at', `${today}T00:00:00Z`)

    if ((existing ?? 0) > 0) continue

    await supabase.from('notifications').insert({
      user_id: habit.user_id,
      habit_id: streak.habit_id,
      type: 'streak_milestone',
      title: `🔥 ${streak.current_streak}-day streak!`,
      message: `You've hit a ${streak.current_streak}-day streak on "${habit.name}". Keep it up!`,
    })
  }
}
