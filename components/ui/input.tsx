import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-xs font-medium text-[#8888a8] uppercase tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-lg border border-[#2a2a3a] bg-[#111118] px-3 py-2 text-sm text-[#e8e8f0] placeholder:text-[#4a4a6a] focus:border-indigo-500 focus:outline-none transition-colors',
            error && 'border-red-500',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-xs font-medium text-[#8888a8] uppercase tracking-wide">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-lg border border-[#2a2a3a] bg-[#111118] px-3 py-2 text-sm text-[#e8e8f0] placeholder:text-[#4a4a6a] focus:border-indigo-500 focus:outline-none transition-colors resize-none',
            error && 'border-red-500',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
