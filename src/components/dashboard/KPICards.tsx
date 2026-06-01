import { Card, CardContent } from '@/components/ui/card';
import type { KPI } from '@/types';
import { Users, Map, DollarSign, TrendingUp, UserCheck, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { Link } from 'react-router-dom';

const ICON_MAP: Record<string, { icon: any; color: string; bgColor: string; shadowColor: string }> = {
    Users: { icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50', shadowColor: 'shadow-blue-200' },
    Map: { icon: Map, color: 'text-emerald-600', bgColor: 'bg-emerald-50', shadowColor: 'shadow-emerald-200' },
    DollarSign: { icon: DollarSign, color: 'text-amber-600', bgColor: 'bg-amber-50', shadowColor: 'shadow-amber-200' },
    TrendingUp: { icon: TrendingUp, color: 'text-indigo-600', bgColor: 'bg-indigo-50', shadowColor: 'shadow-indigo-200' },
    UserCheck: { icon: UserCheck, color: 'text-rose-600', bgColor: 'bg-rose-50', shadowColor: 'shadow-rose-200' },
    Calendar: { icon: Calendar, color: 'text-orange-600', bgColor: 'bg-orange-50', shadowColor: 'shadow-orange-200' }
};

interface KPICardsProps {
    kpis: KPI[];
}

export function KPICards({ kpis }: KPICardsProps) {
    return (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => {
                const iconConfig = kpi.icon ? (ICON_MAP[kpi.icon] || ICON_MAP.Users) : ICON_MAP.Users;
                const Icon = iconConfig.icon;
                const isPositive = (kpi.change || 0) >= 0;

                const CardElement = (
                    <Card className={cn(
                        "relative overflow-hidden border-none bg-white shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group rounded-xl h-full",
                        kpi.link && "cursor-pointer hover:bg-slate-50/50"
                    )}>
                        <div className="flex flex-row items-center justify-between space-y-0 pb-0.5 pt-2.5 px-3 relative z-10">
                            <div className={cn(
                                "p-1.5 rounded-lg transition-all duration-300 group-hover:rotate-6",
                                iconConfig.bgColor
                            )}>
                                <Icon className={cn("h-3.5 w-3.5", iconConfig.color)} />
                            </div>

                            {typeof kpi.change === 'number' && (
                                <div className={cn(
                                    "flex items-center gap-1 px-1.5 py-0 rounded-lg text-[8px] font-black tracking-tighter border border-white/50",
                                    isPositive ? 'bg-emerald-50/50 text-emerald-600' : 'bg-rose-50/50 text-rose-600'
                                )}>
                                    <span>{isPositive ? '▲' : '▼'}</span>
                                    {Math.abs(kpi.change)}%
                                </div>
                            )}
                        </div>

                        <CardContent className="relative z-10 px-3 pb-2.5 pt-0.5">
                            <div className="flex flex-col">
                                <div className="text-lg font-black text-slate-900 tracking-tighter leading-none">
                                    <AnimatedCounter value={String(kpi.value)} />
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                                    {kpi.label}
                                </p>
                            </div>
                        </CardContent>

                        {/* Status bar */}
                        <div className={cn(
                            "absolute bottom-0 left-0 h-1 transition-all duration-300 w-0 group-hover:w-full",
                            isPositive ? 'bg-emerald-400' : 'bg-rose-400'
                        )} />
                    </Card>
                );

                if (kpi.link) {
                    return (
                        <Link key={kpi.label} to={kpi.link} className="block no-underline h-full">
                            {CardElement}
                        </Link>
                    );
                }

                return (
                    <div key={kpi.label} className="h-full">
                        {CardElement}
                    </div>
                );
            })}
        </div>
    );
}
