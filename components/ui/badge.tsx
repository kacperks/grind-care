import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'streak' | 'success' | 'warning' | 'danger' | 'muted'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
      {
        'bg-indigo-500/20 text-indigo-300': variant === 'default',
        'bg-orange-500/20 text-orange-300 border border-orange-500/30': variant === 'streak',
        'bg-green-500/20 text-green-300': variant === 'success',
        'bg-yellow-500/20 text-yellow-300': variant === 'warning',
        'bg-red-500/20 text-red-300': variant === 'danger',
        'bg-white/5 text-[#8888a8]': variant === 'muted',
      },
      className
    )}>
      {children}
    </span>
  )
}
