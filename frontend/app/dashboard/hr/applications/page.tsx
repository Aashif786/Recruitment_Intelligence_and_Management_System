"use client";

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { APIClient } from '@/app/dashboard/lib/api-client'
import { RejectDialog } from '@/components/reject-dialog'
import useSWR, { useSWRConfig } from 'swr'
import { fetcher } from '@/app/dashboard/lib/swr-fetcher'
import { useRouter } from 'next/navigation'
import { API_BASE_URL } from '@/lib/config'
import { User, CheckCircle2, AlertTriangle, ListChecks, Clock, Brain, Mic, Loader2, ChevronLeft, ChevronRight, UserCircle } from 'lucide-react'

interface Application {
    id: number
    status: string
    applied_at: string
    candidate_name: string
    candidate_email: string
    candidate_photo_path: string | null
    job: {
        id: number
        job_id: string | null
        title: string
    }
    interview: {
        id: number
        test_id: string | null
        report: {
            aptitude_score: number | null
            technical_skills_score: number | null
            behavioral_score: number | null
        } | null
    } | null
    resume_extraction: {
        resume_score: number
        skill_match_percentage: number
    } | null
}

export default function HRApplicationsPage() {
  const router = useRouter();
  const {
    data: applications = [],
    error,
    isLoading,
    mutate,
  } = useSWR<Application[]>(
    "/api/applications",
    (url: string) => fetcher<Application[]>(url),
    { keepPreviousData: true },
  );
  const { mutate: globalMutate } = useSWRConfig();

  const handleDecision = async (
    applicationId: number,
    decision: "hired" | "rejected",
    reason?: string,
    notes?: string,
  ) => {
    // Optimistic update
    const updatedApps = applications.map((app) =>
      app.id === applicationId
        ? {
            ...app,
            status: decision === "hired" ? "hired" : "rejected_post_interview",
          }
        : app,
    );

    try {
      // Update local cache immediately
      mutate(updatedApps, false);

      let userComments = `Candidate ${decision} via quick action in applications list.`;
      if (decision === "rejected") {
        userComments = `Reason: ${reason}${notes ? `\nNotes: ${notes}` : ""}`;
      }

      await APIClient.put(
        `/api/decisions/applications/${applicationId}/decide`,
        {
          decision,
          decision_comments: userComments,
        },
      );

      // Revalidate
      mutate();
      // Also update dashboard stats if they are cached
      globalMutate("/api/analytics/dashboard");
    } catch (err) {
      // Rollback on error
      mutate();
      console.error("Failed to make decision:", err);
      const errorMsg =
        (err as any)?.response?.data?.detail ||
        "Failed to make decision. Ensure the candidate has completed the interview Round.";
      alert(errorMsg);
      throw err;
    }
  };

  const handleStatusUpdate = async (
    applicationId: number,
    status: string,
    reason?: string,
    notes?: string,
  ) => {
    // Optimistic update
    const updatedApps = applications.map((app) =>
      app.id === applicationId ? { ...app, status } : app,
    );

    try {
      mutate(updatedApps, false);

      let userNotes = `Status updated to ${status} via quick action.`;
      if (status === "rejected") {
        userNotes = `Reason: ${reason}${notes ? `\nNotes: ${notes}` : ""}`;
      }

      await APIClient.put(`/api/applications/${applicationId}/status`, {
        status,
        hr_notes: userNotes,
      });

      mutate();
      globalMutate("/api/analytics/dashboard");
    } catch (err) {
      mutate();
      console.error("Failed to update status:", err);
      const errorMsg =
        (err as any)?.response?.data?.detail || "Failed to update status.";
      alert(errorMsg);
      throw err;
    }
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");


  const filteredApplications = applications
    .filter((app) => {
      // Global search (candidate name, candidate email, job title, job ID, candidate ID)
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        (app.candidate_name || "").toLowerCase().includes(search) ||
        (app.candidate_email || "").toLowerCase().includes(search) ||
        (app.job.title || "").toLowerCase().includes(search) ||
        (app.job.job_id || "").toLowerCase().includes(search) ||
        (app.id || "").toString().includes(search);

      // Status filter
      let matchesStatus = statusFilter === "all" || app.status === statusFilter;
      if (statusFilter === "rejected") {
        matchesStatus =
          app.status === "rejected" || app.status === "rejected_post_interview";
      }

      // Date filter (matching YYYY-MM-DD)
      const appDate = new Date(app.applied_at).toISOString().split("T")[0];
      const matchesDate = !dateFilter || appDate === dateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      // Default sort: Newest First
      return (
        new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime()
      );
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted': return 'capsule-badge-primary'
            case 'review_later': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            case 'approved_for_interview': return 'capsule-badge-info'
            case 'interview_completed': return 'capsule-badge-success'
            case 'hired': return 'capsule-badge-success'
            case 'rejected':
            case 'rejected_post_interview': return 'capsule-badge-destructive'
            default: return 'capsule-badge-neutral'
        }
    }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-black text-foreground mb-2 tracking-tight">
        Applications
      </h1>
      <p className="text-muted-foreground mb-8">
        Review and manage candidate applications.
      </p>

      {/* Filters Toolbar */}
      <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4 duration-700 ease-out">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Combined Search Bar */}
          <div className="flex-1 min-w-[300px]">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Search Candidates</Label>
            <div className="relative group">
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground group-focus-within:text-primary h-5 w-5 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search candidate name, ID, or job details..."
                className="w-full pl-12 pr-4 h-11 bg-background border-2 border-input rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-sm placeholder:text-muted-foreground text-foreground"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-48">
             <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Status</Label>
             <select 
               className="w-full h-11 bg-background border-2 border-input rounded-xl px-4 focus:outline-none focus:border-primary text-sm"
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value)}
             >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="approved_for_interview">Approved for Interview</option>
                <option value="interview_completed">Interview Completed</option>
                <option value="review_later">Review Later</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
             </select>
          </div>

          {/* Date Filter */}
          <div className="w-full sm:w-48">
             <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Applied Date</Label>
             <input 
               type="date"
               className="w-full h-11 bg-background border-2 border-input rounded-xl px-4 focus:outline-none focus:border-primary text-sm"
               value={dateFilter}
               onChange={(e) => setDateFilter(e.target.value)}
             />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Fetching applications...</p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="text-center py-24 bg-card rounded-2xl border-2 border-dashed border-border flex flex-col items-center">
          <div className="bg-muted p-4 rounded-full mb-4">
             <User className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-bold text-foreground">No candidates found</p>
          <p className="text-muted-foreground mt-1 text-sm max-w-xs">
            We couldn't find any applications matching your current search or filters.
          </p>
          {(searchTerm || statusFilter !== 'all' || dateFilter) && (
             <Button 
               variant="link" 
               className="mt-4 text-primary"
               onClick={() => {
                 setSearchTerm('');
                 setStatusFilter('all');
                 setDateFilter('');
               }}
             >
                Clear all filters
             </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {filteredApplications.map((app, index) => (
            <Card
              key={app.id}
              onClick={() =>
                router.push(`/dashboard/hr/applications/${app.id}`)
              }
              style={{ animationDelay: `${index * 50}ms` }}
              className="hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-card border-2 border-border/40 hover:border-primary/30 cursor-pointer group animate-in fade-in slide-in-from-bottom-6 fill-mode-both"
            >
              <CardContent className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-6 flex-1">
                  <div className="relative shrink-0">
                    <div className="h-20 w-20 rounded-2xl overflow-hidden border-2 border-border/50 bg-slate-100 flex items-center justify-center shadow-lg group-hover:border-primary/50 transition-colors">
                      {app.candidate_photo_path ? (
                        <img
                          src={`${API_BASE_URL}/uploads/${app.candidate_photo_path.replace(/\\/g, "/")}`}
                          alt={app.candidate_name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                             (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(app.candidate_name) + '&background=random';
                          }}
                        />
                      ) : (
                        <span className="text-2xl font-black text-slate-400">
                          {app.candidate_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors pr-2">
                        {app.candidate_name}
                      </h3>
                      <div className="flex gap-1.5">
                        {app.job.job_id && (
                            <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full text-muted-foreground border border-border/50 uppercase">
                            ID: {app.job.job_id}
                            </span>
                        )}
                        {app.interview?.test_id && (
                            <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full text-muted-foreground border border-border/50 uppercase">
                            REF: {app.interview.test_id}
                            </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Applying for{" "}
                      <span className="text-foreground">
                        {app.job.title}
                      </span>
                    </p>
                    
                    <div className="flex flex-wrap gap-3 mt-4 text-xs font-semibold items-center">
                      <span className="flex items-center gap-1.5 text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-lg border">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(app.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      
                      {app.resume_extraction && (
                        <span className="text-primary bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/20">
                          Match Score: {Number(app.resume_extraction.resume_score).toFixed(1)}/10
                        </span>
                      )}

                      {app.interview?.report && (
                        <div className="flex flex-wrap gap-2">
                          {app.interview.report.aptitude_score !== null && (
                            <span className="text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                              Aptitude: {Number(app.interview.report.aptitude_score).toFixed(1)}
                            </span>
                          )}
                          {app.interview.report.technical_skills_score !== null && (
                            <span className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                              Technical: {Number(app.interview.report.technical_skills_score).toFixed(1)}
                            </span>
                          )}
                          {app.interview.report.behavioral_score !== null && (
                            <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                              Behavioral: {Number(app.interview.report.behavioral_score).toFixed(1)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div
                      className="flex flex-wrap gap-3 pt-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(app.status === "submitted" || app.status === "review_later") && (
                        <>
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-[11px] font-bold h-9 px-4 rounded-xl shadow-md uppercase tracking-wider transition-all"
                            onClick={(e) => {
                              e.preventDefault();
                              handleStatusUpdate(app.id, "approved_for_interview");
                            }}
                          >
                            Approve Interview
                          </Button>
                          <RejectDialog
                            candidateName={app.candidate_name}
                            onConfirm={(reason, notes) => handleStatusUpdate(app.id, "rejected", reason, notes)}
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-bold h-9 px-4 rounded-xl uppercase tracking-wider transition-all"
                              >
                                Reject
                              </Button>
                            }
                          />
                        </>
                      )}

                      {app.status === "interview_completed" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-200 text-amber-600 hover:bg-amber-50 text-[11px] font-bold h-9 px-4 rounded-xl uppercase tracking-wider transition-all"
                            onClick={(e) => {
                              e.preventDefault();
                              handleStatusUpdate(app.id, "review_later");
                            }}
                          >
                            Waitlist
                          </Button>
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-[11px] font-bold h-9 px-4 rounded-xl shadow-md uppercase tracking-wider transition-all"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDecision(app.id, "hired");
                            }}
                          >
                            CALL FOR FACE TO FACE
                          </Button>
                          <RejectDialog
                            candidateName={app.candidate_name}
                            onConfirm={(reason, notes) => handleDecision(app.id, "rejected", reason, notes)}
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-bold h-9 px-4 rounded-xl uppercase tracking-wider transition-all"
                              >
                                Reject
                              </Button>
                            }
                          />
                        </>
                      )}

                      {app.status === "approved_for_interview" && (
                         <RejectDialog
                            candidateName={app.candidate_name}
                            onConfirm={(reason, notes) => handleStatusUpdate(app.id, "rejected", reason, notes)}
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-bold h-9 px-4 rounded-xl uppercase tracking-wider transition-all"
                              >
                                Cancel & Reject
                              </Button>
                            }
                          />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 shrink-0 lg:border-l lg:pl-8 border-border/60">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border-2 shadow-sm ${getStatusColor(app.status)}`}>
                    {app.status.replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center gap-1.5 text-primary text-sm font-bold opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    View Profile
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
