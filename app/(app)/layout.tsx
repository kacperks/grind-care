import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { CommandPaletteProvider } from '@/components/layout/command-palette-provider'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [notifRes, habitsRes] = await Promise.all([
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: false })
      .eq('user_id', user.id)
      .is('read_at', null),
    supabase
      .from('habits')
      .select('id, name, icon, item_type, is_paused, is_archived, schedule_type, schedule_config, difficulty, color, completion_levels, note_template, description, sort_order, grace_days_remaining, grace_days_reset_at, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .eq('item_type', 'habit')
      .order('sort_order'),
  ])

  const unreadCount = notifRes.data?.length ?? 0
  const habits = (habitsRes.data ?? []) as Array<{
    id: string; name: string; icon: string; item_type: string;
    is_paused: boolean; is_archived: boolean; schedule_type: string | null;
    schedule_config: Record<string, unknown>; difficulty: number; color: string;
    completion_levels: Array<{ key: string; label: string }>; note_template: string | null;
    description: string | null; sort_order: number; grace_days_remaining: number;
    grace_days_reset_at: string | null; created_at: string; updated_at: string;
  }>

  return (
    <div className="flex min-h-screen">
      <Sidebar unreadCount={unreadCount} />
      <main className="flex-1 lg:ml-60 min-h-screen">
        <div className="pt-14 lg:pt-0 min-h-screen">
          {children}
        </div>
      </main>
      <CommandPaletteProvider habits={habits as never} userId={user.id} />
    </div>
  )
}
