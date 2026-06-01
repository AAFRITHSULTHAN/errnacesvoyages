import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Users,
    Map,
    MessageSquare,
    BarChart3,
    LayoutGrid,
    LogOut,
    Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/components/AuthProvider';

import { useI18n } from '@/i18n';

export function Sidebar() {
    const { t } = useI18n();
    const { pathname } = useLocation();
    const { user, signOut } = useAuth();

    const NAV_ITEMS = [
        { label: t('dashboard'), icon: LayoutDashboard, href: '/' },
        { label: t('leads'), icon: Users, href: '/leads' },
        { label: t('pipeline'), icon: LayoutGrid, href: '/pipeline' },
        { label: t('tourPackages'), icon: Map, href: '/tours' },
        { label: t('whatsapp'), icon: MessageSquare, href: '/whatsapp' },
        { label: t('analytics'), icon: BarChart3, href: '/analytics' },
        ...(user?.role === 'admin' ? [{ label: t('staff'), icon: Users, href: '/staff' }] : []),
    ];

    const NavContent = () => (
        <div className="flex flex-col h-full bg-white border-r border-slate-200">
            <div className="p-6">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    ERRANCES
                    <span className="text-red-600">.</span>
                </h1>
                <p className="text-xs text-slate-500 font-medium tracking-widest mt-1">VOYAGES CRM</p>
            </div>

            <div className="flex-1 px-4 space-y-2 py-4">
                {NAV_ITEMS.map((item) => (
                    <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                            pathname === item.href
                                ? "bg-[#24B4A0] text-white shadow-sm font-semibold"
                                : "text-[#64748B] hover:text-slate-900 hover:bg-slate-50"
                        )}
                    >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                    </Link>
                ))}
            </div>

            <div className="p-4 border-t border-slate-200 bg-white">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <Avatar className="h-10 w-10 border border-slate-200">
                        <AvatarImage src={user?.avatar_url} />
                        <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-semibold truncate text-slate-900">{user?.full_name}</p>
                        <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-slate-600"
                    onClick={async () => {
                        console.log('Sign Out button clicked');
                        await signOut();
                    }}
                >
                    <LogOut className="h-4 w-4" />
                    {t('signout')}
                </Button>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden md:block w-64 fixed inset-y-0 left-0 z-50">
                <NavContent />
            </aside>

            {/* Mobile Sidebar */}
            <div className="md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-64">
                        <NavContent />
                    </SheetContent>
                </Sheet>
            </div>
        </>
    );
}
