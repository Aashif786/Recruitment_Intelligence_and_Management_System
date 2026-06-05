'use client'

import React from 'react'

interface MetricCardProps {
    title: string
    score: number
    notAvailable?: boolean
}

const MetricCardImpl = ({ title, score, notAvailable }: MetricCardProps) => (
    <div className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border hover:-translate-y-0.5 active:scale-[0.99] hover:shadow-[0_8px_20px_rgb(0,0,0,0.03)] transition-all duration-200 ${notAvailable ? 'bg-muted/40 border-border/80 shadow-inner' : 'bg-primary/5 border-primary/20 shadow-inner'}`}>
        <div className={`text-xs font-bold uppercase tracking-widest mb-1 text-center ${notAvailable ? 'text-muted-foreground' : 'text-primary'}`}>{title}</div>
        <div className="flex items-baseline gap-1">
            {notAvailable ? (
                <span className="text-2xl font-bold text-muted-foreground/40">N/A</span>
            ) : (
                <>
                    <span className="text-3xl font-black text-primary tabular-nums">
                        {score.toFixed(1)}
                    </span>
                    <span className="text-base font-bold text-primary/50">/10</span>
                </>
            )}
        </div>
    </div>
);

export const MetricCard = React.memo(MetricCardImpl);
