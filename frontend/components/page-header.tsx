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
    <div className={cn("flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between mb-7", className)}>
      <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-500 ease-out">
        <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 transition-colors duration-200 group shadow-sm">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground leading-tight sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground text-sm leading-snug sm:text-base">
              {description}
            </p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500 ease-out delay-100">
          {children}
        </div>
      )}
    </div>
  )
}
