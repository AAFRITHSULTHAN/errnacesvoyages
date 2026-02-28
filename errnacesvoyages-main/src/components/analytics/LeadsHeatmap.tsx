import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAppStore } from '@/store';
import { format, subMonths, eachDayOfInterval, startOfDay, startOfWeek, endOfWeek } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LeadsHeatmap() {
    const { leads } = useAppStore();

    const heatmapData = useMemo(() => {
        const today = startOfDay(new Date());
        const sixMonthsAgo = subMonths(today, 6);
        const startDate = startOfWeek(sixMonthsAgo, { weekStartsOn: 1 });
        const endDate = endOfWeek(today, { weekStartsOn: 1 });

        const days = eachDayOfInterval({ start: startDate, end: endDate });

        const leadsByDay = leads.reduce((acc, lead) => {
            const dateStr = format(startOfDay(new Date(lead.created_at)), 'yyyy-MM-dd');
            acc[dateStr] = (acc[dateStr] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Structure into columns (weeks)
        const weeks: any[] = [];
        let currentWeek: any[] = [];

        days.forEach((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const count = leadsByDay[dateStr] || 0;

            currentWeek.push({
                date: day,
                count,
                intensity: Math.min(count, 4)
            });

            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        });

        if (currentWeek.length > 0) {
            weeks.push(currentWeek);
        }

        return weeks;
    }, [leads]);

    const getColor = (intensity: number) => {
        switch (intensity) {
            case 0: return 'bg-slate-50 border-slate-100/50';
            case 1: return 'bg-emerald-100/40 border-emerald-200/30';
            case 2: return 'bg-emerald-300/60 border-emerald-400/40';
            case 3: return 'bg-emerald-500/80 border-emerald-600/50';
            case 4: return 'bg-emerald-700 border-emerald-800/60';
            default: return 'bg-slate-50 border-slate-100/50';
        }
    };

    return (
        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-md overflow-hidden group flex flex-col rounded-xl transition-all duration-300">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-black text-slate-900 transition-colors tracking-tight">Leads Matrix</CardTitle>
                        <CardDescription className="text-xs font-medium italic">Peak activity & engagement heat map (6M)</CardDescription>
                    </div>
                    <div className="bg-emerald-50/50 p-1.5 rounded-lg">
                        <CalendarIcon size={14} className="text-emerald-600" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
                <div className="flex flex-col space-y-2">
                    <div className="overflow-x-auto pb-2 custom-scrollbar">
                        <div className="flex gap-2 min-w-full items-start">
                            {/* Day labels */}
                            <div className="flex flex-col gap-1 pr-1 text-[9px] font-black text-slate-400 justify-between py-1 min-w-[35px] uppercase tracking-tighter mt-1">
                                <span>Mon</span>
                                <span className="opacity-0">Tue</span>
                                <span>Wed</span>
                                <span className="opacity-0">Thu</span>
                                <span>Fri</span>
                                <span className="opacity-0">Sat</span>
                                <span>Sun</span>
                            </div>

                            {/* Heatmap grid */}
                            <div className="flex-1 flex gap-0.5 pt-1">
                                <TooltipProvider delayDuration={0}>
                                    {heatmapData.map((week, weekIdx) => (
                                        <div key={weekIdx} className="flex-1 flex flex-col gap-0.5">
                                            {week.map((day: any, dayIdx: number) => (
                                                <Tooltip key={dayIdx}>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            className={cn(
                                                                "w-full aspect-square rounded-[3px] border transition-all duration-300 hover:scale-150 hover:z-20 hover:shadow-2xl cursor-pointer",
                                                                getColor(day.intensity)
                                                            )}
                                                        />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="bg-slate-900/95 backdrop-blur-md text-white border-none p-3 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                                                        <div className="text-[10px] space-y-1">
                                                            <p className="font-black uppercase tracking-widest text-emerald-400">{format(day.date, 'eeee, MMM d')}</p>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-lg font-black leading-none">{day.count}</span>
                                                                <span className="opacity-60 font-bold uppercase tracking-tighter text-[9px]">leads generated</span>
                                                            </div>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ))}
                                        </div>
                                    ))}
                                </TooltipProvider>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100/50">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-slate-500 uppercase tracking-widest leading-none">Matrix Intensity</span>
                            </div>
                            <div className="flex gap-1.5 items-center">
                                <span className="opacity-40 italic tracking-tighter">Low</span>
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <div key={i} className={cn("w-2.5 h-2.5 rounded-[2px] border", getColor(i))} />
                                ))}
                                <span className="opacity-40 italic tracking-tighter">High</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-emerald-50/30 p-2 rounded-lg border border-emerald-100/20">
                                <p className="text-[7px] font-black text-emerald-700/60 uppercase tracking-widest leading-none mb-0.5">Peak Activity</p>
                                <p className="text-[10px] font-black text-emerald-900 tracking-tight leading-none">Friday</p>
                            </div>
                            <div className="bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                                <p className="text-[7px] font-black text-slate-500/60 uppercase tracking-widest leading-none mb-0.5">Momentum</p>
                                <p className="text-[10px] font-black text-slate-800 tracking-tight leading-none">+14% <span className="text-[8px] text-emerald-500 font-black">↑</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
