import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, DollarSign, Users, TrendingUp, CheckCircle2 } from 'lucide-react';
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
        if (!staff) return { dealsClosed: 0, totalRevenue: 0, conversion: 0, totalLeads: 0, performanceData: [], staffLeads: [] };

        const staffLeads = leads.filter(l => l.assigned_staff_id === staff.id);
        const totalLeads = staffLeads.length;
        const convertedLeads = staffLeads.filter(l => l.status === 'converted');

        const dealsClosed = convertedLeads.length;
        const totalRevenue = convertedLeads.reduce((sum, l) => sum + (l.budget || 0), 0);
        const conversion = totalLeads > 0 ? Math.round((dealsClosed / totalLeads) * 100) : 0;

        // Performance Trend
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

        return { dealsClosed, totalRevenue, conversion, totalLeads, performanceData, staffLeads };
    }, [staff, leads]);

    if (!staff) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/95 backdrop-blur-xl">
                {/* Premium Mesh Gradient Header */}
                <div className="relative p-7 text-white overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-700" />
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`, backgroundSize: '24px 24px' }} />
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-tr from-white/40 to-white/0 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-500" />
                            <Avatar className="h-24 w-24 border-4 border-white/30 shadow-2xl relative">
                                <AvatarImage src={staff?.avatar_url} alt={staff?.full_name} className="object-cover" />
                                <AvatarFallback className="text-4xl bg-gradient-to-br from-white/20 to-white/5 text-white font-black">
                                    {staff?.full_name?.[0] || 'U'}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        <div className="flex-1 text-center md:text-left space-y-3">
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                <h3 className="text-4xl font-black tracking-tighter drop-shadow-sm">{staff?.full_name || 'Staff Member'}</h3>
                                <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 w-fit mx-auto md:mx-0">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">{staff?.status || 'Active'}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-center md:justify-start gap-2">
                                <span className="text-indigo-100/90 font-black uppercase text-[11px] tracking-[0.25em] py-1 px-3 bg-black/10 rounded-lg">
                                    {staff?.role?.replace('_', ' ') || 'Staff'}
                                </span>
                                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                <span className="text-indigo-100/90 font-black uppercase text-[11px] tracking-[0.25em]">
                                    {staff?.department || 'Operations'}
                                </span>
                            </div>

                            <div className="flex flex-wrap justify-center md:justify-start gap-5 pt-5 mt-2 border-t border-white/10">
                                <div className="flex items-center gap-2.5 text-sm font-bold text-indigo-50/90 hover:text-white transition-colors cursor-default">
                                    <div className="p-1.5 bg-white/10 rounded-lg"><Mail className="h-3.5 w-3.5" /></div>
                                    {staff?.email}
                                </div>
                                {staff?.phone && (
                                    <div className="flex items-center gap-2.5 text-sm font-bold text-indigo-50/90 hover:text-white transition-colors cursor-default">
                                        <div className="p-1.5 bg-white/10 rounded-lg"><Phone className="h-3.5 w-3.5" /></div>
                                        {staff.phone}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-7 pb-12 space-y-10 bg-slate-50/30">
                    {/* Refined Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: 'Assigned', value: stats.totalLeads, icon: Users, color: 'violet' },
                            { label: 'Converted', value: stats.dealsClosed, icon: CheckCircle2, color: 'emerald' },
                            { label: 'Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'indigo' },
                            { label: 'Efficiency', value: `${stats.conversion}%`, icon: TrendingUp, color: 'amber' }
                        ].map((item) => (
                            <Card key={item.label} className="border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white overflow-hidden group hover:-translate-y-1 transition-all duration-300 rounded-[1.5rem]">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                    <div className={cn(
                                        "p-2.5 rounded-xl mb-3 transition-all duration-500 group-hover:rotate-6",
                                        item.color === 'violet' ? "bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white" :
                                            item.color === 'emerald' ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white" :
                                                item.color === 'indigo' ? "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white" :
                                                    "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white"
                                    )}>
                                        <item.icon className="h-4 w-4" />
                                    </div>
                                    <div className="text-xl font-black text-slate-800 tracking-tight">{item.value}</div>
                                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{item.label}</div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="space-y-10">
                        {/* Monthly Performance with Luxury Polish */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-1 w-6 rounded-full bg-indigo-600" />
                                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Monthly Performance</h4>
                            </div>
                            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-5 rounded-[2rem]">
                                <div className="h-[150px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.performanceData}>
                                            <defs>
                                                <linearGradient id="barGradPremium" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                                                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7} />
                                                </linearGradient>
                                                <filter id="shadow">
                                                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.15" />
                                                </filter>
                                            </defs>
                                            <XAxis
                                                dataKey="name"
                                                stroke="#cbd5e1"
                                                fontSize={10}
                                                fontWeight={800}
                                                tickLine={false}
                                                axisLine={false}
                                                dy={10}
                                            />
                                            <YAxis hide />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(99, 102, 241, 0.03)', radius: 10 }}
                                                contentStyle={{
                                                    borderRadius: '16px',
                                                    border: 'none',
                                                    boxShadow: '0 15px 30px rgba(0,0,0,0.08)',
                                                    fontWeight: '800',
                                                    padding: '10px 16px',
                                                    fontSize: '11px',
                                                    background: 'rgba(255,255,255,0.98)',
                                                    backdropFilter: 'blur(10px)'
                                                }}
                                                formatter={(value) => [`$${(value || 0).toLocaleString()}`, 'Revenue']}
                                            />
                                            <Bar
                                                dataKey="sales"
                                                fill="url(#barGradPremium)"
                                                radius={[6, 6, 6, 6]}
                                                barSize={24}
                                                filter="url(#shadow)"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </div>

                        {/* All Assigned Clients Luxury Table */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-1 w-6 rounded-full bg-indigo-600" />
                                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Client Directory ({stats.totalLeads})</h4>
                            </div>
                            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-[2rem] overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/50 backdrop-blur-sm border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Client Identity</th>
                                                <th className="px-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status</th>
                                                <th className="px-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Budget</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {stats.staffLeads.length > 0 ? stats.staffLeads.map((lead) => (
                                                <tr key={lead.id} className="group hover:bg-indigo-50/30 transition-all duration-300">
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-[10px] font-black text-indigo-600 shadow-sm transition-transform group-hover:scale-110">
                                                                {lead.name[0]}
                                                            </div>
                                                            <div>
                                                                <p className="text-[12px] font-black text-slate-800 leading-tight">{lead.name}</p>
                                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Joined {format(parseISO(lead.created_at), 'MMM yyyy')}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex justify-center">
                                                            <Badge className={cn(
                                                                "uppercase text-[7px] font-black tracking-[0.15em] px-2 py-0.5 rounded-full border-none shadow-sm",
                                                                lead.status === 'converted' ? "bg-emerald-500 text-white" :
                                                                    lead.status === 'lost' ? "bg-rose-500 text-white" :
                                                                        "bg-indigo-500 text-white"
                                                            )}>
                                                                {lead.status}
                                                            </Badge>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <p className="text-[12px] font-black text-slate-900 tracking-tight">${(lead.budget || 0).toLocaleString()}</p>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-10 text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">No active records found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
