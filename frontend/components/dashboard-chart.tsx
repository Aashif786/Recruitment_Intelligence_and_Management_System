'use client'
 
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts'

const GRADIENTS = [
    'url(#chartGrad1)',
    'url(#chartGrad2)',
    'url(#chartGrad3)',
    'url(#chartGrad4)',
    'url(#chartGrad5)'
]

interface DashboardChartProps {
    data: { name: string; value: number }[]
}

export function DashboardChart({ data }: DashboardChartProps) {
    if (data.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <p>No application data available yet</p>
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <defs>
                    <linearGradient id="chartGrad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.95}/>
                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.35}/>
                    </linearGradient>
                    <linearGradient id="chartGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.95}/>
                        <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.35}/>
                    </linearGradient>
                    <linearGradient id="chartGrad3" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.95}/>
                        <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.35}/>
                    </linearGradient>
                    <linearGradient id="chartGrad4" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.95}/>
                        <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.35}/>
                    </linearGradient>
                    <linearGradient id="chartGrad5" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-5)" stopOpacity={0.95}/>
                        <stop offset="100%" stopColor="var(--chart-5)" stopOpacity={0.35}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                <XAxis
                    dataKey="name"
                    stroke="var(--muted-foreground)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    dy={8}
                />
                <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dx={-8}
                />
                <Tooltip
                    cursor={{ fill: 'var(--muted)', opacity: 0.15 }}
                    contentStyle={{ 
                        borderRadius: '12px', 
                        border: '1px solid var(--border)', 
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', 
                        backgroundColor: 'var(--card)', 
                        color: 'var(--foreground)',
                        fontSize: '12px',
                        fontWeight: 'semibold'
                    }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={38}>
                    {data.map((entry, index) => (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={GRADIENTS[index % GRADIENTS.length]} 
                            className="hover:opacity-85 transition-all duration-300 cursor-pointer"
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    )
}
