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
    'url(#blueGrad)',
    'url(#purpleGrad)',
    'url(#amberGrad)',
    'url(#emeraldGrad)',
    'url(#roseGrad)'
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
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.95}/>
                        <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.4}/>
                    </linearGradient>
                    <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.95}/>
                        <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.4}/>
                    </linearGradient>
                    <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95}/>
                        <stop offset="100%" stopColor="#b45309" stopOpacity={0.4}/>
                    </linearGradient>
                    <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.95}/>
                        <stop offset="100%" stopColor="#047857" stopOpacity={0.4}/>
                    </linearGradient>
                    <linearGradient id="roseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.95}/>
                        <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.4}/>
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
