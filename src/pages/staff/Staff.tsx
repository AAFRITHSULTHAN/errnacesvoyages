import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Mail, MoreHorizontal, Phone, TrendingUp, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
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

    // Calculate staff sales data — includes ALL assigned leads, not just converted
    const staffSalesData = useMemo(() => {
        return staff.map(member => {
            const allAssigned = leads.filter(l => l.assigned_staff_id === member.id);
            const convertedLeads = allAssigned.filter(l => l.status === 'converted');
            const salesRevenue = convertedLeads.reduce((sum, l) => sum + (l.budget || 0), 0);
            return {
                name: member.full_name.split(' ')[0],
                fullName: member.full_name,
                totalLeads: allAssigned.length,
                convertedLeads: convertedLeads.length,
                salesRevenue,
            };
        }).sort((a, b) => b.totalLeads - a.totalLeads);
    }, [staff, leads]);

    const COLORS = ['#33A894', '#2c9180', '#257d6e', '#1f695c', '#18564a'];

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

            <Card className="border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                    <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-[#33A894]" />
                        {t('staffSalesPerf')}
                    </CardTitle>
                    <CardDescription>{t('revenueDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={staffSalesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(v) => `$${v}`} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(51, 168, 148, 0.05)' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                                    formatter={(value: any, name: any) => [
                                        name === 'salesRevenue' ? `$${(value || 0).toLocaleString()}` : value,
                                        name === 'salesRevenue' ? 'Revenue (Converted)' : name === 'totalLeads' ? 'Total Assigned' : 'Converted'
                                    ]}
                                    labelStyle={{ color: '#0f172a', fontWeight: 'bold', marginBottom: '4px' }}
                                />
                                <Legend formatter={(value) =>
                                    value === 'totalLeads' ? 'Total Assigned Leads' :
                                        value === 'convertedLeads' ? 'Converted' : 'Revenue'
                                } />
                                <Bar yAxisId="left" dataKey="totalLeads" radius={[6, 6, 0, 0]} barSize={28} fill="#94a3b8" />
                                <Bar yAxisId="left" dataKey="convertedLeads" radius={[6, 6, 0, 0]} barSize={28}>
                                    {staffSalesData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] || '#33A894'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{t('teamMembers')}</CardTitle>
                            <CardDescription>{t('teamDesc')}</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                            <Input
                                placeholder={t('search')}
                                className="pl-9"
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
