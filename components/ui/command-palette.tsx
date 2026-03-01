'use client'

import { useState, useEffect, useCallback } from 'react'
import { Habit } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Search, X, CheckSquare, Calendar, BarChart2, Settings, ListTodo, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandPaletteProps {
  habits: Habit[]
  userId: string
}

type CommandItem = {
  id: string
  label: string
  sublabel?: string
  icon: React.ReactNode
  action: () => void
}

export function CommandPalette({ habits, userId }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  // Open on Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
        setQuery('')
        setSelectedIndex(0)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  async function quickComplete(habit: Habit) {
    const today = format(new Date(), 'yyyy-MM-dd')
    await supabase.from('completions').insert({
      user_id: userId,
      habit_id: habit.id,
      completion_date: today,
      completed_at: new Date().toISOString(),
      level: 'normal',
      is_backfill: false,
    })
    setOpen(false)
    router.refresh()
  }

  const navItems: CommandItem[] = [
    { id: 'today', label: 'Today', sublabel: 'Check your daily habits', icon: <CheckSquare size={16} />, action: () => { router.push('/today'); setOpen(false) } },
    { id: 'calendar', label: 'Calendar', sublabel: 'View habit history', icon: <Calendar size={16} />, action: () => { router.push('/calendar'); setOpen(false) } },
    { id: 'habits', label: 'Habits', sublabel: 'Manage habits', icon: <ListTodo size={16} />, action: () => { router.push('/habits'); setOpen(false) } },
    { id: 'events', label: 'Events', sublabel: 'Log sporadic activities', icon: <Zap size={16} />, action: () => { router.push('/events'); setOpen(false) } },
    { id: 'stats', label: 'Stats', sublabel: 'View analytics', icon: <BarChart2 size={16} />, action: () => { router.push('/stats'); setOpen(false) } },
    { id: 'settings', label: 'Settings', sublabel: 'Configure GrindKeeper', icon: <Settings size={16} />, action: () => { router.push('/settings'); setOpen(false) } },
  ]

  const habitItems: CommandItem[] = habits
    .filter(h => h.item_type === 'habit' && !h.is_paused && !h.is_archived)
    .map(h => ({
      id: h.id,
      label: `✓ ${h.name}`,
      sublabel: 'Mark as done today',
      icon: <span className="text-sm">{h.icon}</span>,
      action: () => quickComplete(h),
    }))

  const allItems = [...navItems, ...habitItems]

  const filtered = query.trim()
    ? allItems.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.sublabel?.toLowerCase().includes(query.toLowerCase())
      )
    : allItems

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      filtered[selectedIndex]?.action()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4 bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-[#111118] border border-[#2a2a3a] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a3a]">
          <Search size={16} className="text-[#4a4a6a] shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search or quick complete..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-[#e8e8f0] placeholder:text-[#4a4a6a] outline-none"
          />
          <button onClick={() => setOpen(false)} className="text-[#4a4a6a] hover:text-[#8888a8]">
            <X size={14} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-[#4a4a6a]">No results found</div>
          ) : (
            <div className="space-y-0.5">
              {!query && <div className="px-3 py-1.5 text-xs text-[#4a4a6a] font-medium">Navigate</div>}
              {filtered.slice(0, !query ? 6 : undefined).map((item, i) => (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                    i === selectedIndex
                      ? 'bg-indigo-500/20 text-[#e8e8f0]'
                      : 'text-[#8888a8] hover:bg-white/5 hover:text-[#e8e8f0]'
                  )}
                >
                  <span className="shrink-0 text-[#8888a8]">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{item.label}</div>
                    {item.sublabel && (
                      <div className="text-xs text-[#4a4a6a] truncate">{item.sublabel}</div>
                    )}
                  </div>
                </button>
              ))}
              {!query && habitItems.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs text-[#4a4a6a] font-medium mt-2">Quick complete</div>
                  {habitItems.map((item, i) => {
                    const idx = navItems.length + i
                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                          idx === selectedIndex
                            ? 'bg-indigo-500/20 text-[#e8e8f0]'
                            : 'text-[#8888a8] hover:bg-white/5 hover:text-[#e8e8f0]'
                        )}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{item.label}</div>
                          <div className="text-xs text-[#4a4a6a]">{item.sublabel}</div>
                        </div>
                      </button>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-[#2a2a3a] flex items-center gap-3 text-xs text-[#4a4a6a]">
          <kbd className="bg-[#2a2a3a] px-1.5 py-0.5 rounded">↑↓</kbd> navigate
          <kbd className="bg-[#2a2a3a] px-1.5 py-0.5 rounded">↵</kbd> select
          <kbd className="bg-[#2a2a3a] px-1.5 py-0.5 rounded">esc</kbd> close
        </div>
      </div>
    </div>
  )
}
