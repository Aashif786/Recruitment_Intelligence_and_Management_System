'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Filter, Search, CheckCircle2, RotateCcw } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import dayjs, { Dayjs } from 'dayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { PickerDay, PickerDayProps } from '@mui/x-date-pickers'
import { Box } from '@mui/material'

export interface AppliedFilters {
  search: string
  status: string
  job: string
  skill: string
  experience: string
  score: number[]
  from: Dayjs | null
  to: Dayjs | null
  date: Date | undefined
}

interface ReportFiltersProps {
  appliedFilters: AppliedFilters
  onApplyFilters: (filters: AppliedFilters) => void
  onClearFilters: () => void
  allJobsData: any[] | undefined
  hideStats: boolean
  interviewCounts: Record<string, number>
}

const UNIQUE_EXPERIENCES = ["intern", "junior", "mid", "senior", "lead"]

const SKILL_CATEGORIES = [
  "backend", "business_analyst", "business_intelligence", "CAE-MECHANICAL",
  "customer_support", "cybersecurity", "data_analysis", "database_admin",
  "devops", "digital_marketing", "electrical", "embedded_systems",
  "finance_accounting", "frontend", "fullstack", "generative_ai",
  "graphic_design", "healthcare_it", "hr", "instrumentation", "legal",
  "mobile", "networking", "project_management", "qa_testing", "sales_crm",
  "Steel_detailing", "ui_ux", "video_editing"
]

