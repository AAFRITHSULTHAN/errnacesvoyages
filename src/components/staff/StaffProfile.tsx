import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, Calendar, DollarSign, Users, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useMemo } from 'react';
import { useAppStore } from '@/store';
import { format, subMonths, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface StaffProfileProps {
    staff: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function StaffProfile({ staff, open, onOpenChange }: StaffProfileProps) {
    const leads = useAppStore(state => state.leads);

    const stats = useMemo(() => {
        if (!staff) return { dealsClosed: 0, totalRevenue: 0, conversion: 0, totalLeads: 0, performanceData: [], recentActivity: [] };

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

        return { dealsClosed, totalRevenue, conversion, totalLeads, performanceData, recentActivity };
    }, [staff, leads]);

    if (!staff) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-3xl overflow-hidden">
                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 text-white relative">
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                        <Avatar className="h-24 w-24 border-4 border-white/20 shadow-xl ring-4 ring-white/10">
                            <AvatarImage src={staff?.avatar_url} alt={staff?.full_name} />
                            <AvatarFallback className="text-2xl bg-white/20 text-white font-black">
                                {staff?.full_name?.[0] || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-center md:text-left space-y-2">
                            <div className="flex flex-col md:flex-row md:items-center gap-3">
                                <h3 className="text-3xl font-black tracking-tight">{staff?.full_name || 'Staff Member'}</h3>
                                <Badge className="w-fit mx-auto md:mx-0 bg-white/20 text-white border-white/20 hover:bg-white/30 transition-colors uppercase text-[10px] font-black tracking-widest px-3">
                                    {staff?.status || 'Active'}
                                </Badge>
                            </div>
                            <p className="text-indigo-100 font-bold uppercase text-xs tracking-widest">{staff?.role?.replace('_', ' ') || 'Staff'}</p>

                            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4 pt-4 border-t border-white/10">
                                <div className="flex items-center gap-2 text-sm font-medium text-indigo-50">
                                    <Mail className="h-4 w-4 opacity-70" /> {staff?.email}
                                </div>
                                {staff?.phone && (
                                    <div className="flex items-center gap-2 text-sm font-medium text-indigo-50">
                                        <Phone className="h-4 w-4 opacity-70" /> {staff.phone}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8 bg-slate-50">
                    {/* Professional Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
                            <CardContent className="p-5 flex flex-col items-center justify-center text-center">
                                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 mb-3 group-hover:scale-110 transition-transform">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div className="text-2xl font-black text-slate-900">{stats.totalLeads}</div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Assigned</div>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
                            <CardContent className="p-5 flex flex-col items-center justify-center text-center">
                                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 mb-3 group-hover:scale-110 transition-transform">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <div className="text-2xl font-black text-slate-900">{stats.dealsClosed}</div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Converted</div>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
                            <CardContent className="p-5 flex flex-col items-center justify-center text-center">
                                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 mb-3 group-hover:scale-110 transition-transform">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                                <div className="text-2xl font-black text-slate-900">${stats.totalRevenue.toLocaleString()}</div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Revenue</div>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
                            <CardContent className="p-5 flex flex-col items-center justify-center text-center">
                                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 mb-3 group-hover:scale-110 transition-transform">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <div className="text-2xl font-black text-slate-900">{stats.conversion}%</div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Efficiency</div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Performance Chart */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Monthly Performance</h4>
                            <Card className="border-none shadow-sm bg-white p-6">
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.performanceData}>
                                            <defs>
                                                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#4F46E5" stopOpacity={1} />
                                                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0.8} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis
                                                dataKey="name"
                                                stroke="#94a3b8"
                                                fontSize={10}
                                                fontWeight={700}
                                                tickLine={false}
                                                axisLine={false}
                                                dy={10}
                                            />
                                            <YAxis hide />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                                formatter={(value) => [`$${(value || 0).toLocaleString()}`, 'Revenue']}
                                            />
                                            <Bar dataKey="sales" fill="url(#barGrad)" radius={[6, 6, 6, 6]} barSize={32} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </div>

                        {/* Activity Timeline */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Recent Activity</h4>
                            <div className="space-y-3">
                                {stats.recentActivity.length > 0 ? stats.recentActivity.map((lead) => (
                                    <div key={lead.id} className="flex items-center gap-4 p-3 bg-white rounded-2xl shadow-sm border border-slate-100 group hover:border-indigo-200 transition-colors">
                                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-50 transition-colors">
                                            <Calendar className="h-5 w-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-extrabold text-slate-900 truncate">Lead: {lead.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={cn(
                                                    "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                                                    lead.status === 'converted' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                                )}>
                                                    {lead.status}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                                    {format(parseISO(lead.created_at || new Date().toISOString()), 'MMM d, h:mm a')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-sm text-slate-400 font-bold text-center py-12 bg-slate-100/50 rounded-3xl border-2 border-dashed border-slate-200">
                                        No recent activity records.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
