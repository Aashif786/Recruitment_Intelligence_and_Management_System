'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, AlertCircle, BarChart, XCircle, Activity } from 'lucide-react'
import { StatusChart } from '@/components/reports/Charts'
import { ReportCard } from '@/components/reports/ReportCard'
import { isInterviewNotCompleted } from '@/components/reports/interviewIncomplete'
import { getRecommendationLabel, getRecommendationColor } from '@/lib/recommendation-label'
import dayjs from 'dayjs'
import type { Report } from '@/app/dashboard/hr/reports/page'
import type { AppliedFilters } from './ReportFilters'

interface ReportDashboardProps {
  filteredReports: Report[]
  metrics: {
    total: number
    selected: number
    hold: number
    rejected: number
    terminated: number
    incomplete: number
    avgScore: string
    avgQuestions: string
    totalApplied: number
    totalFinished: number
    }
  hideStats: boolean
  onHideStatsChange: (value: boolean) => void
  activeTab: string
  setActiveTab: (tab: string) => void
  reportsPage: number
  setReportsPage: React.Dispatch<React.SetStateAction<number>>
  reportsPerPage: number
  setReportsPerPage: (limit: number) => void
  totalCount: number
  totalPages: number
  isExportingCsv: boolean
  downloadCSV: () => Promise<void>
  setViewingReport: (report: Report | null) => void
  appliedFilters: AppliedFilters
  onRemoveAppliedFilter: (key: keyof AppliedFilters) => void
  onClearFilters: () => void
  allJobsData: any[] | undefined
}

const getStatusLabel = (status: string) => {
  return status?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || status
}

