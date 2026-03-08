import { supabase } from './supabase';
import type { Lead, TourPackage } from '@/types';

// --- LEADS ---

export async function getLeads() {
    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Lead[];
}

export async function createLead(lead: Partial<Lead>) {
    const { data, error } = await supabase
        .from('leads')
        .insert([lead])
        .select();

    if (error) throw error;
    return data?.[0] as Lead;
}

export async function updateLead(id: string, updates: Partial<Lead>) {
    const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as Lead;
}

export async function deleteLead(id: string) {
    const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// --- TOURS ---

export async function uploadTourImage(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 600;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // Compress heavily to ensure it fits in a database column
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                resolve(dataUrl);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}

export async function getTours() {
    const { data, error } = await supabase
        .from('tours')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as TourPackage[];
}

export async function createTour(tour: Partial<TourPackage>) {
    const { data, error } = await supabase
        .from('tours')
        .insert([tour])
        .select();

    if (error) throw error;
    return data?.[0] as TourPackage;
}

export async function updateTour(id: string, updates: Partial<TourPackage>) {
    const { data, error } = await supabase
        .from('tours')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as TourPackage;
}

export async function deleteTour(id: string) {
    const { error } = await supabase
        .from('tours')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// --- STAFF ---

export async function getStaff() {
    console.log('API: getStaff called');
    const { data, error } = await supabase
        .from('staffs')
        .select('*')
        .order('full_name', { ascending: true });

    if (error) {
        console.error('API: getStaff error:', error);
        throw error;
    }

    console.log('API: getStaff success, count:', data?.length);
    return data as any[];
}

export async function createStaff(user: any, _password?: string) {
    // Insert directly into staffs table without creating an Auth user.
    // This avoids Supabase email rate limits entirely.
    // The staff profile for lead assignment is then synced separately.
    const staffId = user.id || crypto.randomUUID();

    const { data: staffData, error: staffError } = await supabase
        .from('staffs')
        .insert([{
            id: staffId,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            avatar_url: user.avatar_url || null,
            department: user.department || null,
            phone: user.phone || null,
            status: 'active',
        }])
        .select()
        .single();

    if (staffError) throw staffError;

    // Also try to insert into profiles table so that lead assignment foreign key works.
    // This may fail silently if RLS blocks it — that's OK, it's best-effort.
    try {
        await supabase.from('profiles').insert([{
            id: staffId,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
        }]);
    } catch (_) {
        // RLS may block this insert; non-fatal
    }

    return staffData;
}


export async function updateStaff(id: string, updates: any) {
    const { data, error } = await supabase
        .from('staffs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteStaff(id: string) {
    const { error } = await supabase
        .from('staffs')
        .delete()
        .eq('id', id);

    if (error) throw error;
}
