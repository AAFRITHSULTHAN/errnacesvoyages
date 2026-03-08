import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Mail, MoreHorizontal, Phone, Users, TrendingUp } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList, ReferenceLine, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { StaffForm } from '@/components/staff/StaffForm';
import { StaffProfile } from '@/components/staff/StaffProfile';
import { useAppStore } from '@/store';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '@/types';
import { useI18n } from '@/i18n';


export function Staff() {
    const { staff, addStaff, updateStaff, deleteStaff, fetchStaff, leads, fetchLeads } = useAppStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<User | undefined>(undefined);
    const { t } = useI18n();

    useEffect(() => {
        fetchStaff();
        fetchLeads();
    }, [fetchStaff, fetchLeads]);

    // Calculate staff sales data & sort top performers SaaS style
    const staffSalesData = useMemo(() => {
        return staff.map(member => {
            const allAssigned = leads.filter(l => l.assigned_staff_id === member.id);
            const convertedLeads = allAssigned.filter(l => l.status === 'converted');
            const salesRevenue = convertedLeads.reduce((sum, l) => sum + (l.budget || 0), 0);
            const conversionRate = allAssigned.length > 0
                ? Math.round((convertedLeads.length / allAssigned.length) * 100)
                : 0;

            return {
                id: member.id,
                name: member.full_name.split(' ')[0],
                fullName: member.full_name,
                avatar: member.avatar_url,
                totalLeads: allAssigned.length,
                convertedLeads: convertedLeads.length,
                unconvertedLeads: allAssigned.length - convertedLeads.length,
                conversionRate,
                salesRevenue,
            };
        }).sort((a, b) => {
            // Sort by revenue first, then conversion rate
            if (b.salesRevenue !== a.salesRevenue) return b.salesRevenue - a.salesRevenue;
            return b.conversionRate - a.conversionRate;
        }).map((staff, index) => {
            // Assign Gamification Ranking Badges
            let rankBadge = '⚠'; // Default: Needs attention
            let colorRing = 'border-rose-200'; // Default: Red ring

            if (staff.convertedLeads > 0) {
                if (index === 0) { rankBadge = '🏆'; colorRing = 'border-amber-400'; } // 1st
                else if (index === 1) { rankBadge = '🥈'; colorRing = 'border-slate-300'; } // 2nd
                else if (index === 2) { rankBadge = '🥉'; colorRing = 'border-amber-700'; } // 3rd
                else { rankBadge = '👍'; colorRing = 'border-emerald-200'; } // Average/Good
            }

            return { ...staff, rankBadge, colorRing, rankIndex: index + 1 };
        });
    }, [staff, leads]);

    // Calculate aggregated KPIs for Summary Cards
    const summaryKPIs = useMemo(() => {
        const totalAssigned = staffSalesData.reduce((sum, s) => sum + s.totalLeads, 0);
        const totalConverted = staffSalesData.reduce((sum, s) => sum + s.convertedLeads, 0);
        const totalRevenue = staffSalesData.reduce((sum, s) => sum + s.salesRevenue, 0);
        const avgConversion = totalAssigned > 0 ? Math.round((totalConverted / totalAssigned) * 100) : 0;
        const targetRevenue = staffSalesData.length > 0 ? Math.round(totalRevenue / staffSalesData.length) : 0;

        return { totalAssigned, totalConverted, avgConversion, totalRevenue, targetRevenue };
    }, [staffSalesData]);

    const insightText = useMemo(() => {
        if (staffSalesData.length === 0) return "No data available yet.";
        const top = staffSalesData[0];
        const bottom = staffSalesData[staffSalesData.length - 1];

        if (top.salesRevenue > 0) {
            return `🏆 ${top.name} leads with $${top.salesRevenue.toLocaleString()} revenue and a ${top.conversionRate}% conversion rate. Suggestion: Allocate high-value inbound leads directly to ${top.name} to maximize closing probability. ${bottom.convertedLeads === 0 ? `\n📉 ${bottom.name} has not converted any leads yet.` : ''}`;
        }
        return "No revenue generated yet. Keep tracking conversions!";
    }, [staffSalesData]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            // Find our staff member manually since Recharts payload splitting for stacked bars makes it tricky
            const staffName = payload[0].payload.name;
            const data = staffSalesData.find(s => s.name === staffName) || payload[0].payload;

            return (
                <div className="bg-white p-4 border border-slate-200 shadow-xl rounded-xl min-w-[220px]">
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100">
                        <Avatar className={cn("h-8 w-8 border-2", data.colorRing)}>
                            <AvatarImage src={data.avatar} />
                            <AvatarFallback className="bg-slate-100 text-slate-700 font-bold text-xs">{data.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-bold text-slate-900 text-sm">{data.fullName} {data.rankBadge}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Rank #{data.rankIndex}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium tracking-tight">Assigned Leads</span>
                            <span className="font-bold text-slate-900">{data.totalLeads}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-emerald-600 font-medium tracking-tight">Converted Leads</span>
                            <span className="font-bold text-emerald-700">{data.convertedLeads}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium tracking-tight">Conversion Rate</span>
                            <span className="font-bold text-slate-900">{data.conversionRate}%</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 mt-2 border-t border-slate-100">
                            <span className="text-blue-600 font-bold tracking-tight">Total Revenue</span>
                            <span className="font-black text-blue-700">${data.salesRevenue.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    const CustomXAxisTick = ({ x, y, payload }: any) => {
        const staffMember = staffSalesData.find(s => s.name === payload.value);
        if (!staffMember) return null;

        return (
            <g transform={`translate(${x},${y})`}>
                <foreignObject x="-30" y="8" width="60" height="50">
                    <div className="flex flex-col items-center justify-center w-full h-full gap-1">
                        <span className="text-[10px] absolute -top-1 -right-2 z-10">{staffMember.rankBadge}</span>
                        <Avatar className={cn("h-7 w-7 border-2", staffMember.colorRing)}>
                            <AvatarImage src={staffMember.avatar} />
                            <AvatarFallback className="bg-slate-100 text-[10px] font-bold tracking-tighter text-slate-600">
                                {staffMember.name[0]}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] font-bold text-slate-600 truncate max-w-full tracking-tight">
                            #{staffMember.rankIndex} {payload.value}
                        </span>
                    </div>
                </foreignObject>
            </g>
        );
    };

    const CustomLineCrownDot = (props: any) => {
        const { cx, cy, payload } = props;
        const isHighest = payload.salesRevenue > 0 && payload.salesRevenue === staffSalesData[0]?.salesRevenue;

        return (
            <g>
                <circle cx={cx} cy={cy} r={5} stroke="#3B82F6" strokeWidth={2} fill="#fff" />
                {isHighest && (
                    <text x={cx} y={cy - 25} textAnchor="middle" fontSize="16px">👑</text>
                )}
            </g>
        );
    };


    const handleAddStaff = () => {
        setSelectedStaff(undefined);
        setIsDialogOpen(true);
    };

    const handleEditStaff = (staff: User) => {
        setSelectedStaff(staff);
        setIsDialogOpen(true);
    };

    const handleDeleteStaff = (id: string) => {
        if (confirm('Are you sure you want to delete this staff member?')) {
            deleteStaff(id);
        }
    };

    const handleViewProfile = (staff: User) => {
        setSelectedStaff(staff);
        setIsProfileOpen(true);
    };

    const handleSaveStaff = async (data: any) => {
        const userData: User = {
            id: selectedStaff ? selectedStaff.id : uuidv4(),
            full_name: data.full_name,
            email: data.email,
            role: data.role,
            phone: data.phone,
            avatar_url: selectedStaff?.avatar_url,
            status: 'active',
        };

        if (selectedStaff) {
            await updateStaff(selectedStaff.id, userData);
        } else {
            // Generate password: email + first 4 letters of name + @123
            const namePart = (data.full_name || '').replace(/\s+/g, '').slice(0, 4);
            const generatedPassword = `${data.email}${namePart}@123`;

            console.log('Creating staff with password:', generatedPassword);
            await addStaff(userData, generatedPassword);
        }
        setIsDialogOpen(false);
    };

    const filteredStaff = staff.filter(member =>
        member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatRole = (role: string) => {
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">{t('staffMgmt')}</h2>
                    <p className="text-slate-500 mt-1">{t('staffDesc')}</p>
                </div>
                <Button className="bg-[#33A894] hover:bg-[#2c9180] text-white" onClick={handleAddStaff}>
                    <Plus className="mr-2 h-4 w-4" /> {t('addMember')}
                </Button>
            </div>

            <Card className="border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in slide-in-from-bottom-4 duration-500 bg-white rounded-2xl">
                <CardHeader className="bg-white border-b border-slate-100 pb-0 px-8 pt-8 relative overflow-hidden">
                    <div className="flex justify-between items-start relative z-10 mb-6">
                        <div>
                            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                                {t('staffSalesPerf')}
                            </CardTitle>
                            <CardDescription className="mt-1.5 text-slate-500/90 text-sm font-medium">
                                Track assigned leads against conversions and generated revenue.
                            </CardDescription>
                        </div>
                    </div>

                    {/* AI Insights & Filtering Header */}
                    <div className="flex flex-col xl:flex-row gap-4 px-8 mb-6">
                        <div className="flex-1 p-4 bg-blue-50/50 rounded-xl border border-blue-100/50 flex items-start gap-4 shadow-sm shadow-blue-900/5">
                            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shrink-0 shadow-md shadow-blue-500/20">
                                <span className="text-xl">🤖</span>
                            </div>
                            <div className="w-full">
                                <p className="text-[13px] font-bold text-blue-900 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    AI Performance Insight
                                </p>
                                <p className="text-sm text-blue-800/90 whitespace-pre-line font-medium leading-relaxed">{insightText}</p>
                            </div>
                        </div>

                        {/* Interactive Time Filter Mock UI */}
                        <div className="shrink-0 flex items-center self-start xl:self-center bg-slate-100/50 p-1.5 rounded-xl border border-slate-200/60">
                            {['Today', 'This Week', 'This Month', 'Quarter'].map((filter, i) => (
                                <button key={filter} className={cn(
                                    "px-4 py-2 text-[13px] font-bold rounded-lg transition-all",
                                    i === 2 ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                )}>
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* KPI Summary Cards */}
                    <div className="grid grid-cols-4 gap-4 px-8 mb-4">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100/60">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Assigned</p>
                            <div className="flex items-end justify-between">
                                <p className="text-2xl font-black text-slate-900">{summaryKPIs.totalAssigned}</p>
                                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> 12%</span>
                            </div>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100/60 shadow-sm shadow-emerald-900/5">
                            <p className="text-[11px] font-bold text-emerald-600/80 uppercase tracking-widest mb-1">Total Converted</p>
                            <div className="flex items-end justify-between">
                                <p className="text-2xl font-black text-emerald-700">{summaryKPIs.totalConverted}</p>
                                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> 5%</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100/60 shadow-sm shadow-slate-900/5">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avg Conversion</p>
                            <div className="flex items-end justify-between">
                                <p className="text-2xl font-black text-slate-900">{summaryKPIs.avgConversion}%</p>
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5">— 0%</span>
                            </div>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100/60 w-full relative overflow-hidden shadow-sm shadow-blue-900/5">
                            <div className="relative z-10">
                                <p className="text-[11px] font-bold text-blue-600/80 uppercase tracking-widest mb-1">Total Revenue</p>
                                <div className="flex items-end justify-between">
                                    <p className="text-2xl font-black text-blue-700">${summaryKPIs.totalRevenue.toLocaleString()}</p>
                                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> 18%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 px-6 pb-6">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={staffSalesData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }} barGap={6}>
                                <defs>
                                    <linearGradient id="colorConverted" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#33A894" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#257d6e" stopOpacity={1} />
                                    </linearGradient>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f1f5f9" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#e2e8f0" stopOpacity={1} />
                                    </linearGradient>
                                    <linearGradient id="colorRevenueGrad" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.9} />
                                        <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.9} />
                                    </linearGradient>
                                    <filter id="shadow" height="200%">
                                        <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#2563EB" floodOpacity="0.25" />
                                    </filter>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" vertical={true} horizontal={true} stroke="#f1f5f9" strokeOpacity={0.3} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={<CustomXAxisTick />}
                                    height={70}
                                    dy={5}
                                />
                                <YAxis
                                    yAxisId="left"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                                    dx={-10}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#0ea5e9', fontSize: 12, fontWeight: 700 }}
                                    tickFormatter={(v) => `$${v.toLocaleString()}`}
                                    dx={10}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.8 }} />

                                <Legend
                                    wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 600, color: '#64748b' }}
                                    iconType="circle"
                                />

                                {summaryKPIs.targetRevenue > 0 && (
                                    <ReferenceLine
                                        y={summaryKPIs.targetRevenue}
                                        yAxisId="right"
                                        stroke="#cbd5e1"
                                        strokeDasharray="4 4"
                                        label={{ position: 'top', value: `Goal avg: $${summaryKPIs.targetRevenue.toLocaleString()}`, fill: '#94A3B8', fontSize: 11, fontWeight: 'bold' }}
                                    />
                                )}

                                {/* True Stacked Bars (Converted + Unconverted = Total) */}
                                <Bar yAxisId="left" dataKey="convertedLeads" stackId="a" name="Converted" fill="#10B981" radius={[0, 0, 4, 4]} barSize={40}>
                                    <LabelList
                                        dataKey="convertedLeads"
                                        position="center"
                                        formatter={(val: any) => val > 0 ? `${val}` : ''}
                                        style={{ fill: '#ffffff', fontSize: '11px', fontWeight: 'bold' }}
                                    />
                                    {staffSalesData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? "#059669" : "#10B981"} />
                                    ))}
                                </Bar>
                                <Bar yAxisId="left" dataKey="unconvertedLeads" stackId="a" name="Remaining" fill="#E5E7EB" radius={[4, 4, 0, 0]} barSize={40} />

                                <Line
                                    yAxisId="right"
                                    name="Revenue"
                                    type="monotone"
                                    dataKey="salesRevenue"
                                    stroke="url(#colorRevenueGrad)"
                                    strokeWidth={4}
                                    filter="url(#shadow)"
                                    dot={<CustomLineCrownDot />}
                                    activeDot={{ r: 8, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }}
                                >
                                    <LabelList
                                        dataKey="salesRevenue"
                                        position="top"
                                        offset={12}
                                        formatter={(val: any) => Number(val) > 0 ? `$${val}` : ''}
                                        style={{ fill: '#3B82F6', fontSize: '11px', fontWeight: 'bold' }}
                                    />
                                </Line>
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="animate-in slide-in-from-bottom-6 duration-500 delay-150">
                <CardHeader>
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <span className="text-xl">📊</span> {t('leaderboard')}
                        </CardTitle>
                        <CardDescription>Track conversion efficiency and final revenue generation at a glance.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader className="bg-slate-50/80">
                            <TableRow>
                                <TableHead className="w-[100px] font-bold text-slate-700">Rank</TableHead>
                                <TableHead className="font-bold text-slate-700">Staff</TableHead>
                                <TableHead className="text-center font-bold text-slate-700">Assigned</TableHead>
                                <TableHead className="text-center font-bold text-emerald-700">Converted</TableHead>
                                <TableHead className="text-center font-bold text-slate-700">Conversion</TableHead>
                                <TableHead className="text-right font-bold text-blue-700">Revenue</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staffSalesData.map((staff) => (
                                <TableRow key={staff.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">{staff.rankBadge}</span>
                                            <span className="text-xs font-bold text-slate-400">#{staff.rankIndex}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className={cn("h-8 w-8 border", staff.colorRing, "group-hover:scale-110 transition-transform")}>
                                                <AvatarImage src={staff.avatar} />
                                                <AvatarFallback className="text-xs">{staff.name[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-bold text-slate-900">{staff.fullName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-slate-600">{staff.totalLeads}</TableCell>
                                    <TableCell className="text-center font-bold text-emerald-600">{staff.convertedLeads}</TableCell>
                                    <TableCell className="text-center font-bold text-slate-900">{staff.conversionRate}%</TableCell>
                                    <TableCell className="text-right font-black text-blue-600">${staff.salesRevenue.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card className="animate-in slide-in-from-bottom-8 duration-500 delay-300">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{t('teamMembers')}</CardTitle>
                            <CardDescription>{t('teamDesc')}</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder={t('search')}
                                className="pl-9 bg-slate-50 border-slate-200"
                                value={searchTerm}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">{t('avatar')}</TableHead>
                                <TableHead className="font-semibold text-slate-700">{t('memberDetails')}</TableHead>
                                <TableHead className="font-semibold text-slate-700">{t('roleDept')}</TableHead>
                                <TableHead className="font-semibold text-slate-700">{t('contactDetails')}</TableHead>
                                <TableHead className="font-semibold text-slate-700">Assigned Leads</TableHead>
                                <TableHead className="font-semibold text-slate-700">{t('status')}</TableHead>
                                <TableHead className="text-right font-semibold text-slate-700">{t('actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStaff.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        {t('noStaffFound')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStaff.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell>
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={member.avatar_url} alt={member.full_name} />
                                                <AvatarFallback>{member.full_name?.[0] || 'U'}</AvatarFallback>
                                            </Avatar>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 leading-tight">{member.full_name}</span>
                                                <span className="text-[11px] text-slate-400 font-medium">ID: {member.id?.substring(0, 8) || 'N/A'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-700">{formatRole(member.role)}</span>
                                                <span className="text-[11px] text-indigo-500 font-bold uppercase tracking-tighter">{member.department || 'General'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-xs text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer group/item">
                                                    <Mail className="h-3.5 w-3.5 text-slate-400 group-hover/item:text-indigo-500" />
                                                    {member.email}
                                                </div>
                                                {member.phone && (
                                                    <div className="flex items-center gap-2 text-xs text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer group/item">
                                                        <Phone className="h-3.5 w-3.5 text-slate-400 group-hover/item:text-indigo-500" />
                                                        {member.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(
                                                "h-6 px-2 text-[10px] font-bold uppercase tracking-wider border-2",
                                                member.status === 'active' || !member.status ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-100"
                                            )}>
                                                {member.status || 'Active'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {(() => {
                                                const total = leads.filter(l => l.assigned_staff_id === member.id).length;
                                                const converted = leads.filter(l => l.assigned_staff_id === member.id && l.status === 'converted').length;
                                                return (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <Users className="h-3.5 w-3.5 text-slate-400" />
                                                            <span className="text-sm font-semibold text-slate-700">{total} leads</span>
                                                        </div>
                                                        {converted > 0 && (
                                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded w-fit">
                                                                {converted} converted
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleViewProfile(member)}>{t('viewProfile')}</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleEditStaff(member)}>{t('editDetails')}</DropdownMenuItem>
                                                    <DropdownMenuItem>{t('changeRole')}</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteStaff(member.id)}>{t('deactivateAccount')}</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedStaff ? t('editStaffTitle') : t('addStaffTitle')}</DialogTitle>
                        <DialogDescription>
                            {selectedStaff ? t('editStaffDesc') : t('addStaffDesc')}
                        </DialogDescription>
                    </DialogHeader>
                    <StaffForm
                        initialData={selectedStaff}
                        onSubmit={handleSaveStaff}
                        onCancel={() => setIsDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            <StaffProfile
                staff={selectedStaff}
                open={isProfileOpen}
                onOpenChange={setIsProfileOpen}
            />
        </div>
    );
}
