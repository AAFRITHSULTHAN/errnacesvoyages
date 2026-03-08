import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, Calendar, DollarSign, Award, TrendingUp } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useMemo } from 'react';
import { useAppStore } from '@/store';
import { format, subMonths, parseISO } from 'date-fns';

interface StaffProfileProps {
    staff: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function StaffProfile({ staff, open, onOpenChange }: StaffProfileProps) {
    const leads = useAppStore(state => state.leads);

    const stats = useMemo(() => {
        if (!staff) return { dealsClosed: 0, totalRevenue: 0, conversion: 0, performanceData: [], recentActivity: [] };

        const staffLeads = leads.filter(l => l.assigned_staff_id === staff.id);
        const totalLeads = staffLeads.length;
        const convertedLeads = staffLeads.filter(l => l.status === 'converted');

        const dealsClosed = convertedLeads.length;
        const totalRevenue = convertedLeads.reduce((sum, l) => sum + (l.budget || 0), 0);
        const conversion = totalLeads > 0 ? Math.round((dealsClosed / totalLeads) * 100) : 0;

        // Last 6 months performance
        const performanceData = [];
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const monthName = format(date, 'MMM');

            const monthSales = convertedLeads
                .filter(l => {
                    if (!l.created_at) return false;
                    const ldate = parseISO(l.created_at);
                    return ldate.getMonth() === date.getMonth() && ldate.getFullYear() === date.getFullYear();
                })
                .reduce((sum, l) => sum + (l.budget || 0), 0);

            performanceData.push({ name: monthName, sales: monthSales });
        }

        const recentActivity = [...staffLeads]
            .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
            .slice(0, 5);

        return { dealsClosed, totalRevenue, conversion, performanceData, recentActivity };
    }, [staff, leads]);

    if (!staff) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>Staff Profile</SheetTitle>
                    <SheetDescription>
                        Detailed view of staff member performance and information.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex flex-col gap-6">
                    {/* Header Profile Info */}
                    <div className="flex items-start gap-4">
                        <Avatar className="h-20 w-20 border-2 border-white shadow-lg">
                            <AvatarImage src={staff?.avatar_url} alt={staff?.full_name} />
                            <AvatarFallback className="text-xl">
                                {staff?.full_name?.[0] || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold">{staff?.full_name || 'Staff Member'}</h3>
                                <Badge variant={staff?.status === 'active' ? 'default' : 'secondary'} className={staff?.status === 'active' ? 'bg-green-600' : ''}>
                                    {staff?.status || 'Active'}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground font-medium">{staff?.role || 'Staff'}</p>

                            <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                                <div className="flex items-center gap-1">
                                    <Mail className="h-3.5 w-3.5" /> {staff?.email}
                                </div>
                                {staff?.phone && (
                                    <div className="flex items-center gap-1">
                                        <Phone className="h-3.5 w-3.5" /> {staff.phone}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <Award className="h-5 w-5 text-blue-500 mb-2" />
                                <div className="text-2xl font-bold">{stats.dealsClosed}</div>
                                <div className="text-xs text-muted-foreground">Deals Closed</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <DollarSign className="h-5 w-5 text-green-500 mb-2" />
                                <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">Total Revenue</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                <TrendingUp className="h-5 w-5 text-purple-500 mb-2" />
                                <div className="text-2xl font-bold">{stats.conversion}%</div>
                                <div className="text-xs text-muted-foreground">Conversion</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Performance Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Monthly Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.performanceData}>
                                        <XAxis
                                            dataKey="name"
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `$${value}`}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Bar dataKey="sales" fill="#E50914" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Activity Timeline / Recent Actions */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Recent Activity</h4>
                        <div className="space-y-4">
                            {stats.recentActivity.length > 0 ? stats.recentActivity.map((lead) => (
                                <div key={lead.id} className="flex gap-4">
                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                        <Calendar className="h-4 w-4 text-slate-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Lead: {lead.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Status: <span className="uppercase text-[10px] font-bold text-indigo-500">{lead.status}</span> • {format(parseISO(lead.created_at || new Date().toISOString()), 'MMM d, h:mm a')}
                                            {lead.tour_interest ? ` • Tour: ${lead.tour_interest}` : ''}
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-sm text-muted-foreground text-center py-4">No recent activity.</div>
                            )}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
