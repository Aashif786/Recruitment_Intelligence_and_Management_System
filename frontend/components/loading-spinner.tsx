'use client'

import { useEffect, useState } from "react"

export const LoadingSpinner = () => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="flex items-center justify-center min-h-[50vh] w-full" aria-label="Loading">
      <div className="relative flex items-center justify-center">
        {/* Outer pulsing ring */}
        <div className="absolute h-16 w-16 rounded-full border-2 border-primary/20 animate-ping" />
        {/* Main spinning ring */}
        <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin shadow-[0_0_16px_rgba(0,0,0,0.08)]" />
        {/* Inner pulsing dot */}
        <div className="absolute h-4 w-4 rounded-full bg-primary/30 animate-pulse" />
      </div>
    </div>
  )
}
