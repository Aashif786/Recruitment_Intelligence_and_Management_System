import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Star, TrendingUp, Award, CheckCircle2 } from 'lucide-react';

interface ScoreIndicatorProps {
    feedback: { score: number; text: string } | null;
    currentDifficulty?: string;
}

export default function ScoreIndicator({ feedback, currentDifficulty }: ScoreIndicatorProps) {
    if (!feedback) {
        return (
            <Card className="bg-card/45 backdrop-blur-xl border border-border/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_30px_rgb(0,0,0,0.05)] transition-all duration-300 rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/40 py-4 px-6">
                    <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp className="w-3 h-3 text-primary" />
                        Live Performance Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 text-center flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-muted/20 border border-border/60 flex items-center justify-center">
                        <Star className="w-8 h-8 text-muted-foreground/30 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">Waiting for response...</p>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tighter">AI will evaluate your first answer live</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const scorePercentage = (feedback.score / 10) * 100;
    
    const getScoreColor = (score: number) => {
        if (score >= 8) return 'text-green-600 bg-green-500/10 border-green-500/20';
        if (score >= 5) return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
        return 'text-red-600 bg-red-500/10 border-red-500/20';
    };

    return (
        <Card className="bg-card/45 backdrop-blur-xl border border-border/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_30px_rgb(0,0,0,0.05)] transition-all duration-300 rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
            <CardHeader className="bg-muted/30 border-b border-border/40 py-4 px-6">
                <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Award className="w-3 h-3 text-primary" />
                        Real-time Evaluation
                    </div>
                    <span className={`px-3 py-1 rounded-full border ${getScoreColor(feedback.score)}`}>
                        {feedback.score}/10
                    </span>
                </CardTitle>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Performance Score</span>
                        <span className="text-xl font-black text-foreground">{scorePercentage}%</span>
                    </div>
                    <Progress value={scorePercentage} className="h-2 rounded-full bg-muted" />
                </div>

                <div className="bg-muted/30 p-5 rounded-2xl border border-border/80 space-y-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Expert Feedback</span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground leading-relaxed italic pr-2">
                        "{feedback.text}"
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