export const ReportFilters = React.memo(function ReportFilters({
  appliedFilters,
  onApplyFilters,
  onClearFilters,
  allJobsData,
  hideStats,
  interviewCounts,
}: ReportFiltersProps) {
  const [searchQuery, setSearchQuery] = useState(appliedFilters.search)
  const [jobFilter, setJobFilter] = useState(appliedFilters.job)
  const [statusFilter, setStatusFilter] = useState(appliedFilters.status)
  const [experienceFilter, setExperienceFilter] = useState(appliedFilters.experience)
  const [skillFilter, setSkillFilter] = useState(appliedFilters.skill)
  const [scoreRange, setScoreRange] = useState(appliedFilters.score)
  const [pendingScoreRange, setPendingScoreRange] = useState(appliedFilters.score)
  const [fromDate, setFromDate] = useState<Dayjs | null>(appliedFilters.from)
  const [toDate, setToDate] = useState<Dayjs | null>(appliedFilters.to)
  const [dateFilter, setDateFilter] = useState<Date | undefined>(appliedFilters.date)

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  React.useEffect(() => {
    setSearchQuery(appliedFilters.search)
    setJobFilter(appliedFilters.job)
    setStatusFilter(appliedFilters.status)
    setSkillFilter(appliedFilters.skill)
    setExperienceFilter(appliedFilters.experience)
    setScoreRange(appliedFilters.score)
    setPendingScoreRange(appliedFilters.score)
    setFromDate(appliedFilters.from)
    setToDate(appliedFilters.to)
    setDateFilter(appliedFilters.date)
  }, [appliedFilters])

  const isAnyFilterActive = useMemo(() => {
    return (
      searchQuery !== '' ||
      statusFilter !== 'Default' ||
      jobFilter !== 'All' ||
      skillFilter !== 'All' ||
      experienceFilter !== 'All' ||
      (scoreRange[0] !== 0 || scoreRange[1] !== 10) ||
      fromDate !== null ||
      toDate !== null ||
      dateFilter !== undefined
    )
  }, [searchQuery, statusFilter, jobFilter, skillFilter, experienceFilter, scoreRange, fromDate, toDate, dateFilter])

  const isDirty = useMemo(() => {
    return (
      searchQuery !== appliedFilters.search ||
      statusFilter !== appliedFilters.status ||
      jobFilter !== appliedFilters.job ||
      skillFilter !== appliedFilters.skill ||
      experienceFilter !== appliedFilters.experience ||
      scoreRange[0] !== appliedFilters.score[0] ||
      scoreRange[1] !== appliedFilters.score[1] ||
      fromDate !== appliedFilters.from ||
      toDate !== appliedFilters.to ||
      dateFilter !== appliedFilters.date
    )
  }, [searchQuery, statusFilter, jobFilter, skillFilter, experienceFilter, scoreRange, fromDate, toDate, dateFilter, appliedFilters])

  const handleApply = () => {
    onApplyFilters({
      search: searchQuery,
      status: statusFilter,
      job: jobFilter,
      skill: skillFilter,
      experience: experienceFilter,
      score: scoreRange,
      from: fromDate,
      to: toDate,
      date: dateFilter
    })
  }

  const ReportDensityDay = (props: PickerDayProps) => {
    const dayKey = props.day.toDate().toDateString()
    const count = interviewCounts[dayKey] || 0
    const intensity = count >= 5 ? 1 : count >= 3 ? 0.75 : count >= 1 ? 0.5 : 0
    return (
      <PickerDay
        {...props}
        sx={{
          ...(count > 0 && {
            boxShadow: `inset 0 -3px 0 0 hsl(var(--primary) / ${intensity})`,
            fontWeight: 600,
          }),
        }}
      />
    )
  }

  return (
    <div className="lg:sticky lg:col-span-1 md:col-span-1 lg:h-[calc(100vh-08.5rem)] lg:max-h-[calc(100vh-8.5rem)] flex flex-col animate-in fade-in slide-in-from-left-8 duration-700 ease-out fill-mode-both">
      <Card className="h-full flex flex-col shadow-sm border-border/40 !py-0 !gap-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="p-3 !pb-0 shrink-0 border-b border-border/30">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Interview Reports</h2>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" /> Filters
            </CardTitle>
            <div className="flex items-center gap-1.5 min-w-[40px] justify-end">
              <TooltipProvider delayDuration={100}>
                {isAnyFilterActive && (
                  <div className="flex items-center animate-in slide-in-from-right-4 duration-300">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
                          onClick={onClearFilters}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="text-[10px]">Clear all filters</TooltipContent>
                    </Tooltip>
                  </div>
                )}

                {isDirty && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full animate-in zoom-in spin-in-90 duration-300 shadow-sm border border-emerald-100"
                        onClick={handleApply}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] font-bold">Click to apply filters</TooltipContent>
                  </Tooltip>
                )}

                {!isAnyFilterActive && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground/40 cursor-not-allowed opacity-50"
                    disabled
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">

          {/* Search */}
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="search" className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <TooltipProvider delayDuration={150}>
                <Tooltip open={searchQuery.length > 0 && debouncedSearchQuery !== searchQuery}>
                  <TooltipTrigger asChild>
                    <Input
                      id="search"
                      placeholder="Candidate Name"
                      className="pl-8"
                      value={searchQuery}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApply();
                        }
                      }}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start" className="text-xs">
                    Press Enter after typing
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 space-y-2">
            <Label htmlFor="job-filter" className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Filter by Job</Label>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger id="job-filter" className="w-full h-9 text-sm rounded-lg bg-background/50 border-border/40">
                <SelectValue placeholder="All Jobs" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="All">All Jobs</SelectItem>
                {allJobsData?.map((job: any) => (
                  <SelectItem key={job.id} value={String(job.id)}>{job.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grouped Status/Exp/Skill Filters */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 ">
            {/* Status Filter */}
            <div className="space-y-1  rounded-xl border border-border/50 bg-muted/25">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full h-5 text-xs rounded-lg bg-background/40 border-border/30">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="Default">All Reports</SelectItem>
                  <SelectItem value="Select">High Score (&gt;6)</SelectItem>
                  <SelectItem value="Consider">Average Score (4-6)</SelectItem>
                  <SelectItem value="Reject">Low Score (&lt;4)</SelectItem>
                  <SelectItem value="Terminated">Terminated</SelectItem>
                  <SelectItem value="Not Completed">Incomplete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Experience Filter */}
            <div className="space-y-1 rounded-xl border border-border/50 bg-muted/25">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Exp.</Label>
              <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                <SelectTrigger className="w-full h-9 text-xs rounded-lg bg-background/40 border-border/30">
                  <SelectValue placeholder="Exp." />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="All">All Levels</SelectItem>
                  {UNIQUE_EXPERIENCES.map((exp, idx) => (
                    <SelectItem key={idx} value={exp}>{exp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Skill Filter */}
            <div className="space-y-1  rounded-xl border border-border/50 bg-muted/25">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Skills</Label>
              <Select value={skillFilter} onValueChange={setSkillFilter}>
                <SelectTrigger className="w-full h-9 text-xs rounded-lg bg-background/40 border-border/30">
                  <SelectValue placeholder="Skills" />
                </SelectTrigger>
                <SelectContent className="rounded-lg max-h-[300px]">
                  <SelectItem value="All">All Skills</SelectItem>
                  {SKILL_CATEGORIES.map((skill, idx) => (
                    <SelectItem key={idx} value={skill}>
                      {skill.split(/[_-]/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Score Range */}
          <div className="space-y-1 rounded-xl border border-border/60 bg-muted/30">
            <div className="flex justify-between items-center">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Score Range</Label>
              <span className="text-[13px] font-semibold text-primary">{pendingScoreRange[0]} - {pendingScoreRange[1]}</span>
            </div>
            <Slider
              defaultValue={[0, 10]}
              max={10}
              step={0.1}
              value={pendingScoreRange}
              onValueChange={setPendingScoreRange}
              onValueCommit={setScoreRange}
              className="py-2"
            />
          </div>

          <Separator className="my-1" />

          {/* Calendar */}
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div className="space-y-1 rounded-xl border border-border/60 bg-muted/30">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pb-1">Date Range</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <DatePicker
                    label="From"
                    value={fromDate}
                    minDate={dayjs('1900-01-01')}
                    maxDate={toDate || dayjs()}
                    disableFuture
                    onChange={(newValue) => {
                      setFromDate(newValue)
                      if (toDate && newValue && newValue.isAfter(toDate, 'day')) {
                        setToDate(newValue)
                      }
                      if (dateFilter) setDateFilter(undefined)
                    }}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                        sx: {
                          '& .MuiInputBase-root': { 
                            fontSize: '0.875rem',
                            fontFamily: 'var(--font-sans) !important',
                          },
                          '& .MuiInputBase-input': {
                            color: 'hsl(var(--foreground)) !important',
                            WebkitTextFillColor: 'hsl(var(--foreground)) !important',
                          },
                          '& .MuiInputLabel-root': { 
                            color: 'hsl(var(--muted-foreground))' 
                          },
                          '& .MuiOutlinedInput-notchedOutline': { 
                            borderColor: 'hsl(var(--border) / 0.5)' 
                          },
                          '& .MuiSvgIcon-root': {
                            color: 'hsl(var(--muted-foreground))'
                          }
                        }
                      },
                      popper: {
                        sx: {
                          zIndex: 10000,
                        }
                      },
                      desktopPaper: {
                        sx: {
                          backgroundColor: 'hsl(var(--card)) !important',
                          backgroundImage: 'none !important',
                          opacity: '1 !important',
                          border: '1px solid hsl(var(--border))',
                          boxShadow: 'var(--shadow-xl)',
                          borderRadius: '12px',
                        }
                      }
                    }}
                  />
                  <DatePicker
                    label="To"
                    value={toDate}
                    minDate={fromDate || dayjs('1900-01-01')}
                    maxDate={dayjs()}
                    disableFuture
                    onChange={(newValue) => {
                      setToDate(newValue)
                      if (dateFilter) setDateFilter(undefined)
                    }}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                        sx: {
                          '& .MuiInputBase-root': { 
                            fontSize: '0.875rem',
                          },
                          '& .MuiInputBase-input': {
                            color: 'hsl(var(--foreground)) !important',
                            WebkitTextFillColor: 'hsl(var(--foreground)) !important',
                          },
                          '& .MuiInputLabel-root': { 
                            color: 'hsl(var(--muted-foreground))' 
                          },
                          '& .MuiOutlinedInput-notchedOutline': { 
                            borderColor: 'hsl(var(--border) / 0.5)' 
                          },
                          '& .MuiSvgIcon-root': {
                            color: 'hsl(var(--muted-foreground))'
                          }
                        }
                      },
                      popper: {
                        sx: {
                          zIndex: 10000,
                        }
                      },
                      desktopPaper: {
                        sx: {
                          backgroundColor: 'hsl(var(--card)) !important',
                          backgroundImage: 'none !important',
                          opacity: '1 !important',
                          border: '1px solid hsl(var(--border))',
                          boxShadow: 'var(--shadow-xl)',
                          borderRadius: '12px',
                        }
                      }
                    }}
                  />
                </div>

              </div>

              <Separator />

              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <Label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Select Date</Label>
                  {dateFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDateFilter(undefined)}
                      className="h-5 text-[14px] text-muted-foreground hover:text-destructive px-1"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <Box sx={{
                  position: 'relative',
                  zIndex: 1,
                  bgcolor: 'hsl(var(--muted) / 0.3)',
                  borderRadius: '12px',
                  border: '1px solid hsl(var(--border))',
                  overflow: 'hidden',
                  display: 'flex',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-sans)',
                  '& *': { fontFamily: 'var(--font-sans) !important' },
                  '& .MuiDateCalendar-root': {
                    width: '100%',
                    height: 'auto',
                    maxWidth: '100%',
                    margin: '0',
                  },
                  '& .MuiPickersDay-root': {
                    width: '32px',
                    height: '32px',
                    fontSize: '0.8rem',
                    color: 'hsl(var(--foreground))',
                  },
                  '& .MuiTypography-root': {
                    fontSize: '0.8rem',
                    color: 'hsl(var(--foreground))',
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'hsl(var(--foreground))',
                  },
                  '& .MuiPickersDay-root.Mui-selected': {
                    bgcolor: 'hsl(var(--primary)) !important',
                    color: 'hsl(var(--primary-foreground)) !important',
                  },
                  '& .MuiDayCalendar-weekDayLabel': {
                    color: 'hsl(var(--muted-foreground))',
                  }
                }}>
                  <DateCalendar
                    value={dateFilter ? dayjs(dateFilter) : null}
                    maxDate={dayjs()}
                    disableFuture
                    onChange={(newValue) => {
                      setDateFilter(newValue?.toDate())
                      if (newValue) {
                        setFromDate(null)
                        setToDate(null)
                      }
                    }}
                    sx={{
                      backgroundColor: 'transparent',
                      '& .MuiPickersDay-root': {
                        color: 'hsl(var(--foreground))',
                      },
                      '& .MuiTypography-root': {
                        color: 'hsl(var(--foreground))'
                      },
                      '& .MuiSvgIcon-root': {
                        color: 'hsl(var(--foreground))'
                      }
                    }}
                    slots={{ day: ReportDensityDay }}
                  />
                </Box>
              </div>
            </div>
          </LocalizationProvider>
        </CardContent>
      </Card>
    </div>
  )
})
