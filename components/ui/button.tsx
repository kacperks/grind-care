import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none',
          {
            'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700': variant === 'default',
            'hover:bg-white/5 text-[#e8e8f0]': variant === 'ghost',
            'border border-[#2a2a3a] hover:border-indigo-500/50 hover:bg-white/5 text-[#e8e8f0]': variant === 'outline',
            'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/30': variant === 'danger',
            'bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-600/30': variant === 'success',
          },
          {
            'h-7 px-2 text-xs': size === 'sm',
            'h-9 px-4 text-sm': size === 'md',
            'h-11 px-6 text-base': size === 'lg',
            'h-9 w-9 p-0': size === 'icon',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
