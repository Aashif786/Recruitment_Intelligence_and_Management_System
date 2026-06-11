'use client'

import React, { useState } from "react"
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Mail, ArrowRight, Loader2, ArrowLeft } from 'lucide-react'
import { getApiBaseUrl } from '@/lib/config'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSent, setIsSent] = useState(false)

    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError('')

        try {
            const response = await fetch(`${getApiBaseUrl()}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || data.detail || 'Unable to send reset email. Please check the address and try again.')
            }

            setIsSent(true)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen py-12 px-4 relative overflow-hidden">
            <Card className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardContent className="p-8">

                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-5">
                            {isSent ? (
                                <div className="relative">
                                    <div className="absolute -inset-2 rounded-full bg-emerald-500/20 blur-lg" />
                                    <div className="relative h-14 w-14 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="absolute -inset-2 rounded-full bg-primary/15 blur-lg" />
                                    <div className="relative h-14 w-14 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center shadow-sm">
                                        <Mail className="h-8 w-8 text-primary" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <h1 className="text-2xl font-semibold text-foreground mb-2">
                            {isSent ? 'Check your email' : 'Forgot password?'}
                        </h1>
                        <p className="text-muted-foreground">
                            {isSent
                                ? `We sent a password reset link to ${email}`
                                : "No worries, we'll send you reset instructions."}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {!isSent ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="pl-10 h-11"
                                        placeholder="you@company.com"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-11 shadow-md shadow-primary/10"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        Reset Password
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <Button
                                onClick={() => setIsSent(false)}
                                variant="outline"
                                className="w-full h-11 border-border/60 hover:bg-muted"
                            >
                                Didn't receive the email? Click to retry
                            </Button>
                            <Link href={`/auth/reset-password?email=${encodeURIComponent(email)}`} className="block">
                                <Button className="w-full h-11 bg-primary text-primary-foreground">
                                    Go to reset page
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    )}

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
