'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/dashboard/lib/auth-context'

export default function DashboardRedirect() {
    const { user, isLoading, isOffline } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && user) {
            if (user.role === 'candidate') {
                router.push('/jobs')
            } else {
                // All other management/staff roles go to the HR dashboard
                router.push('/dashboard/hr')
            }
        } else if (!isLoading && !isOffline && !user) {
            router.push('/auth/login')
        }
    }, [user, isLoading, isOffline, router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
            <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
                <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-8 w-8 rounded-full bg-primary/10 animate-pulse" />
                    </div>
                </div>
                <div className="text-center space-y-1">
                    <p className="text-base font-bold text-foreground tracking-tight">
                        Loading your workspace
                    </p>
                    <p className="text-sm font-medium text-muted-foreground">
                        Preparing everything for you...
                    </p>
                </div>
            </div>
        </div>
    )
}
