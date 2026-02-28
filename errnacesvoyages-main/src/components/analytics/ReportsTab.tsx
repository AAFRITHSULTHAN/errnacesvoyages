import { useMemo } from 'react';
import { useAppStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDateRangePicker } from '@/components/dashboard/DateRangePicker';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const LEAD_SOURCE_COLORS = ['#E50914', '#a855f7', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];

export function ReportsTab() {
    const { leads } = useAppStore();

    const analytics = useMemo(() => {
        // Calculate Lead Sources
        const sourcesMap = leads.reduce((acc, lead) => {
            const source = lead.source || 'Unknown';
            acc[source] = (acc[source] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const leadSourcesData = Object.entries(sourcesMap).map(([name, value], index) => ({
            name,
            value,
            color: LEAD_SOURCE_COLORS[index % LEAD_SOURCE_COLORS.length]
        }));

        // Calculate Monthly Revenue (from converted leads)
        const revenueMap: Record<string, number> = {};
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Initialize last 6 months (or just current year)
        // For simplicity, let's just group by month name for all time
        // Proper implementation would handle years, but this is a good start

        leads.forEach(lead => {
            if (lead.status === 'converted' && lead.created_at) {
                const date = new Date(lead.created_at);
                const monthName = months[date.getMonth()];
                revenueMap[monthName] = (revenueMap[monthName] || 0) + (lead.budget || 0);
            }
        });

        const monthlyRevenueData = Object.entries(revenueMap).map(([name, revenue]) => ({
            name,
            revenue
        })).sort((a, b) => months.indexOf(a.name) - months.indexOf(b.name));

        // Ensure we have at least some empty months for visual balance if empty
        if (monthlyRevenueData.length === 0) {
            const currentMonth = new Date().getMonth();
            for (let i = 0; i <= currentMonth; i++) {
                monthlyRevenueData.push({ name: months[i], revenue: 0 });
            }
        }

        return { leadSourcesData, monthlyRevenueData };
    }, [leads]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-muted-foreground">From</span>
                    <CalendarDateRangePicker />
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-muted-foreground">To</span>
                    <CalendarDateRangePicker />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lead Sources Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Lead Sources</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={analytics.leadSourcesData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={0}
                                        dataKey="value"
                                    >
                                        {analytics.leadSourcesData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: any) => `${value}`}
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    />
                                    <Legend
                                        verticalAlign="middle"
                                        align="right"
                                        layout="vertical"
                                        iconType="circle"
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Monthly Revenue Chart */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Monthly Revenue</CardTitle>
                        <DownloadIcon className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.monthlyRevenueData} barSize={40}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#64748b"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#64748b"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f1f5f9' }}
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        formatter={(value: any) => [`$${value}`, 'Revenue']}
                                    />
                                    <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function DownloadIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
    )
}
