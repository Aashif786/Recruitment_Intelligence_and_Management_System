'use client'

import React, { useState, useMemo } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/app/dashboard/lib/swr-fetcher'
import { getApiBaseUrl } from '@/lib/config'
import {
  Video,
  CameraOff,
  AlertTriangle,
  Target,
  CheckCircle2,
  Filter,
  Clock,
  ShieldAlert,
  Play,
  Maximize2,
  AlertCircle,
  Eye,
  Users
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

const parseNaiveDateTime = (timestampStr: string) => {
  if (!timestampStr) return new Date();
  if (timestampStr.includes('Z') || timestampStr.includes('+')) {
    return new Date(timestampStr);
  }
  // Replace T with space and dashes with slashes to force local timezone parsing
  const sanitized = timestampStr.replace('T', ' ').replace(/-/g, '/');
  const dt = new Date(sanitized);
  if (!isNaN(dt.getTime())) return dt;
  return new Date(timestampStr);
};

interface MonitoringEvent {
  id: number
  interview_id: number
  event_type: 'focus_lost' | 'multiple_faces' | 'no_face' | 'normal'
  timestamp: string
  confidence_score?: number
  frame_image_path?: string
  frame_image_url?: string
  video_reference?: string
}

interface MonitoringReviewerProps {
  interviewId: number
  videoUrl?: string | null
}

export const MonitoringReviewer: React.FC<MonitoringReviewerProps> = ({ interviewId, videoUrl }) => {
  const { data: events = [], isLoading, error: monitoringError } = useSWR<MonitoringEvent[]>(
    interviewId ? `/api/interviews/${interviewId}/monitoring-events` : null,
    fetcher
  )

  const [filter, setFilter] = useState<string>('all')
  const [selectedEvent, setSelectedEvent] = useState<MonitoringEvent | null>(null)
  const [isPlayingVideo, setIsPlayingVideo] = useState(false)

  const filteredEvents = useMemo(() => {
    if (!Array.isArray(events)) return []
    if (filter === 'all') return events
    if (filter === 'warnings') {
      return events.filter((ev) => ['focus_lost', 'multiple_faces', 'no_face'].includes(ev.event_type))
    }
    return events.filter((ev) => ev.event_type === filter)
  }, [events, filter])

  const warningCount = useMemo(() => {
    if (!Array.isArray(events)) return 0
    return events.filter((ev) => ['focus_lost', 'multiple_faces', 'no_face'].includes(ev.event_type)).length
  }, [events])

  const counts = useMemo(() => {
    const res = { focus_lost: 0, multiple_faces: 0, no_face: 0, normal: 0 }
    if (!Array.isArray(events)) return res
    for (const ev of events) {
      if (ev.event_type in res) {
        res[ev.event_type as keyof typeof res]++
      }
    }
    return res
  }, [events])

  const formatTimeOffset = (videoRef?: string, timestamp?: string) => {
    if (videoRef && videoRef.startsWith('offset_')) {
      const sec = parseInt(videoRef.replace('offset_', '').replace('s', ''), 10)
      if (!isNaN(sec)) {
        const m = Math.floor(sec / 60)
        const s = sec % 60
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      }
    }
    if (timestamp) {
      const dt = parseNaiveDateTime(timestamp)
      return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }
    return '00:00'
  }

  const getEventBadge = (type: MonitoringEvent['event_type']) => {
    switch (type) {
      case 'focus_lost':
        return (
          <Badge className="bg-amber-500 text-white font-bold flex items-center gap-1 px-2.5 py-1 text-xs">
            <Target className="w-3.5 h-3.5" /> Focus Away
          </Badge>
        )
      case 'multiple_faces':
        return (
          <Badge className="bg-red-500 text-white font-bold flex items-center gap-1 px-2.5 py-1 text-xs animate-pulse">
            <Users className="w-3.5 h-3.5" /> Multiple People
          </Badge>
        )
      case 'no_face':
        return (
          <Badge className="bg-red-600 text-white font-bold flex items-center gap-1 px-2.5 py-1 text-xs">
            <CameraOff className="w-3.5 h-3.5" /> Face Missing
          </Badge>
        )
      default:
        return (
          <Badge className="bg-green-500 text-white font-bold flex items-center gap-1 px-2.5 py-1 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" /> Secure Frame
          </Badge>
        )
    }
  }

  const getEventColorStyle = (type: MonitoringEvent['event_type']) => {
    if (type === 'focus_lost') {
      return 'border-amber-500/30 bg-amber-500/[0.02] dark:bg-amber-500/[0.04] hover:border-amber-500 transition-all duration-300'
    }
    if (['multiple_faces', 'no_face'].includes(type)) {
      return 'border-red-500/30 bg-red-500/[0.02] dark:bg-red-500/[0.04] hover:border-red-500 transition-all duration-300'
    }
    return 'border-emerald-500/30 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04] hover:border-emerald-500 transition-all duration-300'
  }

  const jumpSeconds = selectedEvent?.video_reference?.startsWith('offset_')
    ? parseInt(selectedEvent.video_reference.replace('offset_', '').replace('s', ''), 10)
    : 0

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl bg-muted/30 dark:bg-muted/10">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-muted-foreground">Loading intelligent frame monitoring logs...</p>
      </div>
    )
  }

  if (monitoringError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-3xl border-destructive/20 bg-destructive/5">
        <AlertCircle className="w-8 h-8 text-destructive mb-3" />
        <p className="text-sm font-semibold text-destructive">Could not load proctoring events</p>
        <p className="text-xs text-destructive/70 mt-1">{(monitoringError as Error).message || 'Please try again later.'}</p>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="space-y-4">
        {videoUrl ? (
          <div className="bg-foreground/90 rounded-2xl overflow-hidden shadow-xl aspect-video relative group">
            <video
              src={videoUrl?.startsWith('http') ? videoUrl : `${getApiBaseUrl()}${videoUrl}`}
              controls
              preload="metadata"
              className="w-full h-full"
              crossOrigin="use-credentials"
            />
          </div>
        ) : (
          <div className="bg-muted/30 border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <CameraOff className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No monitoring frames or video available.</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card/45 backdrop-blur-xl border border-border/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 tracking-tight">
              AI Integrity Audit Timeline
              {warningCount > 0 ? (
                <Badge className="bg-destructive text-destructive-foreground font-bold px-2 py-0.5 text-xs animate-bounce">
                  {warningCount} Anomalies
                </Badge>
              ) : (
                <Badge className="bg-emerald-500 text-white font-bold px-2 py-0.5 text-xs">
                  100% Secure
                </Badge>
              )}
            </h3>
            <p className="text-xs font-semibold text-muted-foreground">
              Frame-by-frame chronological audit logs captured silently during the interview.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="rounded-xl text-xs font-bold active:scale-95 transition-all"
          >
            All Frames ({events.length})
          </Button>
          <Button
            variant={filter === 'warnings' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => setFilter('warnings')}
            className="rounded-xl text-xs font-bold gap-1 active:scale-95 transition-all"
          >
            <AlertCircle className="w-3.5 h-3.5" /> Anomalies ({warningCount})
          </Button>
          <Button
            variant={filter === 'focus_lost' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('focus_lost')}
            className="rounded-xl text-xs font-bold active:scale-95 transition-all"
          >
            Focus Away ({counts.focus_lost})
          </Button>
          <Button
            variant={filter === 'multiple_faces' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('multiple_faces')}
            className="rounded-xl text-xs font-bold active:scale-95 transition-all"
          >
            Multiple People ({counts.multiple_faces})
          </Button>
          <Button
            variant={filter === 'no_face' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('no_face')}
            className="rounded-xl text-xs font-bold active:scale-95 transition-all"
          >
            No Face ({counts.no_face})
          </Button>
          <Button
            variant={filter === 'normal' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('normal')}
            className="rounded-xl text-xs font-bold active:scale-95 transition-all"
          >
            Secure ({counts.normal})
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[480px] rounded-2xl border border-border/80 bg-card/45 backdrop-blur-xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] scrollbar-premium">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Filter className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-bold text-muted-foreground">No frames match the selected filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => setSelectedEvent(ev)}
                className={`group relative flex flex-col rounded-2xl border-2 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.99] hover:shadow-[0_15px_30px_rgb(0,0,0,0.05)] cursor-pointer overflow-hidden ${getEventColorStyle(
                  ev.event_type
                )}`}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                  {ev.frame_image_url ? (
                    <img
                      src={ev.frame_image_url?.startsWith('http') ? ev.frame_image_url : `${getApiBaseUrl()}${ev.frame_image_url}`}
                      alt="Monitoring frame"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-600">
                      <Video className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                  
                  <div className="absolute top-2.5 left-2.5">
                    {getEventBadge(ev.event_type)}
                  </div>
                  
                  <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 text-xs font-bold text-white bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    {formatTimeOffset(ev.video_reference, ev.timestamp)}
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-white bg-blue-600 px-3 py-1.5 rounded-xl shadow-lg">
                      <Maximize2 className="w-3.5 h-3.5" /> Inspect Frame
                    </span>
                  </div>
                </div>

                <div className="p-3 flex items-center justify-center bg-card border-t border-border">
                  <span className="text-xs font-bold text-foreground capitalize tracking-wide">
                    {ev.event_type.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-5xl rounded-3xl p-0 bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/40 p-6">
            <DialogHeader>
              <div className="flex items-center justify-between pr-8">
                <div className="flex items-center gap-3">
                  {selectedEvent && getEventBadge(selectedEvent.event_type)}
                  <DialogTitle className="text-xl font-black text-foreground">
                    Frame Audit Inspection
                  </DialogTitle>
                </div>
                <span className="flex items-center gap-1.5 text-sm font-black text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20">
                  <Clock className="w-4 h-4" />
                  {selectedEvent && formatTimeOffset(selectedEvent.video_reference, selectedEvent.timestamp)}
                </span>
              </div>
              <DialogDescription className="text-xs font-bold text-muted-foreground pt-1">
                Captured at exact timestamp: {selectedEvent && parseNaiveDateTime(selectedEvent.timestamp).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-primary" /> Frame Snapshot
              </span>
              <div className="rounded-2xl overflow-hidden border-2 border-border aspect-video shadow-lg bg-foreground/90 flex items-center justify-center max-h-[70vh] w-full">
                {selectedEvent?.frame_image_url ? (
                  <img
                    src={selectedEvent.frame_image_url?.startsWith('http') ? selectedEvent.frame_image_url : `${getApiBaseUrl()}${selectedEvent.frame_image_url}`}
                    alt="Inspection Frame"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground p-12 text-center w-full">
                    <CameraOff className="w-16 h-16 mb-3 opacity-50" />
                    <p className="text-sm font-bold">No frame snapshot image available for this event.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end px-6 pb-6 pt-2 border-t border-border/40 mt-2">
            <Button variant="default" className="rounded-xl font-bold active:scale-[0.98] transition-all" onClick={() => setSelectedEvent(null)}>
              Done Inspecting
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
