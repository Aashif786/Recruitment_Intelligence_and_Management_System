'use client'

import React, { useMemo } from 'react'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { fetcher } from '@/app/dashboard/lib/swr-fetcher'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { API_BASE_URL } from '@/lib/config'
import { 
    Users, Search, Brain, Code, UserCheck, 
    CheckCircle2, XCircle, Clock 
} from 'lucide-react'

interface Candidate {
    id: number
    candidate_name: string
    status: string
    composite_score: number
    recommendation: string
    candidate_photo_path?: string
}

const STAGES = [
    { name: 'Application Submitted', key: 'submitted', icon: Users },
    { name: 'Resume Screening', key: 'resume_screening', icon: Search },
    { name: 'Aptitude Round', key: 'aptitude_round', icon: Clock },
    { name: 'Automated AI Interview', key: 'ai_interview', icon: Brain },
    { name: 'Technical Interview', key: 'technical_interview', icon: Code },
    { name: 'HR Interview', key: 'hr_interview', icon: UserCheck },
    { name: 'Final Decision', key: 'final_decision', icon: CheckCircle2 }
]

export default function PipelinePage() {
    const params = useParams()
    const jobId = params.id
    const { data: candidates = [], isLoading } = useSWR<Candidate[]>(`/api/applications?job_id=${jobId}`, fetcher)

    const columns = useMemo(() => {
        const result: Record<string, Candidate[]> = {}
        STAGES.forEach(stage => result[stage.key] = [])
        
        candidates.forEach(cand => {
            let columnKey = 'submitted'
            
            if (cand.status === 'approved_for_interview') {
                columnKey = 'aptitude_round'
            } else if (cand.status === 'hired' || cand.status === 'rejected') {
                columnKey = 'final_decision'
            } else if (result[cand.status]) {
                columnKey = cand.status
            }
            
            result[columnKey].push(cand)
        })
        return result
    }, [candidates])

    if (isLoading) return <div className="p-8 text-center">Loading pipeline...</div>

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Hiring Pipeline</h1>
                <Badge variant="outline" className="px-3 py-1 text-sm font-medium">
                    {candidates.length} Total Candidates
                </Badge>
            </div>

            <div className="flex space-x-4 overflow-x-auto pb-4 min-h-[70vh]">
                {STAGES.map((stage) => (
                    <div key={stage.key} className="flex-shrink-0 w-80 flex flex-col space-y-4 bg-muted/30 p-4 rounded-xl border border-dashed border-border">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center space-x-2">
                                <stage.icon className="h-4 w-4 text-primary" />
                                <h3 className="font-semibold text-sm">{stage.name}</h3>
                            </div>
                            <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
                                {columns[stage.key]?.length || 0}
                            </Badge>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="space-y-3">
                                {columns[stage.key]?.map((candidate) => (
                                    <Card key={candidate.id} className="cursor-pointer hover:border-primary/50 transition-colors shadow-sm bg-card border-border/60">
                                        <CardContent className="p-3">
                                            <div className="flex items-center space-x-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={candidate.candidate_photo_path ? `${API_BASE_URL}/${candidate.candidate_photo_path.replace(/\\/g, "/")}` : ""} />
                                                    <AvatarFallback>{candidate.candidate_name[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold truncate">{candidate.candidate_name}</p>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        <Badge variant="outline" className="text-[10px] px-1 h-4 bg-primary/5">
                                                            Score: {candidate.composite_score || 0}
                                                        </Badge>
                                                        {candidate.recommendation && (
                                                            <span className={`text-[10px] font-medium ${
                                                                candidate.recommendation === 'Strong Hire' ? 'text-green-600' : 
                                                                candidate.recommendation === 'Reject' ? 'text-red-500' : 'text-muted-foreground'
                                                            }`}>
                                                                {candidate.recommendation}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                {columns[stage.key]?.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground text-xs italic">
                                        No candidates in this stage
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                ))}
            </div>
        </div>
    )
}
