'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CheckSquare, Calendar, ListTodo, Zap, BarChart2,
  Settings, Bell, Flame, Menu, X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/today', icon: CheckSquare, label: 'Today' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/habits', icon: ListTodo, label: 'Habits' },
  { href: '/events', icon: Zap, label: 'Events' },
  { href: '/stats', icon: BarChart2, label: 'Stats' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

interface SidebarProps {
  unreadCount?: number
}

export function Sidebar({ unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-[#111118] border-b border-[#2a2a3a]">
        <div className="flex items-center gap-2">
          <Flame size={20} className="text-orange-400 animate-streak" />
          <span className="font-bold text-[#e8e8f0]">GrindKeeper</span>
        </div>
        <button onClick={() => setOpen(!open)} className="p-2 hover:bg-white/5 rounded-lg">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav className={cn(
        'fixed top-0 left-0 h-full z-40 flex flex-col w-60',
        'bg-[#111118] border-r border-[#2a2a3a]',
        'transition-transform duration-200',
        'lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-[#2a2a3a] shrink-0">
          <Flame size={22} className="text-orange-400" />
          <span className="font-bold text-lg text-[#e8e8f0]">GrindKeeper</span>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    active
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/30'
                      : 'text-[#8888a8] hover:text-[#e8e8f0] hover:bg-white/5'
                  )}
                >
                  <Icon size={17} />
                  {label}
                  {label === 'Notifications' && unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Bottom hint */}
        <div className="p-4 border-t border-[#2a2a3a]">
          <div className="text-xs text-[#4a4a6a]">
            Press <kbd className="bg-[#2a2a3a] px-1 py-0.5 rounded text-[#8888a8]">⌘K</kbd> to quick add
          </div>
        </div>
      </nav>
    </>
  )
}
