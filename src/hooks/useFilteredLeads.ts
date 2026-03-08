import { useAppStore } from '@/store';

/**
 * Hook to get leads.
 * All authenticated users see all leads.
 * Page-level access is controlled via routing (e.g., Staff page is admin-only).
 */
export function useFilteredLeads() {
    const { leads } = useAppStore();
    return leads;
}
