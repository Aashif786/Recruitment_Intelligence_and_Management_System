'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Calendar } from 'lucide-react'
import { APIClient } from '@/app/dashboard/lib/api-client'
import { toast } from "sonner"

export function SendOfferDialog({ applicationId, candidateName, onSuccess, trigger, initialDate }: { applicationId: number, candidateName: string, onSuccess: () => void, trigger: React.ReactNode, initialDate?: string }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [joiningDate, setJoiningDate] = useState(initialDate ? initialDate.split('T')[0] : '')

    const handleSend = async () => {
        if (!joiningDate) {
            toast.error("Please select a joining date")
            return
        }

        const selectedDate = new Date(joiningDate)
        selectedDate.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (selectedDate < today) {
            toast.error("Joining date cannot be in the past")
            return
        }

        setLoading(true)
        try {
            // Always auto_approve for job owners as requested
            const url = `/api/onboarding/applications/${applicationId}/send-offer?joining_date=${joiningDate}&auto_approve=true`
            await APIClient.post(url, {})
            toast.success(`Offer letter has been sent directly to ${candidateName}.`)
            setOpen(false)
            onSuccess()
        } catch (error: any) {
            toast.error(error.message || "Could not process offer")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] border border-border/80 bg-background/90 backdrop-blur-xl shadow-2xl rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold tracking-tight">Issue Offer Letter</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Set the joining date and release the offer letter to <strong className="font-semibold text-foreground">{candidateName}</strong> immediately.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="joining_date" className="text-sm font-semibold text-foreground">Joining Date</Label>
                        <div className="relative">
                            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                            <Input 
                                id="joining_date" 
                                type="date" 
                                min={new Date().toISOString().split('T')[0]}
                                className="pl-10 h-10 rounded-xl border-border/80 focus:ring-primary/20 focus-visible:ring-primary/20"
                                value={joiningDate}
                                onChange={(e) => setJoiningDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0 mt-2">
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading} className="rounded-xl active:scale-95 transition-all">
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSend} 
                        disabled={loading} 
                        className="rounded-xl bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all font-bold px-8 shadow-md shadow-primary/10"
                    >
                        {loading ? "Releasing..." : "Release Offer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
