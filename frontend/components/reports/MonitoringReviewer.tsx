'use client'

import React, { useState, useMemo } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/app/dashboard/lib/swr-fetcher'
import { API_BASE_URL } from '@/lib/config'
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
  const { data: events = [], isLoading } = useSWR<MonitoringEvent[]>(
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
    if (['focus_lost', 'multiple_faces', 'no_face'].includes(type)) {
      return 'border-red-500 bg-red-50/50 dark:bg-red-950/10 shadow-red-500/10 hover:border-red-600'
    }
    return 'border-green-500 bg-green-50/50 dark:bg-green-950/10 shadow-green-500/10 hover:border-green-600'
  }

  const jumpSeconds = selectedEvent?.video_reference?.startsWith('offset_')
    ? parseInt(selectedEvent.video_reference.replace('offset_', '').replace('s', ''), 10)
    : 0

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl bg-slate-50 dark:bg-slate-900/50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Loading intelligent frame monitoring logs...</p>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="space-y-4">
        {videoUrl ? (
          <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl aspect-video relative group">
            <video
              src={videoUrl?.startsWith('http') ? videoUrl : `${API_BASE_URL}${videoUrl}`}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
              AI Integrity Audit Timeline
              {warningCount > 0 ? (
                <Badge className="bg-red-500 text-white font-bold px-2 py-0.5 text-xs animate-bounce">
                  {warningCount} Anomalies
                </Badge>
              ) : (
                <Badge className="bg-green-500 text-white font-bold px-2 py-0.5 text-xs">
                  100% Secure
                </Badge>
              )}
            </h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Frame-by-frame chronological audit logs captured silently during the interview.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="rounded-xl text-xs font-bold"
          >
            All Frames ({events.length})
          </Button>
          <Button
            variant={filter === 'warnings' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => setFilter('warnings')}
            className="rounded-xl text-xs font-bold gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5" /> Anomalies ({warningCount})
          </Button>
          <Button
            variant={filter === 'focus_lost' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('focus_lost')}
            className="rounded-xl text-xs font-bold"
          >
            Focus Away
          </Button>
          <Button
            variant={filter === 'multiple_faces' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('multiple_faces')}
            className="rounded-xl text-xs font-bold"
          >
            Multiple People
          </Button>
          <Button
            variant={filter === 'no_face' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('no_face')}
            className="rounded-xl text-xs font-bold"
          >
            No Face
          </Button>
          <Button
            variant={filter === 'normal' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('normal')}
            className="rounded-xl text-xs font-bold"
          >
            Secure
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[480px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 shadow-inner">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Filter className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No frames match the selected filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => setSelectedEvent(ev)}
                className={`group relative flex flex-col rounded-2xl border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer overflow-hidden ${getEventColorStyle(
                  ev.event_type
                )}`}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                  {ev.frame_image_url ? (
                    <img
                      src={ev.frame_image_url?.startsWith('http') ? ev.frame_image_url : `${API_BASE_URL}${ev.frame_image_url}`}
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

                <div className="p-3 flex items-center justify-center bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize tracking-wide">
                    {ev.event_type.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-5xl rounded-3xl p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8 mb-2">
              <div className="flex items-center gap-3">
                {selectedEvent && getEventBadge(selectedEvent.event_type)}
                <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">
                  Frame Audit Inspection
                </DialogTitle>
              </div>
              <span className="flex items-center gap-1.5 text-sm font-black text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-3 py-1.5 rounded-xl">
                <Clock className="w-4 h-4" />
                {selectedEvent && formatTimeOffset(selectedEvent.video_reference, selectedEvent.timestamp)}
              </span>
            </div>
            <DialogDescription className="text-xs font-bold text-slate-500">
              Captured at exact timestamp: {selectedEvent && parseNaiveDateTime(selectedEvent.timestamp).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-blue-600" /> Frame Snapshot
              </span>
              <div className="rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-800 aspect-video shadow-lg bg-slate-950 flex items-center justify-center max-h-[70vh] w-full">
                {selectedEvent?.frame_image_url ? (
                  <img
                    src={selectedEvent.frame_image_url?.startsWith('http') ? selectedEvent.frame_image_url : `${API_BASE_URL}${selectedEvent.frame_image_url}`}
                    alt="Inspection Frame"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 p-12 text-center w-full">
                    <CameraOff className="w-16 h-16 mb-3 opacity-50 text-slate-400" />
                    <p className="text-sm font-bold text-slate-400">No frame snapshot image available for this event.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-900 mt-4">
            <Button variant="default" className="rounded-xl font-bold shadow-lg shadow-blue-500/20" onClick={() => setSelectedEvent(null)}>
              Done Inspecting
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
