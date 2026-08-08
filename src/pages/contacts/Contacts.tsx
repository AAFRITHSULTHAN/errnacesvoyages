import { useState, useRef, useMemo, useEffect } from 'react';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Plus, Download, Upload } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { LeadsTable } from '@/components/leads/LeadsTable';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { LeadForm } from '@/components/leads/LeadForm';
import { v4 as uuidv4 } from 'uuid';
import type { Lead } from '@/types';
import { KPICards } from '@/components/dashboard/KPICards';
import { useI18n } from '@/i18n';
import { WhatsAppModal } from '@/components/leads/WhatsAppModal';

import { getLeadRevenue } from '@/lib/utils';
import { parseCSVContent } from '@/lib/csvParser';

export function Contacts() {
    const { fetchLeads, addLead, updateLead, deleteLead, tours, leads: rawLeads } = useAppStore();
    const leads = useMemo(() => rawLeads.filter(l => {
        let isContactOnly = false;
        try {
            if (l.notes) {
                const parsed = JSON.parse(l.notes);
                isContactOnly = parsed && parsed.is_contact === true;
            }
        } catch (_) {}

        return (
            isContactOnly || 
            l.source === 'Staff' || 
            l.source === 'WhatsApp' || 
            l.source === 'WhatsApp Sync' || 
            l.source === 'WhatsApp Web' || 
            l.source === 'WhatsApp Group'
        );
    }), [rawLeads]);
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | undefined>(undefined);
    const [whatsappLead, setWhatsappLead] = useState<Lead | null>(null);
    const { t } = useI18n();

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    // KPI calculation
    const kpis = useMemo(() => {
        const totalContacts = leads.length;
        const totalValue = leads.reduce((sum, l) => sum + getLeadRevenue(l, tours), 0);
        const avgBudget = totalContacts > 0 ? Math.round(totalValue / totalContacts) : 0;

        return [
            { label: t('totalContacts'), value: totalContacts.toString(), icon: 'Users' },
            { label: t('totalValue'), value: `€${totalValue.toLocaleString()}`, icon: 'Euro' },
            { label: t('avgBudget'), value: `€${avgBudget.toLocaleString()}`, icon: 'TrendingUp' },
        ];
    }, [leads, tours, t]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        const headers = ['id', 'name', 'email', 'phone', 'status', 'source', 'budget', 'tour_interest'];
        const csvContent = [
            headers.join(','),
            ...leads.map(lead => [
                lead.id,
                `"${lead.name}"`,
                lead.email,
                lead.phone,
                lead.status,
                lead.source,
                lead.budget || '',
                `"${lead.tour_interest || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `contacts_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target?.result as string;
            try {
                const parsedEntries = parseCSVContent(content);
                if (parsedEntries.length === 0) {
                    toast.error('No valid contact entries found in CSV');
                    return;
                }

                let importedCount = 0;
                for (const item of parsedEntries) {
                    const contactName = item.name || item.phone || item.email || 'Unnamed Contact';

                    await addLead({
                        id: uuidv4(),
                        created_at: new Date().toISOString(),
                        name: contactName,
                        email: item.email || '',
                        phone: item.phone || '',
                        status: (item.status as any) || 'converted',
                        source: item.source || 'CSV Import',
                        budget: item.budget || 0,
                        tour_interest: item.tour_interest || '',
                        notes: JSON.stringify({
                            notes: item.notes || '',
                            passport_details: '',
                            dob: '',
                            tour_departure: '',
                            tour_arrival: '',
                            is_contact: true
                        })
                    });
                    importedCount++;
                }

                toast.success(`Successfully imported ${importedCount} contacts`);
            } catch (error) {
                console.error('Import error:', error);
                toast.error('Failed to parse CSV file. Please ensure it has valid data.');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleAddContact = () => {
        // Pre-populate status as qualified for new contacts added here
        setSelectedLead({
            status: 'converted',
            name: '',
            email: '',
            phone: '',
            source: 'Website',
            tour_interest: '',
            notes: '',
        } as any);
        setIsDialogOpen(true);
    };

    const handleEditContact = (lead: Lead) => {
        setSelectedLead(lead);
        setIsDialogOpen(true);
    };

    const handleSaveContact = (data: any) => {
        let notesObj = { notes: '', passport_details: '', dob: '', tour_departure: '', tour_arrival: '', is_contact: true };
        try {
            if (data.notes) {
                notesObj = { ...notesObj, ...JSON.parse(data.notes) };
            }
        } catch (_) {
            notesObj.notes = data.notes || '';
        }
        notesObj.is_contact = true;
        const updatedData = {
            ...data,
            notes: JSON.stringify(notesObj)
        };

        // If it was editing a contact or adding a new one
        if (selectedLead && selectedLead.id) {
            updateLead(selectedLead.id, updatedData);
        } else {
            addLead({
                id: uuidv4(),
                created_at: new Date().toISOString(),
                ...updatedData
            });
        }
        setIsDialogOpen(false);
    };

    const handleDeleteContact = (id: string) => {
        if (window.confirm('Are you sure you want to delete this contact?')) {
            deleteLead(id);
        }
    };

    return (
        <div className="min-h-[calc(100vh-6rem)] flex flex-col gap-6 animate-in fade-in duration-500 pb-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-sm shadow-indigo-900/5">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">{t('contacts')}</h2>
                    <p className="text-slate-500 font-medium">{t('contactsDesc')}</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button
                        className="bg-[#33A894] hover:bg-[#2c9180] text-white h-11 px-6 rounded-xl shadow-md shadow-[#33A894]/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 font-bold"
                        onClick={handleAddContact}
                    >
                        <Plus className="h-4 w-4" /> {t('addNewContactTitle')}
                    </Button>
                    <div className="flex items-center bg-white/80 backdrop-blur-sm rounded-xl p-1 border border-slate-200/60 shadow-sm">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".csv,.json"
                            onChange={handleFileChange}
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-4 text-slate-600 hover:text-indigo-600 font-bold rounded-lg transition-colors"
                            onClick={handleImportClick}
                        >
                            <Upload className="w-4 h-4 mr-2 opacity-70" />
                            {t('import')}
                        </Button>
                        <div className="w-px h-4 bg-slate-200/60 mx-1" />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-4 text-slate-600 hover:text-indigo-600 font-bold rounded-lg transition-colors"
                            onClick={handleExport}
                        >
                            <Download className="w-4 h-4 mr-2 opacity-70" />
                            {t('export')}
                        </Button>
                    </div>
                </div>
            </div>

            <KPICards kpis={kpis} />

            <div className="flex-1 mt-0">
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                    <LeadsTable
                        leads={leads}
                        onEdit={handleEditContact}
                        onDelete={handleDeleteContact}
                        onWhatsApp={(lead) => setWhatsappLead(lead)}
                    />
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedLead && selectedLead.id ? t('editContactTitle') : t('addNewContactTitle')}</DialogTitle>
                        <DialogDescription>
                            {selectedLead && selectedLead.id ? t('editContactDesc') : t('addNewContactDesc')}
                        </DialogDescription>
                    </DialogHeader>
                    <LeadForm
                        initialData={selectedLead}
                        onSubmit={handleSaveContact}
                        onCancel={() => setIsDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            <WhatsAppModal
                lead={whatsappLead}
                isOpen={!!whatsappLead}
                onClose={() => setWhatsappLead(null)}
            />
        </div>
    );
}
