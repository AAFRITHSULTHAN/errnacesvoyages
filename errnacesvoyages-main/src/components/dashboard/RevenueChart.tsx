import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface RevenueChartProps {
    data: { name: string; revenue: number }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

    return (
        <Card className="col-span-3 border border-white/20 bg-white/40 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="pb-0 pt-5 px-5">
                <CardTitle className="text-sm font-semibold text-slate-600">Revenue by Package</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="h-[200px] w-full relative -mt-4">
                    {data.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                            No revenue data available.
                        </div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data}
                                        cx="50%"
                                        cy="85%"
                                        startAngle={180}
                                        endAngle={0}
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={4}
                                        dataKey="revenue"
                                        stroke="none"
                                    >
                                        {data.map((_, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                                className="hover:opacity-80 transition-opacity duration-300"
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                            backdropFilter: 'blur(8px)',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255, 255, 255, 0.4)',
                                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                                            fontSize: '12px'
                                        }}
                                        formatter={(value: number | undefined) => [value ? `$${value.toLocaleString()}` : '$0', 'Revenue']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-x-0 bottom-[18%] flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold text-slate-900 tracking-tight">${totalRevenue.toLocaleString()}</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Total Revenue</span>
                            </div>
                        </>
                    )}
                </div>
                {data.length > 0 && (
                    <div className="px-5 pb-5 flex flex-wrap justify-center gap-x-6 gap-y-2">
                        {data.map((item, index) => (
                            <div key={item.name} className="flex items-center gap-2">
                                <div
                                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[11px] font-bold text-slate-700 truncate leading-none">{item.name}</span>
                                    <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                                        {((item.revenue / totalRevenue) * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
