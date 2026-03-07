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

export function Leads() {
    const { leads, fetchLeads, addLead, updateLead, deleteLead } = useAppStore();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | undefined>(undefined);
    const { t } = useI18n();

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    // Calculate KPIs
    const kpis = useMemo(() => {
        const totalLeads = leads.length;
        const convertedLeads = leads.filter(l => l.status === 'converted').length;
        const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0.0';
        const totalRevenue = leads
            .filter(l => l.status === 'converted')
            .reduce((sum, l) => sum + (l.budget || 0), 0);

        return [
            { label: t('totalLeads'), value: totalLeads.toString(), icon: 'Users' },
            { label: t('convertedCol'), value: convertedLeads.toString(), icon: 'UserCheck' },
            { label: t('conversionRate'), value: `${conversionRate}%`, icon: 'TrendingUp' },
            { label: t('revenue'), value: `$${totalRevenue.toLocaleString()}`, icon: 'DollarSign' },
        ];
    }, [leads, t]);

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
        link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
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
                const lines = content.split('\n');
                if (lines.length < 2) throw new Error('File is empty or invalid');

                const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
                const records = lines.slice(1).filter(line => line.trim());

                let importedCount = 0;
                for (const line of records) {
                    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                    const leadData: any = {};

                    headers.forEach((header, index) => {
                        if (values[index] !== undefined) {
                            if (header === 'budget') {
                                leadData[header] = parseFloat(values[index]) || 0;
                            } else {
                                leadData[header] = values[index];
                            }
                        }
                    });

                    // Ensure required fields or set defaults
                    if (!leadData.name || !leadData.email) continue;

                    await addLead({
                        id: uuidv4(),
                        created_at: new Date().toISOString(),
                        name: leadData.name,
                        email: leadData.email,
                        phone: leadData.phone || '',
                        status: (leadData.status as any) || 'new',
                        source: leadData.source || 'CSV Import',
                        budget: leadData.budget || 0,
                        tour_interest: leadData.tour_interest || '',
                        notes: leadData.notes || ''
                    });
                    importedCount++;
                }

                toast.success(`Successfully imported ${importedCount} leads`);
            } catch (error) {
                console.error('Import error:', error);
                toast.error('Failed to parse CSV file. Please ensure it has the correct headers.');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleAddLead = () => {
        setSelectedLead(undefined);
        setIsDialogOpen(true);
    };

    const handleEditLead = (lead: Lead) => {
        setSelectedLead(lead);
        setIsDialogOpen(true);
    };

    const handleSaveLead = (data: any) => {
        if (selectedLead) {
            updateLead(selectedLead.id, data);
        } else {
            addLead({
                id: uuidv4(),
                created_at: new Date().toISOString(),
                ...data
            });
        }
        setIsDialogOpen(false);
    };

    const handleDeleteLead = (id: string) => {
        if (window.confirm('Are you sure you want to delete this lead?')) {
            deleteLead(id);
        }
    };

    return (
        <div className="min-h-[calc(100vh-6rem)] flex flex-col gap-6 animate-in fade-in duration-500 pb-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">{t('leads')}</h2>
                    <p className="text-slate-500 mt-1">{t('manageLeadsDesc')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button className="bg-[#33A894] hover:bg-[#2c9180] text-white shadow-md shadow-[#33A894]/20 transition-all hover:scale-105" onClick={handleAddLead}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t('addLead')}
                    </Button>
                    <div className="flex items-center bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".csv,.json"
                            onChange={handleFileChange}
                        />
                        <Button variant="ghost" size="sm" className="h-8 text-slate-600 hover:text-indigo-600" onClick={handleImportClick}>
                            <Upload className="w-4 h-4 mr-2" />
                            {t('import')}
                        </Button>
                        <div className="w-px h-4 bg-slate-200 mx-1" />
                        <Button variant="ghost" size="sm" className="h-8 text-slate-600 hover:text-indigo-600" onClick={handleExport}>
                            <Download className="w-4 h-4 mr-2" />
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
                        onEdit={handleEditLead}
                        onDelete={handleDeleteLead}
                    />
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedLead ? t('editLeadTitle') : t('addNewLeadTitle')}</DialogTitle>
                        <DialogDescription>
                            {selectedLead ? t('editLeadDesc') : t('addNewLeadDesc')}
                        </DialogDescription>
                    </DialogHeader>
                    <LeadForm
                        initialData={selectedLead}
                        onSubmit={handleSaveLead}
                        onCancel={() => setIsDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
