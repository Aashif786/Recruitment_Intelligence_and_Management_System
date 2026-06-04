'use client'

import React from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { useAuth } from '@/app/dashboard/lib/auth-context'
import { APIClient } from '@/app/dashboard/lib/api-client'
import { fetcher } from '@/app/dashboard/lib/swr-fetcher'
import { performMutation } from '@/app/dashboard/lib/swr-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Check, ArrowRight, Trash2, UserCheck } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface HRUser {
  id: number
  email: string
  full_name: string
  approval_status: 'pending' | 'approved' | 'rejected'
  is_active: boolean
}

export default function ApprovalsPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [processingId, setProcessingId] = React.useState<number | null>(null)
  const [status, setStatus] = React.useState<string>('pending')
  const [confirmAction, setConfirmAction] = React.useState<{ type: 'reject' | 'remove'; userId: number; message: string } | null>(null)
  const [otpConfirmUser, setOtpConfirmUser] = React.useState<HRUser | null>(null)
  const [isSendingOtp, setIsSendingOtp] = React.useState(false)

  const handleSendOTP = async () => {
    if (!otpConfirmUser) return
    setIsSendingOtp(true)
    try {
      // We use the public forgot-password endpoint to trigger the OTP
      await APIClient.post('/api/auth/forgot-password', { email: otpConfirmUser.email })
      toast.success(`Password reset OTP sent to ${otpConfirmUser.email}`)
      setOtpConfirmUser(null)
    } catch (err) {
      console.error('Failed to send OTP', err instanceof Error ? err.message : String(err))
      toast.error('Failed to send password reset email. Please try again.')
    } finally {
      setIsSendingOtp(false)
    }
  }

  const isSuperAdmin = user?.role === 'super_admin'
  const shouldFetch = isSuperAdmin
  const fetchUrl = `/api/auth/hr-requests?status=${status}`
  const { data: hrUsers = [], error, isValidating, mutate } = useSWR<HRUser[]>(
    shouldFetch ? fetchUrl : null,
    (url: string) => fetcher<HRUser[]>(url)
  )

  const userCount = hrUsers.length

  const handleApprove = async (userId: number) => {
    setProcessingId(userId)
    try {
      await performMutation<HRUser[]>(
        fetchUrl,
        mutate,
        () => APIClient.post(`/api/auth/approve/${userId}`, {}),
        {
          lockKey: `approval-${userId}`,
          successMessage: 'HR user approved successfully',
          invalidateKeys: [fetchUrl, '/api/analytics/dashboard']
        }
      )
    } catch (err) {
      console.error('Failed to approve user', err instanceof Error ? err.message : String(err))
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (userId: number) => {
    setConfirmAction({ type: 'reject', userId, message: 'Are you sure you want to reject this HR registration?' })
  }

  const handleRemove = async (userId: number) => {
    setConfirmAction({ type: 'remove', userId, message: 'Are you sure you want to deactivate this HR account? They will no longer be able to log in.' })
  }

  const handleConfirm = async () => {
    if (!confirmAction) return
    const { type, userId } = confirmAction
    setConfirmAction(null)
    setProcessingId(userId)
    try {
      if (type === 'reject') {
        await performMutation<HRUser[]>(
          fetchUrl,
          mutate,
          () => APIClient.post(`/api/auth/reject/${userId}`, {}),
          {
            lockKey: `approval-${userId}`,
            successMessage: 'HR user rejected',
            invalidateKeys: [fetchUrl, '/api/analytics/dashboard']
          }
        )
      } else {
        await performMutation<HRUser[]>(
          fetchUrl,
          mutate,
          () => APIClient.delete(`/api/auth/remove/${userId}`),
          {
            lockKey: `approval-remove-${userId}`,
            successMessage: 'HR user deactivated',
            invalidateKeys: [fetchUrl, '/api/analytics/dashboard']
          }
        )
      }
    } catch (err) {
      console.error('Failed to process action', err instanceof Error ? err.message : String(err))
    } finally {
      setProcessingId(null)
    }
  }

  if (isAuthLoading || (shouldFetch && isValidating && hrUsers.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  if (!user || !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-xl w-full">
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This page is reserved for Super Admin accounts only.
            </p>
            <div className="mt-4">
              <Link href="/dashboard/hr">
                <Button>Return to dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusBadge = (user: HRUser) => {
    if (user.approval_status === 'pending') {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>
    }
    if (user.approval_status === 'approved' && user.is_active) {
      return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Approved</Badge>
    }
    if (user.approval_status === 'approved' && !user.is_active) {
      return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">Deactivated</Badge>
    }
    if (user.approval_status === 'rejected') {
      return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">Rejected</Badge>
    }
    return <Badge variant="outline">{user.approval_status}</Badge>
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="HR Management"
        description="Manage HR access, approve requests, and deactivate accounts."
        icon={UserCheck}
      >

      </PageHeader>

      <Tabs value={status} onValueChange={setStatus} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{status.charAt(0).toUpperCase() + status.slice(1)} HR Users</CardTitle>
            <CardDescription>
              {status === 'pending' && "Confirm and enable verified HR users."}
              {status === 'approved' && "Manage active HR accounts."}
              {status === 'rejected' && "View rejected registration requests."}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
            {userCount} {status}
          </Badge>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              Failed to load users. Please refresh the page.
            </div>
          ) : userCount === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-muted-foreground">
              No {status} HR accounts found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hrUsers.map((hrUser) => (
                  <TableRow key={hrUser.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>{hrUser.id}</TableCell>
                    <TableCell>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto font-medium text-primary hover:underline decoration-primary/30"
                        onClick={() => setOtpConfirmUser(hrUser)}
                      >
                        {hrUser.email}
                      </Button>
                    </TableCell>
                    <TableCell>{hrUser.full_name}</TableCell>
                    <TableCell>
                      {getStatusBadge(hrUser)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {status === 'approved' && hrUser.is_active && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-primary/20 hover:bg-primary/5 text-primary font-bold"
                            onClick={() => setOtpConfirmUser(hrUser)}
                          >
                            Send OTP
                          </Button>
                        )}
                        {status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 text-xs font-bold"
                              disabled={processingId === hrUser.id}
                              onClick={() => handleReject(hrUser.id)}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 text-xs font-bold shadow-sm shadow-primary/20"
                              disabled={processingId === hrUser.id}
                              onClick={() => handleApprove(hrUser.id)}
                            >
                              <Check className="mr-1.5 h-3.5 w-3.5" />
                              Approve
                            </Button>
                          </>
                        )}
                        {status === 'approved' && hrUser.is_active && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 text-xs font-bold"
                            disabled={processingId === hrUser.id}
                            onClick={() => handleRemove(hrUser.id)}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Deactivate
                          </Button>
                        )}
                        {status === 'rejected' && (
                          <span className="text-xs text-muted-foreground italic">No actions available</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Confirm Action</DialogTitle>
            <DialogDescription className="text-base">{confirmAction?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-xl font-bold h-11" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-xl font-bold h-11 shadow-lg shadow-destructive/20" onClick={handleConfirm} disabled={!!processingId}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset OTP Confirmation Dialog */}
      <Dialog open={!!otpConfirmUser} onOpenChange={() => setOtpConfirmUser(null)}>
        <DialogContent className="max-w-md rounded-2xl border-primary/20 shadow-2xl">
          <DialogHeader className="space-y-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
              <UserCheck className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">Send Password Reset?</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground leading-relaxed">
              You are about to trigger a password reset OTP for <strong className="text-foreground">{otpConfirmUser?.full_name}</strong> ({otpConfirmUser?.email}). 
              <br /><br />
              The user will receive an email with a 6-digit code to update their password.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-2">
            <Button 
              variant="ghost" 
              className="flex-1 font-bold h-12 rounded-xl text-muted-foreground" 
              onClick={() => setOtpConfirmUser(null)}
              disabled={isSendingOtp}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 font-bold h-12 rounded-xl bg-primary shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all" 
              onClick={handleSendOTP}
              disabled={isSendingOtp}
            >
              {isSendingOtp ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Sending...
                </>
              ) : (
                'Send OTP'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
