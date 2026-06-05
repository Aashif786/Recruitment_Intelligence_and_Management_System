'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, Trophy, GitBranch } from 'lucide-react'
import { PipelineBoard } from '@/components/pipeline-board'
import { PageHeader } from '@/components/page-header'
import useSWR from 'swr'
import { fetcher } from '@/app/dashboard/lib/swr-fetcher'

export default function PipelinePage() {
    const router = useRouter()
    const params = useParams()
    const jobId = params.id as string

    // Fetch job details to get the job name
    const { data: job } = useSWR<any>(jobId ? `/api/jobs/${jobId}` : null, fetcher)

    return (
        <div className="flex flex-col lg:h-[calc(100vh-7.5rem)] gap-6 overflow-hidden">
            <div className="flex flex-col gap-4 shrink-0 px-4 pt-4">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/dashboard/hr/pipeline')} 
                    className="gap-2 text-muted-foreground hover:text-foreground h-auto p-0 flex items-center transition-colors group w-fit"
                >
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    <span className="text-sm font-bold">Back to Pipeline</span>
                </Button>
                
                <div className="flex items-center justify-between gap-4">
                    <PageHeader
                        title={`Pipeline: ${job?.title || "Loading..."}`}
                        description={`Visual workflow management for Job #${jobId}`}
                        icon={GitBranch}
                    />

                    <div className="inline-flex items-center rounded-xl border border-border/80 bg-muted/20 backdrop-blur-md p-1 shadow-sm">
                        <Button
                            size="sm"
                            className="rounded-lg h-8 px-3 active:scale-[0.98] transition-all duration-200"
                        >
                            <Users className="h-4 w-4 mr-1.5" />
                            Pipeline View
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/dashboard/hr/ranking/${jobId}`)}
                            className="rounded-lg h-8 px-3 text-muted-foreground active:scale-[0.98] hover:text-foreground transition-all duration-200"
                        >
                            <Trophy className="h-4 w-4 mr-1.5" />
                            Candidate Ranking
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 w-full overflow-hidden bg-muted/30 p-2 px-4 shadow-inner border-y border-border/50">
                <PipelineBoard jobId={jobId} />
            </div>
        </div>
    )
}
