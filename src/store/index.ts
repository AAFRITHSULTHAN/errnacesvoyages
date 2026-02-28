import { create } from 'zustand';
import type { Lead, TourPackage, User } from '@/types';
import * as api from '@/lib/api';
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
}

// Mock Data removed


export const useAppStore = create<AppState>((set) => ({
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
            const newLead = await api.createLead(lead);
            set((state) => ({
                leads: [newLead, ...state.leads],
                isLoading: false
            }));
            toast.success('Lead added successfully');
        } catch (error) {
            console.error('Failed to add lead:', error);
            toast.error(`Failed to add lead: ${error instanceof Error ? error.message : 'Unknown error'}`);
            set({ isLoading: false });
        }
    },
    updateLead: async (id, updates) => {
        try {
            // Optimistic update
            set((state) => ({
                leads: state.leads.map((l) => (l.id === id ? { ...l, ...updates } : l))
            }));
            await api.updateLead(id, updates);
            toast.success('Lead updated successfully');
        } catch (error) {
            console.error('Failed to update lead:', error);
            toast.error('Failed to update lead');
            // Revert on failure (could implement fetchLeads() here to sync)
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
        } catch (error) {
            console.error('Failed to delete lead:', error);
            toast.error('Failed to delete lead');
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
            const newStaff = await api.createStaff(user, password);
            set((state) => ({
                staff: [newStaff, ...state.staff],
                isLoading: false
            }));
            toast.success('Staff member added successfully');
        } catch (error) {
            console.error('Failed to add staff:', error);
            toast.error('Failed to add staff member');
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
        }
    },
}));
