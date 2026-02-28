
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KPICards } from '@/components/dashboard/KPICards';

const WHATSAPP_KPIS = [
    { label: 'Sent', value: '0', icon: 'MessageCircle' },
    { label: 'Received', value: '0', icon: 'MessageCircle' },
    { label: 'Delivery Rate', value: '0%', icon: 'TrendingUp' },
    { label: 'Avg Response', value: '2.5m', icon: 'Calendar' },
];

export function WhatsAppAnalyticsTab() {
    return (
        <div className="space-y-6">
            <KPICards kpis={WHATSAPP_KPIS} />

            <Card>
                <CardHeader>
                    <CardTitle>Chat Activity</CardTitle>
                    <CardDescription>Message volume over time.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px] w-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
                        <p className="text-slate-500 text-sm">Activity timeline will populate as messages are sent and received</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
