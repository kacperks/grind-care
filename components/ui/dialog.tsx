'use client'

import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = RadixDialog.Root
export const DialogTrigger = RadixDialog.Trigger
export const DialogClose = RadixDialog.Close

interface DialogContentProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

export function DialogContent({ children, title, description, className }: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 data-[state=open]:animate-fade-in" />
      <RadixDialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
          'w-full max-w-lg max-h-[90vh] overflow-y-auto',
          'bg-[#111118] border border-[#2a2a3a] rounded-2xl shadow-2xl',
          'data-[state=open]:animate-fade-in',
          className
        )}
      >
        <div className="flex items-center justify-between p-6 border-b border-[#2a2a3a]">
          <div>
            {title && (
              <RadixDialog.Title className="text-lg font-semibold text-[#e8e8f0]">
                {title}
              </RadixDialog.Title>
            )}
            {description && (
              <RadixDialog.Description className="text-sm text-[#8888a8] mt-1">
                {description}
              </RadixDialog.Description>
            )}
          </div>
          <RadixDialog.Close className="rounded-lg p-1.5 hover:bg-white/5 transition-colors text-[#8888a8] hover:text-[#e8e8f0]">
            <X size={16} />
          </RadixDialog.Close>
        </div>
        <div className="p-6">{children}</div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  )
}
