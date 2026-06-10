import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, HelpCircle, XCircle } from 'lucide-react';

interface SidebarSectionProps {
    title: string;
    count: number;
    current: number;
    startIndex: number;
    completed: number[];
    incorrect: number[];
    skipped: number[];
    onSelect: (index: number) => void;
    isLocked: boolean;
}

const SidebarSection = ({ title, count, current, startIndex, completed, incorrect, skipped, onSelect, isLocked }: SidebarSectionProps) => {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
                <h3 className="text-sm font-black text-foreground uppercase tracking-widest">{title}</h3>
                <span className="text-[10px] font-bold text-muted-foreground">{completed.length}/{count}</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: count }).map((_, i) => {
                    const globalIndex = startIndex + i;
                    const isCompleted = completed.includes(globalIndex);
                    const isIncorrect = incorrect.includes(globalIndex);
                    const isSkipped = skipped.includes(globalIndex);
                    const isCurrent = current === globalIndex;

                    let bgColor = "bg-background border-border text-muted-foreground";
                    if (isLocked) {
                        bgColor = "bg-muted/40 border-border/50 text-muted-foreground/30 opacity-40 cursor-not-allowed";
                    } else if (isCurrent) {
                        bgColor = "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20";
                    } else if (isCompleted) {
                        bgColor = "bg-green-500 border-green-500 text-white font-bold";
                    } else if (isSkipped) {
                        bgColor = "bg-amber-500 border-amber-500 text-white font-bold";
                    }
                    return (
                        <button
                            key={i}
                            disabled={isLocked}
                            onClick={() => !isLocked && onSelect(globalIndex)}
                            className={`w-8 h-8 rounded-full border text-[10px] font-black flex items-center justify-center transition-all ${isLocked ? '' : 'hover:scale-110 active:scale-95'} ${bgColor}`}
                        >
                            {i + 1}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

interface InterviewSidebarProps {
    currentQuestion: number;
    completedQuestions: number[];
    incorrectQuestions: number[];
    skippedQuestions: number[];
    onSelectQuestion: (index: number) => void;
    strikes: number;
    allQuestions: any[];
}

export default function InterviewSidebar({ 
    currentQuestion, 
    completedQuestions, 
    incorrectQuestions, 
    skippedQuestions = [],
    onSelectQuestion,
    strikes,
    allQuestions = []
}: InterviewSidebarProps) {

    // Group questions by type
    const groupedQuestions = React.useMemo(() => {
        const groups: Record<string, any[]> = {};
        allQuestions.forEach((q) => {
            const type = q.question_type || 'General';
            if (!groups[type]) groups[type] = [];
            groups[type].push(q);
        });
        return groups;
    }, [allQuestions]);

    const orderedTypes = ['aptitude', 'technical', 'behavioral'];
    const otherTypes = React.useMemo(() => {
        return Object.keys(groupedQuestions).filter(t => !orderedTypes.includes(t.toLowerCase()));
    }, [groupedQuestions]);
    
    const displayOrder = React.useMemo(() => {
        return [...orderedTypes, ...otherTypes];
    }, [otherTypes]);

    const lockedSections = React.useMemo(() => {
        const locked: Record<string, boolean> = {};
        
        let foundIncomplete = false;
        displayOrder.forEach((type) => {
            locked[type.toLowerCase()] = foundIncomplete;
            
            const group = groupedQuestions[type] || groupedQuestions[type.charAt(0).toUpperCase() + type.slice(1)];
            if (group && group.length > 0) {
                const hasIncomplete = group.some(q => !completedQuestions.includes(q.question_number));
                if (hasIncomplete) {
                    foundIncomplete = true;
                }
            }
        });
        
        return locked;
    }, [groupedQuestions, completedQuestions, displayOrder]);

    return (
        <div className="space-y-8 p-6 bg-sidebar/45 backdrop-blur-xl border-r border-border/80 h-80% overflow-y-auto no-scrollbar shadow-[2px_0_20px_-4px_rgba(0,0,0,0.02)]">
            {/* Security Status Card */}
            <div className="p-4 bg-card/45 border border-border/80 rounded-2xl space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                    <span className="text-md font-black text-muted-foreground uppercase tracking-tighter">Security Monitor</span>
                    <div className="flex gap-1">
                        {[1, 2, 3].map(s => (
                            <div key={s} className={`w-2 h-2 rounded-full ${strikes >= s ? 'bg-red-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
                        ))}
                    </div>
                </div>
                <p className="text-md font-medium text-muted-foreground leading-tight">
                    {strikes === 0 ? "No violations detected. Session secure." : strikes === 1 ? "1 violation recorded. Please stay focused." : strikes === 2 ? "2 violations recorded. Critical alert." : "3 violations recorded. One strike remaining!"}
                </p>
            </div>

            {/* Question Status Legend */}
            <div className="p-4 bg-card/45 border border-border/80 rounded-2xl space-y-2.5 shadow-sm">
                <span className="text-md font-black text-muted-foreground uppercase tracking-widest block">Question Status Guide</span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-bold text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm shadow-primary/20" />
                        <span>Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm" />
                        <span>Completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
                        <span>Skipped</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-background border border-border shadow-sm" />
                        <span>Pending</span>
                    </div>
                </div>
            </div>

            {displayOrder.map(type => {
                const group = groupedQuestions[type] || groupedQuestions[type.charAt(0).toUpperCase() + type.slice(1)];
                if (!group || group.length === 0) return null;
                
                const startIndex = group[0].question_number;
                const isSectionLocked = lockedSections[type.toLowerCase()] || false;
                
                return (
                    <SidebarSection 
                        key={type}
                        title={type.charAt(0).toUpperCase() + type.slice(1)} 
                        count={group.length} 
                        current={currentQuestion} 
                        startIndex={startIndex}
                        completed={completedQuestions.filter(q => q >= startIndex && q < startIndex + group.length)}
                        incorrect={incorrectQuestions.filter(q => q >= startIndex && q < startIndex + group.length)}
                        skipped={skippedQuestions.filter(q => q >= startIndex && q < startIndex + group.length)}
                        onSelect={onSelectQuestion}
                        isLocked={isSectionLocked}
                    />
                );
            })}

        </div>
    );
}
