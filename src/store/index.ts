import { create } from 'zustand';
import type { Lead, TourPackage, User } from '@/types';
import * as api from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/Toast';

interface AppState {
    user: User | null;
    leads: Lead[];
    tours: TourPackage[];
    staff: User[];
    isLoading: boolean;

    setUser: (user: User | null) => void;
    fetchLeads: () => Promise<void>;
    setLeads: (leads: Lead[]) => void;
    addLead: (lead: Lead) => Promise<void>;
    updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
    deleteLead: (id: string) => Promise<void>;

    fetchTours: () => Promise<void>;
    setTours: (tours: TourPackage[]) => void;
    addTour: (tour: TourPackage) => Promise<void>;
    updateTour: (id: string, updates: Partial<TourPackage>) => Promise<void>;
    deleteTour: (id: string) => Promise<void>;

    fetchStaff: () => Promise<void>;
    setStaff: (staff: User[]) => void;
    addStaff: (user: User, password?: string) => Promise<void>;
    updateStaff: (id: string, updates: Partial<User>) => Promise<void>;
    deleteStaff: (id: string) => Promise<void>;
    sendWhatsApp: (leadId: string, to: string, message: string, contentSid?: string, contentVariables?: Record<string, string>) => Promise<void>;
}

// Mock Data removed


