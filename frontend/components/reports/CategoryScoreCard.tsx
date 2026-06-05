'use client'

import React from 'react'
import { Card, CardContent } from "@/components/ui/card"

interface CategoryScoreCardProps {
    title: string
    score?: number
    /** Muted N/A without /10 (e.g. interview not completed) */
    showNotAvailable?: boolean
}

const getScoreColor = (score?: number) => {
    if (score === undefined || score === null) return 'text-muted-foreground'
    if (score >= 7) return 'text-emerald-600 dark:text-emerald-400'
    if (score >= 4) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
}

const getScoreBg = (score?: number) => {
    if (score === undefined || score === null) return ''
    if (score >= 7) return 'bg-emerald-500/5 border-emerald-500/20'
    if (score >= 4) return 'bg-amber-500/5 border-amber-500/20'
    return 'bg-red-500/5 border-red-500/20'
}

const CategoryScoreCardImpl = ({ title, score, showNotAvailable }: CategoryScoreCardProps) => (
    <Card className={`h-28 bg-card/60 backdrop-blur-md border border-border/80 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.10)] hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-300 overflow-hidden ${!showNotAvailable ? getScoreBg(score) : ''}`}>
        <CardContent className="h-full flex flex-col justify-center p-4">
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">{title}</div>
            {showNotAvailable ? (
                <div className="text-3xl font-black text-muted-foreground/40">N/A</div>
            ) : (
                <div className={`text-3xl font-black tabular-nums tracking-tight ${getScoreColor(score)}`}>
                    {score !== undefined && score !== null ? score.toFixed(1) : 'N/A'}
                    <span className="text-sm font-semibold text-muted-foreground/60 ml-1">/10</span>
                </div>
            )}
        </CardContent>
    </Card>
)

export const CategoryScoreCard = React.memo(CategoryScoreCardImpl);

