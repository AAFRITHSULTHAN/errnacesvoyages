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
        <Card className="h-full border-none bg-white/70 backdrop-blur-sm shadow-sm hover:shadow-xl transition-all duration-500 rounded-3xl overflow-hidden flex flex-col ring-1 ring-slate-200/50">
            <CardHeader className="flex flex-row items-center justify-between py-6 px-8 flex-none border-b border-slate-100/50 bg-slate-50/30">
                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-widest">Recent Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent className="px-8 py-6 flex-1 min-h-0">
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-6">
                        {activities.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <p className="text-xs text-slate-400 font-black uppercase tracking-widest italic">No recent activity yet.</p>
                            </div>
                        ) : (
                            activities.map((activity) => (
                                <div key={activity.id} className="flex items-start group relative">
                                    <div className="absolute left-5 top-10 bottom-0 w-px bg-slate-100 group-last:hidden" />
                                    <Avatar className="h-10 w-10 border-2 border-white shadow-md ring-1 ring-slate-100 transition-transform group-hover:scale-110 duration-300 z-10 shrink-0">
                                        <AvatarImage src={activity.avatar} alt={activity.user} />
                                        <AvatarFallback className="bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700 font-bold text-xs uppercase">{activity.user[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="ml-5 flex-1 pt-0.5">
                                        <div className="flex flex-col">
                                            <div className="flex items-center justify-between gap-4">
                                                <p className="text-sm font-black text-slate-900 leading-none transition-colors group-hover:text-indigo-600">
                                                    {activity.user} <span className="font-bold text-slate-400 uppercase text-[10px] tracking-widest ml-1">{activity.action}</span>
                                                </p>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shadow-sm">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Live</span>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-tighter truncate max-w-[200px]">
                                                    {activity.target}
                                                </p>
                                                <span className="text-slate-300 text-[10px]">•</span>
                                                <p className="text-[11px] font-bold text-slate-400 italic">
                                                    {activity.time}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <ScrollBar
                        className="bg-slate-100/50 rounded-full w-1.5"
                    />
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
