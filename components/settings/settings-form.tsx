'use client'

import { useState, useTransition } from 'react'
import { Profile, NotificationSetting } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { Bell, User, Moon, Zap, LogOut, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SettingsFormProps {
  profile: Profile | null
  userId: string
  email: string
  habits: Array<{ id: string; name: string; icon: string; item_type: string }>
  notificationSettings: NotificationSetting[]
}

const TIMEZONES = [
  'Europe/Warsaw', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Los_Angeles', 'America/Chicago',
  'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney', 'UTC',
]

export function SettingsForm({ profile, userId, email, habits, notificationSettings }: SettingsFormProps) {
  const [form, setForm] = useState({
    display_name: profile?.display_name ?? '',
    timezone: profile?.timezone ?? 'Europe/Warsaw',
    grace_days_per_month: profile?.grace_days_per_month ?? 2,
    daily_energy_budget: profile?.daily_energy_budget ?? 20,
    quiet_hours_start: profile?.quiet_hours_start ?? '22:00',
    quiet_hours_end: profile?.quiet_hours_end ?? '07:00',
  })

  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [expandedNotif, setExpandedNotif] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const notifMap = new Map(notificationSettings.map(n => [n.habit_id, n]))

  async function saveProfile() {
    await supabase.from('profiles').upsert({
      id: userId,
      ...form,
      updated_at: new Date().toISOString(),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    startTransition(() => router.refresh())
  }

  async function saveNotifSetting(habitId: string, setting: Partial<NotificationSetting>) {
    const existing = notifMap.get(habitId)
    if (existing) {
      await supabase.from('notification_settings')
        .update({ ...setting, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase.from('notification_settings').insert({
        user_id: userId,
        habit_id: habitId,
        enabled: true,
        ...setting,
      })
    }
    startTransition(() => router.refresh())
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="space-y-6">
      {/* Profile section */}
      <Section icon={<User size={16} />} title="Profile">
        <div className="space-y-4">
          <Input
            label="Display name"
            value={form.display_name}
            onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
            placeholder="Your name"
          />
          <div className="text-sm text-[#8888a8]">
            <span className="text-xs font-medium text-[#4a4a6a] uppercase tracking-wide block mb-1">Email</span>
            {email}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#8888a8] uppercase tracking-wide">Timezone</label>
            <select
              value={form.timezone}
              onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
              className="w-full rounded-lg border border-[#2a2a3a] bg-[#111118] px-3 py-2 text-sm text-[#e8e8f0] focus:border-indigo-500 focus:outline-none"
            >
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>
      </Section>

      {/* Streak & Energy */}
      <Section icon={<Zap size={16} />} title="Streak & Energy">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#8888a8] uppercase tracking-wide">
              Grace days per month: {form.grace_days_per_month}
            </label>
            <input
              type="range"
              min={0}
              max={5}
              value={form.grace_days_per_month}
              onChange={e => setForm(f => ({ ...f, grace_days_per_month: parseInt(e.target.value) }))}
              className="w-full accent-indigo-500"
            />
            <p className="text-xs text-[#4a4a6a]">
              Grace days protect your streak when you miss a day (up to {form.grace_days_per_month}/month).
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-[#8888a8] uppercase tracking-wide">
              Daily energy budget: {form.daily_energy_budget}
            </label>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={form.daily_energy_budget}
              onChange={e => setForm(f => ({ ...f, daily_energy_budget: parseInt(e.target.value) }))}
              className="w-full accent-indigo-500"
            />
            <p className="text-xs text-[#4a4a6a]">
              Total difficulty points before you&apos;re shown as &quot;overloaded&quot;.
            </p>
          </div>
        </div>
      </Section>

      {/* Quiet hours */}
      <Section icon={<Moon size={16} />} title="Quiet Hours">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start (no notifications after)"
            type="time"
            value={form.quiet_hours_start}
            onChange={e => setForm(f => ({ ...f, quiet_hours_start: e.target.value }))}
          />
          <Input
            label="End (notifications resume)"
            type="time"
            value={form.quiet_hours_end}
            onChange={e => setForm(f => ({ ...f, quiet_hours_end: e.target.value }))}
          />
        </div>
      </Section>

      {/* Per-habit notifications */}
      {habits.filter(h => h.item_type === 'habit').length > 0 && (
        <Section icon={<Bell size={16} />} title="Reminders per Habit">
          <div className="space-y-2">
            {habits.filter(h => h.item_type === 'habit').map(habit => {
              const setting = notifMap.get(habit.id)
              const isExpanded = expandedNotif === habit.id

              return (
                <div key={habit.id} className="border border-[#2a2a3a] rounded-xl overflow-hidden">
                  <button
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 transition-all text-left"
                    onClick={() => setExpandedNotif(isExpanded ? null : habit.id)}
                  >
                    <span>{habit.icon}</span>
                    <span className="text-sm text-[#e8e8f0] flex-1">{habit.name}</span>
                    {setting?.enabled && setting.reminder_time && (
                      <span className="text-xs text-[#8888a8]">{setting.reminder_time}</span>
                    )}
                    {!setting?.enabled && <span className="text-xs text-[#4a4a6a]">Off</span>}
                    {isExpanded ? <ChevronUp size={14} className="text-[#4a4a6a]" /> : <ChevronDown size={14} className="text-[#4a4a6a]" />}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-[#2a2a3a]/50">
                      <div className="flex items-center gap-3 pt-3">
                        <span className="text-sm text-[#8888a8] flex-1">Enable reminders</span>
                        <button
                          onClick={() => saveNotifSetting(habit.id, { enabled: !setting?.enabled })}
                          className={cn(
                            'w-10 h-6 rounded-full transition-all relative',
                            setting?.enabled !== false ? 'bg-indigo-600' : 'bg-[#2a2a3a]'
                          )}
                        >
                          <div className={cn(
                            'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all',
                            setting?.enabled !== false ? 'right-0.5' : 'left-0.5'
                          )} />
                        </button>
                      </div>

                      {setting?.enabled !== false && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              label="Reminder time"
                              type="time"
                              value={setting?.reminder_time ?? '19:00'}
                              onChange={e => saveNotifSetting(habit.id, { reminder_time: e.target.value })}
                            />
                            <Input
                              label="Escalation time (if not done)"
                              type="time"
                              value={setting?.escalation_time ?? ''}
                              onChange={e => saveNotifSetting(habit.id, { escalation_time: e.target.value || null })}
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-[#8888a8] flex-1">Email reminders</span>
                            <button
                              onClick={() => saveNotifSetting(habit.id, { email_enabled: !setting?.email_enabled })}
                              className={cn(
                                'w-10 h-6 rounded-full transition-all relative',
                                setting?.email_enabled ? 'bg-indigo-600' : 'bg-[#2a2a3a]'
                              )}
                            >
                              <div className={cn(
                                'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all',
                                setting?.email_enabled ? 'right-0.5' : 'left-0.5'
                              )} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Save button */}
      <div className="flex items-center justify-between pt-2">
        <Button onClick={signOut} variant="ghost" className="text-[#8888a8] hover:text-red-400">
          <LogOut size={14} /> Sign out
        </Button>
        <Button onClick={saveProfile} disabled={isPending}>
          {saved ? '✓ Saved!' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111118] rounded-2xl border border-[#2a2a3a] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[#2a2a3a]">
        <span className="text-[#8888a8]">{icon}</span>
        <h2 className="font-semibold text-sm text-[#e8e8f0]">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
