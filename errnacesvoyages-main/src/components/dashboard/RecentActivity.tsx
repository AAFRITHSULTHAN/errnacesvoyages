import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface Activity {
    id: string | number;
    user: string;
    action: string;
    target: string;
    time: string;
    avatar?: string;
}

interface RecentActivityProps {
    activities: Activity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
    return (
        <Card className="h-full border border-white/20 bg-white/40 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between py-5 px-6 flex-none">
                <CardTitle className="text-sm font-semibold text-slate-700">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 flex-1 min-h-0">
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-6">
                        {activities.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-6 font-medium">No recent activity yet.</p>
                        ) : (
                            activities.map((activity) => (
                                <div key={activity.id} className="flex items-center group">
                                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-slate-100">
                                        <AvatarImage src={activity.avatar} alt={activity.user} />
                                        <AvatarFallback className="bg-slate-50 text-slate-600 font-bold text-xs">{activity.user[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="ml-4 flex-1">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-bold text-slate-900 leading-none group-hover:text-blue-600 transition-colors">
                                                    {activity.user} <span className="font-medium text-slate-500">{activity.action}</span>
                                                </p>
                                                <p className="text-[11px] font-medium text-slate-400">
                                                    {activity.target} • {activity.time}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                                <span className="text-[11px] font-bold text-slate-600 w-16 text-right">9:07 PM</span>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <ScrollBar
                        className="bg-slate-100/50 rounded-full w-2"
                        thumbClassName="bg-slate-400 hover:bg-slate-500 transition-colors"
                    />
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
