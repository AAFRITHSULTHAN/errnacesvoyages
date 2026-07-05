import { useMemo } from 'react';
import { useAppStore } from '@/store';

/**
 * Hook to get leads.
 * All authenticated users see all leads.
 * Page-level access is controlled via routing (e.g., Staff page is admin-only).
 */
export function useFilteredLeads() {
    const { leads } = useAppStore();
    return useMemo(() => leads.filter(l => {
        let isContactOnly = false;
        try {
            if (l.notes) {
                const parsed = JSON.parse(l.notes);
                isContactOnly = parsed && parsed.is_contact === true;
            }
        } catch (_) {}

        return (
            !isContactOnly &&
            l.source !== 'Staff' && 
            l.source !== 'WhatsApp' && 
            l.source !== 'WhatsApp Sync' && 
            l.source !== 'WhatsApp Web' && 
            l.source !== 'WhatsApp Group'
        );
    }), [leads]);
}
