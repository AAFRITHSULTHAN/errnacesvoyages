import { Button } from '@/components/ui/button';
import { Plus, Send } from 'lucide-react';
import { KPICards } from '@/components/dashboard/KPICards';
import { LeadsTrendChart } from '@/components/dashboard/LeadsTrendChart';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { useAppStore } from '@/store';
import { useMemo, useState } from 'react';
import { format, subDays, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { LeadForm } from '@/components/leads/LeadForm';
import { v4 as uuidv4 } from 'uuid';

export function Dashboard() {
    const { leads, tours, addLead } = useAppStore();
    const navigate = useNavigate();
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

    const handleSaveLead = (data: any) => {
        addLead({
            id: uuidv4(),
            created_at: new Date().toISOString(),
            ...data
        });
        setIsLeadModalOpen(false);
    };

    const dashboardData = useMemo(() => {
        // 1. KPIs
        const totalLeads = leads.length;
        const activeTours = tours.filter(t => t.status === 'active').length;

        // Calculate conversion rate
        const convertedLeads = leads.filter(l => l.status === 'converted').length;
        const conversionRate = totalLeads > 0
            ? ((convertedLeads / totalLeads) * 100).toFixed(1)
            : '0.0';

        // Calculate Revenue (sum of budget for converted leads)
        const totalRevenue = leads
            .filter(l => l.status === 'converted')
            .reduce((sum, l) => sum + (l.budget || 0), 0);

        // Pending follow-ups (leads in 'contacted' or 'proposal_sent' status)
        const pendingFollowUps = leads.filter(l =>
            l.status === 'contacted' || l.status === 'proposal_sent'
        ).length;

        const kpis = [
            { label: 'Total Leads', value: totalLeads.toString(), icon: 'Users' },
            { label: 'Active Tours', value: activeTours.toString(), icon: 'Map' },
            { label: 'Conversion Rate', value: `${conversionRate}%`, icon: 'TrendingUp' },
            { label: 'Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: 'DollarSign' },
            { label: 'Pending Follow-ups', value: pendingFollowUps.toString(), icon: 'Calendar' },
            { label: 'Won Leads', value: convertedLeads.toString(), icon: 'UserCheck' }, // Replaced "Messages Sent"
            { label: 'Avg. Budget', value: convertedLeads > 0 ? `$${Math.round(totalRevenue / convertedLeads).toLocaleString()}` : '$0', icon: 'DollarSign' },
            { label: 'Lost Leads', value: leads.filter(l => l.status === 'lost').length.toString(), icon: 'Users' },
        ];

        // 2. Leads Trend Data (Last 30 Days)
        const last30Days = Array.from({ length: 30 }, (_, i) => {
            const date = subDays(new Date(), 29 - i);
            return format(date, 'MMM d');
        });

        const leadsTrendData = last30Days.map(dateStr => {
            const count = leads.filter(l => format(parseISO(l.created_at), 'MMM d') === dateStr).length;
            return { name: dateStr, leads: count };
        });

        // simplified to grouping by 5-day intervals if needed, but daily is fine for now if data is sparse

        // 3. Revenue by Package
        // Group converted leads by tour_interest
        const revenueByPackageMap = leads
            .filter(l => l.status === 'converted' && l.tour_interest)
            .reduce((acc, lead) => {
                const tourName = lead.tour_interest || 'Custom';
                acc[tourName] = (acc[tourName] || 0) + (lead.budget || 0);
                return acc;
            }, {} as Record<string, number>);

        const revenueData = Object.entries(revenueByPackageMap).map(([name, revenue]) => ({
            name,
            revenue
        })).sort((a, b) => b.revenue - a.revenue);

        // 4. Recent Activity
        // Combine leads and tours creation into a single timeline
        const recentActivity = [
            ...leads.map(l => ({
                id: `lead-${l.id}`,
                user: 'System', // or derived if we tracked who created it
                action: 'New Lead Created',
                target: l.name,
                time: l.created_at,
                avatar: ''
            })),
            ...tours.map(t => ({
                id: `tour-${t.id}`,
                user: 'System',
                action: 'New Tour Added',
                target: t.title,
                time: new Date().toISOString(), // Tours don't have created_at in interface yet, fallback
                avatar: ''
            }))
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
            .slice(0, 5)
            .map(activity => ({
                ...activity,
                time: format(parseISO(activity.time), 'MMM d, h:mm a')
            }));

        return { kpis, leadsTrendData, revenueData, recentActivity };
    }, [leads, tours]);

    return (
        <div className="flex flex-col min-h-full gap-4">
            <div className="flex-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Dashboard</h2>
                    <p className="text-slate-500 font-medium mt-1">Overview of your agency's performance.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        className="bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 shadow-[0_4px_15px_rgba(225,29,72,0.3)] border-none"
                        onClick={() => setIsLeadModalOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4" /> New Lead
                    </Button>
                    <Button
                        variant="outline"
                        className="border-slate-200 hover:bg-slate-50 shadow-sm"
                        onClick={() => navigate('/tours/new')}
                    >
                        <Plus className="mr-2 h-4 w-4 text-emerald-600" /> New Tour
                    </Button>
                    <Button
                        variant="outline"
                        className="border-slate-200 hover:bg-slate-50 shadow-sm"
                    >
                        <Send className="mr-2 h-4 w-4 text-blue-600" /> Broadcast
                    </Button>
                </div>
            </div>

            <div className="flex-none">
                <KPICards kpis={dashboardData.kpis} />
            </div>

            <div className="flex-initial grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <LeadsTrendChart data={dashboardData.leadsTrendData} />
                <RevenueChart data={dashboardData.revenueData} />
            </div>

            <div className="flex-1 min-h-[150px]">
                <RecentActivity activities={dashboardData.recentActivity} />
            </div>

            <Dialog open={isLeadModalOpen} onOpenChange={setIsLeadModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Lead</DialogTitle>
                        <DialogDescription>
                            Add a new lead to your pipeline manually.
                        </DialogDescription>
                    </DialogHeader>
                    <LeadForm
                        onSubmit={handleSaveLead}
                        onCancel={() => setIsLeadModalOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