export const ReportDashboard = React.memo(function ReportDashboard({
  filteredReports,
  metrics,
  hideStats,
  onHideStatsChange,
  activeTab,
  setActiveTab,
  reportsPage,
  setReportsPage,
  reportsPerPage,
  setReportsPerPage,
  totalCount,
  totalPages,
  isExportingCsv,
  downloadCSV,
  setViewingReport,
  appliedFilters,
  onRemoveAppliedFilter,
  onClearFilters,
  allJobsData,
}: ReportDashboardProps) {
  const isAnyFilterActive = useMemo(() => {
    return (
      appliedFilters.search !== '' ||
      appliedFilters.status !== 'All' ||
      appliedFilters.job !== 'All' ||
      appliedFilters.skill !== 'All' ||
      appliedFilters.experience !== 'All' ||
      (appliedFilters.score[0] !== 0 || appliedFilters.score[1] !== 10) ||
      appliedFilters.from !== null ||
      appliedFilters.to !== null ||
      appliedFilters.date !== undefined
    )
  }, [appliedFilters])

  return (
    <div className="lg:col-span-3  flex-1 md:col-span-2 space-y-4 lg:h-[calc(100vh-8.5rem)] lg:max-h-[calc(100vh-8.5rem)] lg:overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
      {/* Compact Metrics Strip */}
      {!hideStats && (
        <div className="animate-in fade-in slide-in-from-top-8 duration-700 ease-out fill-mode-both delay-100 rounded-2xl border border-border/80 bg-card/45 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] px-4 py-3">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="rounded-xl bg-muted/30 border border-border/40 px-3 py-2 hover:bg-muted/50 hover:border-primary/20 transition-all duration-200">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Applied</p>
              <p className="text-2xl font-black leading-tight text-foreground tabular-nums">{metrics.totalApplied}</p>
            </div>
            <div className="rounded-xl bg-muted/30 border border-border/40 px-3 py-2 hover:bg-muted/50 hover:border-primary/20 transition-all duration-200">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Finished</p>
              <p className="text-2xl font-black leading-tight text-foreground tabular-nums">{metrics.totalFinished}</p>
            </div>
            <div className="rounded-xl bg-muted/30 border border-border/40 px-3 py-2 hover:bg-muted/50 hover:border-primary/20 transition-all duration-200">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total Reports</p>
              <p className="text-2xl font-black leading-tight text-foreground tabular-nums">{metrics.total}</p>
            </div>
            <div className="rounded-xl bg-primary/5 border border-primary/15 px-3 py-2 hover:bg-primary/10 transition-all duration-200">
              <p className="text-[10px] uppercase tracking-widest text-primary/70 font-bold">Avg Score</p>
              <p className="text-2xl font-black leading-tight text-primary tabular-nums">{metrics.avgScore}</p>
            </div>
            <div className="rounded-xl bg-muted/30 border border-border/40 px-3 py-2 hover:bg-muted/50 hover:border-primary/20 transition-all duration-200">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Avg Questions</p>
              <p className="text-2xl font-black leading-tight text-foreground tabular-nums">{metrics.avgQuestions}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 px-3 py-2 hover:bg-emerald-500/10 transition-all duration-200">
              <p className="text-[10px] uppercase tracking-widest text-emerald-600/70 dark:text-emerald-400/70 font-bold">Selection Rate</p>
              <p className="text-2xl font-black leading-tight text-emerald-600 dark:text-emerald-400 tabular-nums">{metrics.total > 0 ? Math.round((metrics.selected / metrics.total) * 100) : 0}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {isAnyFilterActive && (
        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
          {appliedFilters.search && (
            <Badge onClick={() => onRemoveAppliedFilter('search')} variant="secondary" className="px-2 py-1 flex items-center gap-1 bg-primary/5 border-primary/20 text-primary">
              Search: {appliedFilters.search}
              <XCircle className="h-3 w-3 cursor-pointer hover:text-destructive" />
            </Badge>
          )}
          {appliedFilters.status !== 'All' && (
            <Badge onClick={() => onRemoveAppliedFilter('status')} variant="secondary" className="px-2 py-1 flex items-center gap-1 bg-primary/5 border-primary/20 text-primary">
              Status: {appliedFilters.status === 'Select' ? 'Selected' : appliedFilters.status === 'Consider' ? 'On Hold' : appliedFilters.status === 'Reject' ? 'Rejected' : getStatusLabel(appliedFilters.status)}
              <XCircle className="h-3 w-3 cursor-pointer hover:text-destructive" />
            </Badge>
          )}
          {appliedFilters.job !== 'All' && (
            <Badge onClick={() => onRemoveAppliedFilter('job')} variant="secondary" className="px-2 py-1 flex items-center gap-1 bg-primary/5 border-primary/20 text-primary">
              Job: {allJobsData?.find((j: any) => String(j.id) === String(appliedFilters.job))?.title || 'Selected Job'}
              <XCircle className="h-3 w-3 cursor-pointer hover:text-destructive" />
            </Badge>
          )}
          {appliedFilters.skill !== 'All' && (
            <Badge onClick={() => onRemoveAppliedFilter('skill')} variant="secondary" className="px-2 py-1 flex items-center gap-1 bg-primary/5 border-primary/20 text-primary">
              Skill: {appliedFilters.skill.split(/[_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
              <XCircle className="h-3 w-3 cursor-pointer hover:text-destructive" />
            </Badge>
          )}
          {appliedFilters.experience !== 'All' && (
            <Badge onClick={() => onRemoveAppliedFilter('experience')} variant="secondary" className="px-2 py-1 flex items-center gap-1 bg-primary/5 border-primary/20 text-primary">
              Exp: {appliedFilters.experience}
              <XCircle className="h-3 w-3 cursor-pointer hover:text-destructive" />
            </Badge>
          )}
          {(appliedFilters.score[0] !== 0 || appliedFilters.score[1] !== 10) && (
            <Badge onClick={() => onRemoveAppliedFilter('score')} variant="secondary" className="px-2 py-1 flex items-center gap-1 bg-primary/5 border-primary/20 text-primary">
              Score: {appliedFilters.score[0]} - {appliedFilters.score[1]}
              <XCircle className="h-3 w-3 cursor-pointer hover:text-destructive" />
            </Badge>
          )}
          {appliedFilters.from && (
            <Badge onClick={() => onRemoveAppliedFilter('from')} variant="secondary" className="px-2 py-1 flex items-center gap-1 bg-primary/5 border-primary/20 text-primary">
              From: {dayjs(appliedFilters.from).format('MMM D, YYYY')}
              <XCircle className="h-3 w-3 cursor-pointer hover:text-destructive" />
            </Badge>
          )}
          {appliedFilters.to && (
            <Badge onClick={() => onRemoveAppliedFilter('to')} variant="secondary" className="px-2 py-1 flex items-center gap-1 bg-primary/5 border-primary/20 text-primary">
              To: {dayjs(appliedFilters.to).format('MMM D, YYYY')}
              <XCircle className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => onRemoveAppliedFilter('to')} />
            </Badge>
          )}
          {appliedFilters.date && (
            <Badge onClick={() => onRemoveAppliedFilter('date')} variant="secondary" className="px-2 py-1 flex items-center gap-1 bg-primary/5 border-primary/20 text-primary">
              On: {dayjs(appliedFilters.date).format('MMM D, YYYY')}
              <XCircle className="h-3 w-3 cursor-pointer hover:text-destructive"  />
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearFilters}
            className="h-6 text-[10px] uppercase text-muted-foreground hover:text-destructive font-bold"
          >
            Clear All
          </Button>
        </div>
      )}

      {/* Status Stats */}
      {!hideStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 animate-in fade-in slide-in-from-top-8 duration-700 ease-out fill-mode-both delay-200">
          <div className="bg-card/45 backdrop-blur-xl p-4 rounded-2xl border border-border/80 border-l-[3px] border-l-emerald-500 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_30px_rgb(0,0,0,0.05)] hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-300">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">High Performers (&gt; 6)</p>
            <div className="text-emerald-500 font-black text-2xl tabular-nums">{metrics.selected}</div>
          </div>
          <div className="bg-card/45 backdrop-blur-xl p-4 rounded-2xl border border-border/80 border-l-[3px] border-l-amber-500 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_30px_rgb(0,0,0,0.05)] hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-300">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Average (4-6)</p>
            <div className="text-amber-500 font-black text-2xl tabular-nums">{metrics.hold}</div>
          </div>
          <div className="bg-card/45 backdrop-blur-xl p-4 rounded-2xl border border-border/80 border-l-[3px] border-l-red-500 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_30px_rgb(0,0,0,0.05)] hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-300">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Low Performers (&lt; 4)</p>
            <div className="text-red-500 font-black text-2xl tabular-nums">{metrics.rejected}</div>
          </div>
          <div className="bg-card/45 backdrop-blur-xl p-4 rounded-2xl border border-border/80 border-l-[3px] border-l-slate-400 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_30px_rgb(0,0,0,0.05)] hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-300">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Terminated</p>
            <div className="text-muted-foreground font-black text-2xl tabular-nums">{metrics.terminated}</div>
          </div>
          <div className="bg-card/45 backdrop-blur-xl p-4 rounded-2xl border border-border/80 border-l-[3px] border-l-orange-500 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_30px_rgb(0,0,0,0.05)] hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-300">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Incomplete</p>
            <div className="text-orange-500 font-black text-2xl tabular-nums">{metrics.incomplete}</div>
          </div>
        </div>
      )}

      {/* Reports List / Results */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList className="h-11 rounded-full p-1 bg-muted/80 border border-border/60">
            <TabsTrigger value="detailed" className="rounded-full px-5 h-full">Detailed View</TabsTrigger>
            <TabsTrigger value="table" className="rounded-full px-5 h-full">Table View</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-full px-5 h-full">Summary Analytics</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-3">
            <div className="flex flex-row h-11 items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Hide Stats</p>
                <Switch
                  id="hide-stats" 
                  checked={hideStats}
                  onCheckedChange={onHideStatsChange}
                />
            </div>
            {activeTab === 'table' && (
              <Button
                onClick={() => void downloadCSV()}
                disabled={isExportingCsv || totalCount === 0}
                variant="outline" 
                className="gap-2 bg-background hover:bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300 shadow-sm h-11 rounded-full px-6 font-bold animate-in fade-in slide-in-from-right-4 duration-300"
              >
                <FileText className="h-4 w-4" /> {isExportingCsv ? 'Exporting…' : 'Export all filtered'}
              </Button>
            )}

            <div className="flex items-center gap-2.5 bg-slate-100/80 dark:bg-slate-800/50 px-4 h-11 rounded-full border border-slate-200/60 dark:border-slate-700/50 shadow-sm animate-in fade-in zoom-in duration-500">
              <span className="text-[13px] font-bold text-muted-foreground tracking-tight">Show</span>
              <Select
                value={String(reportsPerPage)}
                onValueChange={(v) => {
                  setReportsPerPage(Number(v))
                  setReportsPage(1)
                }}
              >
                <SelectTrigger className="h-8 w-[84px] rounded-full bg-background border-border text-[14px] font-extrabold text-foreground shadow-none focus:ring-2 focus:ring-primary/20 transition-all hover:border-primary/40 px-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border shadow-xl">
                  <SelectItem value="10" className="rounded-lg focus:bg-primary/10">10</SelectItem>
                  <SelectItem value="25" className="rounded-lg focus:bg-primary/10">25</SelectItem>
                  <SelectItem value="50" className="rounded-lg focus:bg-primary/10">50</SelectItem>
                  <SelectItem value="100" className="rounded-lg focus:bg-primary/10">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-[13px] font-bold text-muted-foreground tracking-tight">per page</span>
            </div>
          </div>
        </div>

        <TabsContent value="detailed" className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-both delay-300">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {filteredReports.length > 0 ? (
                filteredReports.map((report: Report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onClick={() => setViewingReport(report)}
                  />
                ))
              ) : (
                <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-2xl bg-muted/10 animate-in fade-in zoom-in duration-500">
                  <div className="bg-muted/20 p-4 rounded-full mb-4">
                    <AlertCircle className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                  <p className="text-lg font-bold text-muted-foreground">No reports found</p>
                  <p className="text-sm text-muted-foreground/60 max-w-[280px] text-center mt-1">
                    Try adjusting your filters or search query to find what you're looking for.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="table" className="animate-in fade-in zoom-in-95 duration-300">
          <Card className="bg-card/45 backdrop-blur-xl border border-border/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30 border-b border-border/40">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead>Candidate</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Applied For</TableHead>
                    <TableHead className="text-right">Aptitude</TableHead>
                    <TableHead className="text-right">Behavioral</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-center">Suggestion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report: Report) => (
                    <TableRow
                      key={report.id}
                      className="cursor-pointer hover:bg-muted/30 border-b border-border/10 last:border-b-0 transition-all duration-200"
                      onClick={() => setViewingReport(report)}
                    >
                      <TableCell className="font-semibold text-foreground">
                        {report.candidate_profile.candidate_name || report.filename.replace('.json', '')}
                      </TableCell>
                      <TableCell>{report.display_date_short}</TableCell>
                      <TableCell className="text-sm">{report.candidate_profile.applied_role || 'N/A'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {report.aptitude_score !== undefined && report.aptitude_score !== null ? report.aptitude_score.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {report.behavioral_score !== undefined && report.behavioral_score !== null ? report.behavioral_score.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">{report.overall_score.toFixed(1)}</TableCell>
                      <TableCell className="text-center">
                        {isInterviewNotCompleted(report) ? (
                          <Badge
                            variant="outline"
                            className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30"
                          >
                            Incomplete
                          </Badge>
                        ) : (
                          <Badge variant="outline" className={getRecommendationColor(report.overall_score)}>
                            {getRecommendationLabel(report.overall_score)}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredReports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No reports found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {activeTab !== 'analytics' && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-border">
            <div className="text-sm text-muted-foreground font-medium">
              Showing <span className="font-semibold text-foreground/80">{Math.min(reportsPerPage, totalCount)}</span> of <span className="font-semibold text-foreground/80">{totalCount}</span> reports
            </div>
            
            <div className="flex flex-wrap items-center gap-6">
              <div className="text-sm font-medium text-muted-foreground">
                Page <span className="text-foreground/80 font-semibold">{reportsPage}</span> of {totalPages}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReportsPage(prev => prev - 1)}
                  disabled={reportsPage <= 1}
                  className="h-8 px-4 rounded-xl font-bold bg-background dark:bg-muted border-border transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReportsPage(prev => prev + 1)}
                  disabled={reportsPage >= totalPages}
                  className="h-8 px-4 rounded-xl font-bold bg-background dark:bg-muted border-border transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  Next
                </Button>
              </div>

              <div className="text-sm font-semibold text-foreground/80 uppercase tracking-widest hidden lg:block border-l pl-6 border-border">
                Total {totalCount} Reports
              </div>
            </div>
          </div>
        )}

        <TabsContent value="analytics" className="animate-in fade-in zoom-in-95 duration-300">
          {metrics.total > 0 ? (
            <Card className="bg-card/45 backdrop-blur-xl border border-border/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-2xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-primary" />
                  Overview & Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row gap-8 items-start py-4">
                  <div className="flex-1 w-full h-[280px] relative">
                    <StatusChart data={[
                      { name: 'Selected', value: metrics.selected, color: '#10b981' },
                      { name: 'Hold', value: metrics.hold, color: '#f59e0b' },
                      { name: 'Rejected', value: metrics.rejected, color: '#ef4444' },
                      { name: 'Terminated', value: metrics.terminated, color: '#b91c1c' },
                      { name: 'Incomplete', value: metrics.incomplete, color: '#f97316' }
                    ].filter(d => d.value > 0)} />
                  </div>

                  <div className="w-full lg:w-1/2 grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-card/45 backdrop-blur-xl p-6 rounded-2xl border border-border/80 text-center flex flex-col justify-center shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_30px_rgb(0,0,0,0.05)] hover:border-primary/20 transition-all duration-300 active:scale-[0.98]">
                      <div className="text-3xl font-black text-foreground tracking-tight">{metrics.avgScore}</div>
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Avg Score</div>
                    </div>
                    <div className="bg-card/45 backdrop-blur-xl p-6 rounded-2xl border border-border/80 text-center flex flex-col justify-center shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_30px_rgb(0,0,0,0.05)] hover:border-primary/20 transition-all duration-300 active:scale-[0.98]">
                      <div className="text-3xl font-black text-foreground tracking-tight">{metrics.total}</div>
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Interviews</div>
                    </div>
                    <div className="bg-card/45 backdrop-blur-xl p-6 rounded-2xl border border-border/80 text-center flex flex-col justify-center shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_30px_rgb(0,0,0,0.05)] hover:border-primary/20 transition-all duration-300 active:scale-[0.98]">
                      <div className="text-3xl font-black text-foreground tracking-tight">{metrics.avgQuestions}</div>
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Avg Qs</div>
                    </div>
                    <div className="bg-card/45 backdrop-blur-xl p-6 rounded-2xl border border-border/80 text-center flex flex-col justify-center shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_30px_rgb(0,0,0,0.05)] hover:border-primary/20 transition-all duration-300 active:scale-[0.98]">
                      <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                        {metrics.total > 0 ? Math.round((metrics.selected / metrics.total) * 100) : 0}%
                      </div>
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Success Rate</div>
                    </div>
                    <div className="bg-card/45 backdrop-blur-xl p-6 rounded-2xl border border-border/80 text-center flex flex-col justify-center shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_30px_rgb(0,0,0,0.05)] hover:border-primary/20 transition-all duration-300 active:scale-[0.98]">
                      <div className="text-3xl font-black text-foreground tracking-tight">{metrics.totalApplied}</div>
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Total Applied</div>
                    </div>
                    <div className="bg-card/45 backdrop-blur-xl p-6 rounded-2xl border border-border/80 text-center flex flex-col justify-center shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_30px_rgb(0,0,0,0.05)] hover:border-primary/20 transition-all duration-300 active:scale-[0.98]">
                      <div className="text-3xl font-black text-foreground tracking-tight">{metrics.totalFinished}</div>
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Total Finished</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-80 flex flex-col items-center justify-center border border-dashed rounded-3xl bg-muted/5 animate-in fade-in zoom-in duration-500">
              <div className="bg-muted/10 p-5 rounded-full mb-4">
                <Activity className="h-12 w-12 text-muted-foreground/20" />
              </div>
              <p className="text-xl font-black text-muted-foreground tracking-tight">No analysis data available</p>
              <p className="text-sm text-muted-foreground/50 max-w-[320px] text-center mt-2 font-medium">
                We couldn't find any reports matching your current filter criteria to generate analytics.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onClearFilters}
                className="mt-6 rounded-full px-6 font-bold hover:bg-primary hover:text-white transition-all"
              >
                Clear Filters
              </Button>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
})