export const useAppStore = create<AppState>((set, get) => ({
    user: null,
    leads: [],
    tours: [],
    staff: [],
    isLoading: false,

    setUser: (user) => set({ user }),

    // Leads Actions
    fetchLeads: async () => {
        set({ isLoading: true });
        try {
            const leads = await api.getLeads();
            set({ leads, isLoading: false });
        } catch (error) {
            console.error('Failed to fetch leads:', error);
            set({ isLoading: false });
        }
    },
    setLeads: (leads) => set({ leads }),
    addLead: async (lead) => {
        set({ isLoading: true });
        try {
            // If assigning a staff member, first ensure they have a profile entry
            if (lead.assigned_staff_id) {
                const staffMember = get().staff.find(s => s.id === lead.assigned_staff_id);
                if (staffMember) {
                    try {
                        await supabase.from('profiles').upsert([{
                            id: staffMember.id,
                            full_name: staffMember.full_name,
                            email: staffMember.email,
                            role: staffMember.role,
                        }], { onConflict: 'id' });
                    } catch (_) {
                        // Best-effort sync
                    }
                }
            }

            const newLead = await api.createLead(lead);
            set((state) => ({
                leads: [newLead, ...state.leads],
                isLoading: false
            }));
            toast.success('Lead added successfully');
        } catch (error: any) {
            console.error('Failed to add lead:', error);

            // Handle FK error for assigned_staff_id
            const isFkError = error?.code === '23503' ||
                (error?.message && error.message.includes('foreign key'));

            if (isFkError && lead.assigned_staff_id) {
                const { assigned_staff_id: _removed, ...leadWithoutStaff } = lead;
                try {
                    const newLead = await api.createLead(leadWithoutStaff);
                    set((state) => ({
                        leads: [newLead, ...state.leads],
                        isLoading: false
                    }));
                    toast.success('Lead added (staff assignment skipped — staff not yet synced)');
                    return;
                } catch (innerError) {
                    toast.error(`Failed to add lead: ${innerError instanceof Error ? innerError.message : 'Unknown error'}`);
                }
            } else {
                toast.error(`Failed to add lead: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            set({ isLoading: false });
        }
    },
    updateLead: async (id, updates) => {
        try {
            // If assigning a staff member, first ensure they have a profile entry
            // (required by the leads.assigned_staff_id FK constraint on profiles table)
            if (updates.assigned_staff_id) {
                const staffMember = get().staff.find(s => s.id === updates.assigned_staff_id);
                if (staffMember) {
                    // Best-effort upsert into profiles so FK doesn't fail
                    try {
                        await supabase.from('profiles').upsert([{
                            id: staffMember.id,
                            full_name: staffMember.full_name,
                            email: staffMember.email,
                            role: staffMember.role,
                        }], { onConflict: 'id' });
                    } catch (_) {
                        // RLS may block this — we'll fall through and see if update works anyway
                    }
                }
            }

            // Optimistic update
            set((state) => ({
                leads: state.leads.map((l) => (l.id === id ? { ...l, ...updates } : l))
            }));

            try {
                await api.updateLead(id, updates);
                toast.success('Lead updated successfully');
            } catch (error: any) {
                // If FK constraint error on assigned_staff_id, save without it and notify user
                const isFkError = error?.code === '23503' ||
                    (error?.message && error.message.includes('foreign key'));
                if (isFkError && updates.assigned_staff_id) {
                    const { assigned_staff_id: _removed, ...updatesWithoutStaff } = updates;
                    await api.updateLead(id, updatesWithoutStaff);
                    toast.success('Lead updated (staff assignment skipped — staff not yet synced to authentication)');
                    get().fetchLeads();
                } else {
                    throw error;
                }
            }
        } catch (error) {
            console.error('Failed to update lead:', error);
            toast.error(`Failed to update lead: ${error instanceof Error ? error.message : 'Unknown error'}`);
            // Revert on failure
            get().fetchLeads();
        }
    },

    deleteLead: async (id) => {
        try {
            // Optimistic update
            set((state) => ({
                leads: state.leads.filter((l) => l.id !== id)
            }));
            await api.deleteLead(id);
            toast.success('Lead deleted successfully');
        } catch (error: any) {
            console.error('Failed to delete lead:', error);
            const errMsg = error?.message || error?.details || (error instanceof Error ? error.message : 'Unknown error');
            toast.error(`Failed to delete lead: ${errMsg}`);
            get().fetchLeads();
        }
    },

    // Tours Actions
    fetchTours: async () => {
        set({ isLoading: true });
        try {
            const tours = await api.getTours();
            set({ tours, isLoading: false });
        } catch (error) {
            console.error('Failed to fetch tours:', error);
            set({ isLoading: false });
        }
    },
    setTours: (tours) => set({ tours }),
    addTour: async (tour) => {
        set({ isLoading: true });
        try {
            const { id, ...tourData } = tour;
            const newTour = await api.createTour(tourData);
            set((state) => ({
                tours: [newTour, ...state.tours],
                isLoading: false
            }));
            toast.success('Tour added successfully');
        } catch (error) {
            console.error('Failed to add tour:', error);
            toast.error(`Failed to add tour: ${error instanceof Error ? error.message : 'Unknown error'}`);
            set({ isLoading: false });
        }
    },
    updateTour: async (id, updates) => {
        try {
            set((state) => ({
                tours: state.tours.map((t) => (t.id === id ? { ...t, ...updates } : t))
            }));
            await api.updateTour(id, updates);
        } catch (error) {
            console.error('Failed to update tour:', error);
            get().fetchTours();
        }
    },
    deleteTour: async (id) => {
        try {
            set((state) => ({
                tours: state.tours.filter((t) => t.id !== id)
            }));
            await api.deleteTour(id);
        } catch (error) {
            console.error('Failed to delete tour:', error);
            get().fetchTours();
        }
    },

    fetchStaff: async () => {
        console.log('Store: fetchStaff initiated');
        set({ isLoading: true });
        try {
            const staff = await api.getStaff();
            console.log('Store: fetchStaff success, data:', staff);
            set({ staff, isLoading: false });
        } catch (error) {
            console.error('Store: fetchStaff failed:', error);
            set({ isLoading: false });
        }
    },
    setStaff: (staff) => set({ staff }),
    addStaff: async (user, password) => {
        set({ isLoading: true });
        try {
            const { data: newStaff } = await api.createStaff(user, password);

            set((state) => ({
                staff: [newStaff, ...state.staff],
                isLoading: false
            }));

            toast.success('Staff member added successfully');
        } catch (error) {
            console.error('Failed to add staff:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to add staff member');
            set({ isLoading: false });
        }
    },
    updateStaff: async (id, updates) => {
        try {
            set((state) => ({
                staff: state.staff.map((s) => (s.id === id ? { ...s, ...updates } : s))
            }));
            await api.updateStaff(id, updates);
            toast.success('Staff updated successfully');
        } catch (error) {
            console.error('Failed to update staff:', error);
            toast.error('Failed to update staff');
            get().fetchStaff();
        }
    },
    deleteStaff: async (id) => {
        try {
            set((state) => ({
                staff: state.staff.filter((s) => s.id !== id)
            }));
            await api.deleteStaff(id);
            toast.success('Staff deleted successfully');
        } catch (error) {
            console.error('Failed to delete staff:', error);
            toast.error('Failed to delete staff');
            get().fetchStaff();
        }
    },
    sendWhatsApp: async (leadId, to, message, contentSid, contentVariables) => {
        try {
            await api.sendWhatsAppMessage(to, message, contentSid, contentVariables);
            
            let loggedContent = message;
            if (contentSid) {
                loggedContent = `[Template ${contentSid}] ${message}`;
            }

            try {
                await supabase.from('whatsapp_messages').insert([{
                    lead_id: leadId,
                    sender: 'user',
                    content: loggedContent,
                    status: 'sent'
                }]);
            } catch (dbError) {
                console.error('Failed to save WhatsApp message to database:', dbError);
            }
            toast.success('WhatsApp message sent successfully');
        } catch (error: any) {
            console.error('Failed to send WhatsApp message:', error);
            toast.error(error.message || 'Failed to send WhatsApp message');
            throw error;
        }
    },
}));
