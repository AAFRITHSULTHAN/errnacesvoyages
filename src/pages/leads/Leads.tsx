
import { useState, useRef, useMemo, useEffect } from 'react';
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    type DragEndEvent,
    type DragStartEvent,
    type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useAppStore } from '@/store';
import { KanbanColumn } from '@/components/leads/KanbanColumn';
import { LeadCard } from '@/components/leads/LeadCard';
import { Button } from '@/components/ui/button';
import { Plus, Download, Upload, LayoutGrid, Table as TableIcon } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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


const COLUMNS = [
    { id: 'new', title: 'New Leads' },
    { id: 'contacted', title: 'Contacted' },
    { id: 'qualified', title: 'Qualified' },
    { id: 'proposal_sent', title: 'Proposal Sent' },
    { id: 'converted', title: 'Converted' },
    { id: 'lost', title: 'Lost' },
];

export function Leads() {
    const { leads, fetchLeads, addLead, updateLead, deleteLead } = useAppStore();
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | undefined>(undefined);

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
            { label: 'Total Leads', value: totalLeads.toString(), icon: 'Users' },
            { label: 'Converted', value: convertedLeads.toString(), icon: 'UserCheck' },
            { label: 'Conversion Rate', value: `${conversionRate}%`, icon: 'TrendingUp' },
            { label: 'Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: 'DollarSign' },
        ];
    }, [leads]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const getLeadsByStatus = (status: string) => {
        const filtered = leads.filter((lead) => (lead.status || '').toLowerCase().trim() === status.toLowerCase().trim());
        if (status === 'converted' && leads.length > 0) {
            console.log(`DEEP DEBUG: For 'converted' column, found ${filtered.length} matches. Sample lead status: '${leads[0].status}'`);
        }
        return filtered;
    };

    const findContainer = (id: string) => {
        if (COLUMNS.find(c => c.id === id)) {
            return id;
        }
        const lead = leads.find(l => l.id === id);
        return lead ? lead.status : null;
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        const overId = over?.id;

        if (!overId || active.id === overId) return;
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const activeId = active.id as string;
        const overId = over?.id as string;

        if (!overId) {
            setActiveId(null);
            return;
        }

        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);

        if (activeContainer && overContainer && activeContainer !== overContainer) {
            updateLead(activeId, { status: overContainer as any });
        }

        setActiveId(null);
    };

    const dropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    const activeLead = activeId ? leads.find(l => l.id === activeId) : null;
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
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Leads</h2>
                    <p className="text-slate-500 mt-1">Manage your sales pipeline</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button className="bg-[#33A894] hover:bg-[#2c9180] text-white shadow-md shadow-[#33A894]/20 transition-all hover:scale-105" onClick={handleAddLead}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Lead
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
                            Import
                        </Button>
                        <div className="w-px h-4 bg-slate-200 mx-1" />
                        <Button variant="ghost" size="sm" className="h-8 text-slate-600 hover:text-indigo-600" onClick={handleExport}>
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>
            </div>

            <KPICards kpis={kpis} />

            <Tabs defaultValue="pipeline" className="flex-1 flex flex-col space-y-6">
                <div className="flex items-center justify-between">
                    <TabsList className="bg-white border border-slate-200 p-1 h-auto shadow-sm rounded-lg">
                        <TabsTrigger value="pipeline" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none rounded-md px-4 py-2 transition-all">
                            <LayoutGrid className="w-4 h-4 mr-2" />
                            Pipeline
                        </TabsTrigger>
                        <TabsTrigger value="table" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none rounded-md px-4 py-2 transition-all">
                            <TableIcon className="w-4 h-4 mr-2" />
                            Table List
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="pipeline" className="flex-1 mt-0 data-[state=inactive]:hidden">
                    <div className="relative">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCorners}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="flex-1 overflow-hidden pb-6">
                                <div className="flex gap-3 pb-2 px-1 w-full h-full">
                                    {COLUMNS.map((col) => (
                                        <div key={col.id} className="flex-1 min-w-[160px] h-full">
                                            <KanbanColumn
                                                id={col.id}
                                                title={col.title}
                                                leads={getLeadsByStatus(col.id)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <DragOverlay dropAnimation={dropAnimation}>
                                {activeLead ? <LeadCard lead={activeLead} /> : null}
                            </DragOverlay>
                        </DndContext>
                    </div>
                </TabsContent>

                <TabsContent value="table" className="mt-0 data-[state=inactive]:hidden">
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                        <LeadsTable
                            leads={leads}
                            onEdit={handleEditLead}
                            onDelete={handleDeleteLead}
                        />
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedLead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
                        <DialogDescription>
                            {selectedLead ? 'Update the details of the lead.' : 'Add a new lead to your pipeline.'}
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
