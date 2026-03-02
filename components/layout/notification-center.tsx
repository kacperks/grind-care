'use client'

import { useState, useEffect } from 'react'
import { Notification } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Bell, X, Clock, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, timeAgo } from '@/lib/utils'

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const supabase = createClient()

  async function loadNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data ?? [])
  }

  useEffect(() => {
    loadNotifications()
    // Poll every 2 minutes
    const interval = setInterval(loadNotifications, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function markRead(id: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'read' }),
    })
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  async function snooze(id: string, minutes: number) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'snooze', snooze_minutes: minutes }),
    })
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read_all' }),
    })
    setNotifications([])
    setOpen(false)
  }

  const unreadCount = notifications.length

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-white/5 transition-all"
      >
        <Bell size={18} className="text-[#8888a8]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-40 w-80 bg-[#111118] border border-[#2a2a3a] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a3a]">
              <h3 className="font-semibold text-sm text-[#e8e8f0]">
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-[#4a4a6a] hover:text-[#8888a8]">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Check size={24} className="text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-[#8888a8]">All caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-[#2a2a3a]">
                  {notifications.map(notif => (
                    <div key={notif.id} className="p-4 hover:bg-white/5 transition-all">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-2 h-2 rounded-full mt-1.5 shrink-0',
                          notif.type === 'streak_broken' ? 'bg-red-400' :
                          notif.type === 'streak_milestone' ? 'bg-orange-400' :
                          notif.type === 'reminder' ? 'bg-indigo-400' : 'bg-[#4a4a6a]'
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#e8e8f0]">{notif.title}</p>
                          <p className="text-xs text-[#8888a8] mt-0.5">{notif.message}</p>
                          <p className="text-[10px] text-[#4a4a6a] mt-1">{timeAgo(notif.created_at)}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-2 ml-5">
                        <button
                          onClick={() => markRead(notif.id)}
                          className="text-xs text-[#4a4a6a] hover:text-[#8888a8] flex items-center gap-1"
                        >
                          <Check size={10} /> Dismiss
                        </button>
                        {notif.type === 'reminder' && (
                          <>
                            <button
                              onClick={() => snooze(notif.id, 30)}
                              className="text-xs text-[#4a4a6a] hover:text-[#8888a8] flex items-center gap-1"
                            >
                              <Clock size={10} /> 30m
                            </button>
                            <button
                              onClick={() => snooze(notif.id, 60)}
                              className="text-xs text-[#4a4a6a] hover:text-[#8888a8] flex items-center gap-1"
                            >
                              <Clock size={10} /> 1h
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
