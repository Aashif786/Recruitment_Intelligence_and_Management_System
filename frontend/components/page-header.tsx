'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/app/dashboard/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  icon: LucideIcon
  className?: string
  children?: React.ReactNode
}

export function PageHeader({ 
  title, 
  description, 
  icon: Icon, 
  className,
  children 
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10", className)}>
      <div className="flex items-center gap-5 animate-in fade-in slide-in-from-left-4 duration-500 ease-out">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 transition-all duration-300 hover:scale-105 hover:bg-primary/15 hover:ring-4 hover:ring-primary/15 group shadow-sm">
          <Icon className="h-7 w-7 text-primary transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight leading-none">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground font-medium text-base leading-snug">
              {description}
            </p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-500 ease-out delay-100">
          {children}
        </div>
      )}
    </div>
  )
}
