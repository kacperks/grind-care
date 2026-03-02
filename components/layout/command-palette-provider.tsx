'use client'

import { CommandPalette } from '@/components/ui/command-palette'
import { Habit } from '@/types'

interface CommandPaletteProviderProps {
  habits: Habit[]
  userId: string
}

export function CommandPaletteProvider({ habits, userId }: CommandPaletteProviderProps) {
  return <CommandPalette habits={habits} userId={userId} />
}
