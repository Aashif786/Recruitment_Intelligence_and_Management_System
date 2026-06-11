'use client'

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Lock, ArrowRight, Loader2, ArrowLeft, KeyRound } from 'lucide-react'
import { getApiBaseUrl } from '@/lib/config'

export default function ResetPasswordPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        const emailParam = searchParams.get('email')
        if (emailParam) {
            setEmail(emailParam)
        }
        const otpParam = searchParams.get('otp')
        if (otpParam) {
            setOtp(otpParam)
        }
    }, [searchParams])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long")
            return
        }

        setIsSubmitting(true)

        try {
            const response = await fetch(`${getApiBaseUrl()}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, new_password: newPassword }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || data.detail || 'Unable to reset your password. Please check the code and try again.')
            }

            setSuccess(true)
            setTimeout(() => {
                router.push('/auth/login')
            }, 3000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (success) {
        return (
            <div className="flex items-center justify-center min-h-screen py-12 px-4 relative overflow-hidden">
                {/* Ambient background glows */}
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-primary/8 blur-3xl pointer-events-none" />

                <Card className="w-full max-w-md bg-card/45 backdrop-blur-xl border border-border/80 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] rounded-3xl relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500 p-8 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="absolute -inset-2 rounded-full bg-emerald-500/20 blur-lg animate-pulse" />
                            <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 border border-emerald-500/25 flex items-center justify-center shadow-lg">
                                <Lock className="h-8 w-8 text-emerald-500 animate-bounce" />
                            </div>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">Password Reset!</h1>
                    <p className="text-muted-foreground mb-6 leading-relaxed">Your password has been successfully updated. Redirecting to login...</p>
                    <Link href="/auth/login" className="text-primary font-bold hover:text-primary/80 hover:underline transition-all">
                        Go to login now
                    </Link>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen py-12 px-4 relative overflow-hidden">
            {/* Ambient background glows */}
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-blue-500/8 blur-3xl pointer-events-none" />

            <Card className="w-full max-w-md bg-card/45 backdrop-blur-xl border border-border/80 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] rounded-3xl relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardContent className="p-8">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-5">
                            <div className="relative">
                                <div className="absolute -inset-2 rounded-full bg-primary/15 blur-lg" />
                                <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 border border-primary/25 flex items-center justify-center shadow-lg">
                                    <KeyRound className="h-8 w-8 text-primary" />
                                </div>
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">Reset Password</h1>
                        <p className="text-muted-foreground leading-relaxed">Enter the OTP sent to your email and your new password.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-foreground">Email Address</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary hover:border-primary/40 transition-all placeholder:text-muted-foreground text-foreground h-12"
                                placeholder="you@company.com"
                                disabled={!!searchParams.get('email') || isSubmitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-foreground">OTP Code</label>
                            <Input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary hover:border-primary/40 transition-all placeholder:text-muted-foreground text-foreground text-center tracking-[0.5em] font-mono text-xl h-12"
                                placeholder="000000"
                                maxLength={6}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-foreground">New Password</label>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary hover:border-primary/40 transition-all placeholder:text-muted-foreground text-foreground h-12"
                                placeholder="••••••••"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-foreground">Confirm New Password</label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-background/50 border border-input rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary hover:border-primary/40 transition-all placeholder:text-muted-foreground text-foreground h-12"
                                placeholder="••••••••"
                                disabled={isSubmitting}
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-xl shadow-lg shadow-primary/25 active:scale-[0.99] transition-all duration-200 mt-4"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    Update Password
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-8 text-center">
                        <Link href="/auth/login" className="inline-flex items-center text-primary hover:text-primary/80 font-bold hover:underline gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back to login
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
