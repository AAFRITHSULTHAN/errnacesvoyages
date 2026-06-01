import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Mail, Phone, Calendar, Hash, MessageSquare } from "lucide-react";
import type { Lead } from "@/types";
import { format, parseISO } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface LeadsTableProps {
    leads: Lead[];
    onEdit: (lead: Lead) => void;
    onDelete: (id: string) => void;
    onWhatsApp: (lead: Lead) => void;
}

export function LeadsTable({ leads, onEdit, onDelete, onWhatsApp }: LeadsTableProps) {
    const navigate = useNavigate();
    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'new': return 'bg-rose-50 text-rose-700 border-rose-100';
            case 'contacted': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'qualified': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'proposal_sent': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
            case 'converted': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'lost': return 'bg-slate-50 text-slate-500 border-slate-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    const formatStatus = (status: string) => {
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className="bg-white/40 backdrop-blur-md rounded-3xl border border-white/60 shadow-xl shadow-indigo-900/5 overflow-hidden">
            <Table className="border-separate border-spacing-y-2 px-4 pb-4">
                <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-none hover:bg-transparent">
                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 pl-8 h-12">Lead Info</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 h-12">Contact</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 h-12">Status</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 h-12">Tour & Budget</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 h-12 text-right pr-8">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {leads.length === 0 ? (
                        <TableRow className="border-none hover:bg-transparent">
                            <TableCell colSpan={5} className="h-40 text-center">
                                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest italic">No leads found.</p>
                            </TableCell>
                        </TableRow>
                    ) : (
                        leads.map((lead) => (
                            <TableRow
                                key={lead.id}
                                className="group bg-white hover:bg-indigo-50/30 transition-all duration-200 border border-slate-100 rounded-2xl overflow-hidden shadow-sm shadow-slate-200/50 mb-2 cursor-pointer"
                                onClick={(e) => {
                                    const target = e.target as HTMLElement;
                                    if (target.closest('.actions-container') || target.closest('button')) {
                                        return;
                                    }
                                    navigate(`/leads/${lead.id}`);
                                }}
                            >
                                <TableCell className="pl-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-11 w-11 border-2 border-white shadow-sm transition-transform group-hover:scale-110 duration-300 ring-1 ring-slate-100">
                                            <AvatarImage src="" />
                                            <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 font-black text-sm uppercase">
                                                {lead.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors text-base">
                                                {lead.name}
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                                    Source: {lead.source}
                                                </span>
                                                <span className="text-[10px] text-slate-300">•</span>
                                                <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                    <Calendar className="h-2.5 w-2.5 opacity-60" />
                                                    {format(parseISO(lead.created_at || new Date().toISOString()), 'MMM d')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2 text-[12px] font-bold text-slate-600 group-hover:text-indigo-700 transition-colors">
                                            <Mail className="h-3 w-3 opacity-50" />
                                            {lead.email}
                                        </div>
                                        {lead.phone && (
                                            <div className="flex items-center gap-2 text-[12px] font-bold text-slate-500">
                                                <Phone className="h-3 w-3 opacity-50" />
                                                {lead.phone}
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className={cn(
                                        "border shadow-none font-black text-[10px] px-3 py-1 rounded-lg uppercase tracking-widest transition-all",
                                        getStatusStyles(lead.status)
                                    )}>
                                        {formatStatus(lead.status)}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-[13px] font-black text-slate-700 truncate max-w-[150px]">
                                            {lead.tour_interest || 'Custom Tour'}
                                        </span>
                                        {lead.budget ? (
                                            <span className="text-[11px] font-black text-emerald-600 mt-0.5 flex items-center gap-1">
                                                <Hash className="h-2.5 w-2.5 opacity-70" />
                                                ${lead.budget.toLocaleString()}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Not Specified</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-8">
                                    <div className="actions-container flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onWhatsApp(lead); }}
                                            className="h-9 w-9 p-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center justify-center transition-colors"
                                            title="Send WhatsApp"
                                        >
                                            <MessageSquare className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                                            className="h-9 w-9 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center justify-center transition-colors"
                                            title="Edit Lead"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDelete(lead.id); }}
                                            className="h-9 w-9 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center justify-center transition-colors"
                                            title="Delete Lead"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
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
