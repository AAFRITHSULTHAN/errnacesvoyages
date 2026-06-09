import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Lead, TourPackage } from "@/types"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getLeadRevenue(lead: Lead, tours: TourPackage[]): number {
    if (lead.budget !== undefined && lead.budget !== null && lead.budget > 0) {
        return lead.budget;
    }
    const pkgName = lead.tour_interest || lead.selected_package;
    if (pkgName) {
        const tour = tours.find(
            t => t.title.toLowerCase() === pkgName.toLowerCase() ||
                 t.destination.toLowerCase() === pkgName.toLowerCase()
        );
        if (tour) {
            return tour.price;
        }
    }
    return 0;
}

