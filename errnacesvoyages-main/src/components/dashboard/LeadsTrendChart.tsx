import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LeadsTrendChartProps {
    data: { name: string; leads: number }[];
}

export function LeadsTrendChart({ data }: LeadsTrendChartProps) {
    return (
        <Card className="col-span-4 border border-white/20 bg-white/40 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600">Leads Trend (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
                <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                            <XAxis
                                dataKey="name"
                                stroke="#94a3b8"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    backdropFilter: 'blur(8px)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 255, 255, 0.4)',
                                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                }}
                                itemStyle={{ color: '#ef4444' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="leads"
                                stroke="#ef4444"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorLeads)"
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
