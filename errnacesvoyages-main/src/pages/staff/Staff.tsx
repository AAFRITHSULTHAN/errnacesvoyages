import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Mail, MoreHorizontal, Phone } from 'lucide-react';
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


export function Staff() {
    const { staff, addStaff, updateStaff, deleteStaff, fetchStaff } = useAppStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<User | undefined>(undefined);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

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
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Staff Management</h2>
                    <p className="text-slate-500 mt-1">Manage team members, roles, and permissions.</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAddStaff}>
                    <Plus className="mr-2 h-4 w-4" /> Add Member
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Team Members</CardTitle>
                            <CardDescription>A list of all staff members having access to the dashboard.</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                            <Input
                                placeholder="Search..."
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
                                <TableHead className="w-[80px]">Avatar</TableHead>
                                <TableHead className="font-semibold text-slate-700">Team Member</TableHead>
                                <TableHead className="font-semibold text-slate-700">Role & Dept</TableHead>
                                <TableHead className="font-semibold text-slate-700">Contact Details</TableHead>
                                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                                <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStaff.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No staff members found.
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
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleViewProfile(member)}>View Profile</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleEditStaff(member)}>Edit Details</DropdownMenuItem>
                                                    <DropdownMenuItem>Change Role</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteStaff(member.id)}>Deactivate Account</DropdownMenuItem>
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
                        <DialogTitle>{selectedStaff ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
                        <DialogDescription>
                            {selectedStaff ? 'Update the details of the staff member.' : 'Add a new member to your team.'}
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
