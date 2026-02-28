import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import type { Lead } from "@/types";
import { format } from "date-fns";

interface LeadsTableProps {
    leads: Lead[];
    onEdit: (lead: Lead) => void;
    onDelete: (id: string) => void;
}

export function LeadsTable({ leads, onEdit, onDelete }: LeadsTableProps) {
    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'new': return 'bg-red-50 text-red-700 border-red-100';
            case 'contacted': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
            case 'qualified': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'proposal_sent': return 'bg-purple-50 text-purple-700 border-purple-100';
            case 'converted': return 'bg-teal-50 text-teal-700 border-teal-100';
            case 'lost': return 'bg-slate-50 text-slate-600 border-slate-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    const formatStatus = (status: string) => {
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 h-12 bg-slate-50/50 pl-6">Name</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 h-12 bg-slate-50/50">Email</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 h-12 bg-slate-50/50">Phone</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 h-12 bg-slate-50/50">Status</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 h-12 bg-slate-50/50">Source</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 h-12 bg-slate-50/50">Tour</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 h-12 bg-slate-50/50">Created</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-slate-500 h-12 text-right bg-slate-50/50 pr-6">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {leads.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                                No leads found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        leads.map((lead) => (
                            <TableRow key={lead.id} className="hover:bg-red-50/30 border-slate-50 transition-colors cursor-pointer group">
                                <TableCell className="font-semibold text-slate-900 py-4 pl-6">{lead.name}</TableCell>
                                <TableCell className="text-slate-500">{lead.email}</TableCell>
                                <TableCell className="text-slate-500">{lead.phone}</TableCell>
                                <TableCell>
                                    <Badge className={`${getStatusStyles(lead.status)} border shadow-none font-medium px-2.5 py-0.5 rounded-full`}>
                                        {formatStatus(lead.status)}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-slate-500">{lead.source}</TableCell>
                                <TableCell className="text-slate-500">{lead.tour_interest || '-'}</TableCell>
                                <TableCell className="text-slate-500">
                                    {lead.created_at ? format(new Date(lead.created_at), 'MMM d, yyyy') : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => { e.stopPropagation(); onDelete(lead.id); }}
                                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
