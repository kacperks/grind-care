'use client'

import { Habit, Completion } from '@/types'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

interface ExportButtonProps {
  habits: Habit[]
  completions: Completion[]
}

export function ExportButton({ habits, completions }: ExportButtonProps) {
  function exportCSV() {
    const rows = [
      ['date', 'habit_name', 'habit_type', 'level', 'note', 'is_backfill'],
      ...completions.map(c => {
        const habit = habits.find(h => h.id === c.habit_id)
        return [
          c.completion_date,
          habit?.name ?? '',
          habit?.item_type ?? '',
          c.level,
          c.note ?? '',
          c.is_backfill ? 'yes' : 'no',
        ]
      })
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    downloadFile(csv, 'grindkeeper-export.csv', 'text/csv')
  }

  function exportJSON() {
    const data = {
      exported_at: new Date().toISOString(),
      habits: habits.map(h => ({ id: h.id, name: h.name, type: h.item_type, schedule_type: h.schedule_type })),
      completions: completions.map(c => ({
        date: c.completion_date,
        habit_id: c.habit_id,
        level: c.level,
        note: c.note,
        is_backfill: c.is_backfill,
      })),
    }
    downloadFile(JSON.stringify(data, null, 2), 'grindkeeper-export.json', 'application/json')
  }

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" size="sm">
          <Download size={14} /> Export
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[140px] bg-[#1a1a25] border border-[#2a2a3a] rounded-xl p-1 shadow-xl"
          align="end"
        >
          <DropdownMenu.Item
            onClick={exportCSV}
            className="px-3 py-2 text-sm text-[#e8e8f0] rounded-lg cursor-pointer hover:bg-white/5 outline-none"
          >
            Export CSV
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onClick={exportJSON}
            className="px-3 py-2 text-sm text-[#e8e8f0] rounded-lg cursor-pointer hover:bg-white/5 outline-none"
          >
            Export JSON
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
