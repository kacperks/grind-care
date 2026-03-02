import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from '@/components/settings/settings-form'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [profileRes, habitsRes, notifRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('habits').select('id, name, icon, item_type').eq('user_id', user.id).eq('is_archived', false).order('sort_order'),
    supabase.from('notification_settings').select('*').eq('user_id', user.id),
  ])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#e8e8f0]">Settings</h1>
        <p className="text-sm text-[#8888a8] mt-1">Customize GrindKeeper to your needs</p>
      </div>
      <SettingsForm
        profile={profileRes.data}
        userId={user.id}
        email={user.email ?? ''}
        habits={habitsRes.data ?? []}
        notificationSettings={notifRes.data ?? []}
      />
    </div>
  )
}
