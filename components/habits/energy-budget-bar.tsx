import { cn, energyColor } from '@/lib/utils'
import { Zap } from 'lucide-react'

interface EnergyBudgetBarProps {
  used: number
  max: number
  className?: string
}

export function EnergyBudgetBar({ used, max, className }: EnergyBudgetBarProps) {
  const pct = Math.min((used / max) * 100, 100)
  const overloaded = used > max

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Zap size={14} className={cn(energyColor(used, max), 'shrink-0')} />
      <div className="flex-1">
        <div className="h-1.5 bg-[#1a1a25] rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              overloaded ? 'bg-red-500' : pct > 60 ? 'bg-yellow-500' : 'bg-green-500'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className={cn('text-xs font-mono shrink-0', energyColor(used, max))}>
        {used}/{max}
      </span>
      {overloaded && (
        <span className="text-xs text-red-400 font-medium">Overloaded!</span>
      )}
    </div>
  )
}
