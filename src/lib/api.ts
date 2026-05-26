import { supabase } from './supabase';
import type { Lead, TourPackage } from '@/types';
import { createClient } from '@supabase/supabase-js';

// A secondary client that explicitly uses the anon key for reads.
// This ensures custom-auth staff sessions (no Supabase JWT) can still read data.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const anonClient = createClient(supabaseUrl, supabaseAnonKey);

// --- LEADS ---

export async function getLeads() {
    // Try with the current session first, fall back to anon client
    let client = supabase;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        console.log('API: No active session, using anon client for getLeads');
        client = anonClient;
    }

    const { data, error } = await client
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('API: getLeads error:', error);
        throw error;
    }
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
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { action: 'delete_lead', leadId: id },
    });

    if (error) throw error;
    return data;
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
    // Try with current session first, fall back to anon client
    let client = supabase;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        client = anonClient;
    }

    const { data, error } = await client
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
    console.log('API: createStaff (Simplified) initiated for', user.email);
    const staffId = (user.id || crypto.randomUUID()) as any;

    // Direct database insertion only - bypassing Supabase Auth
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

    // Sync to profiles table for lead assignments
    try {
        await supabase.from('profiles').upsert([{
            id: staffId,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
        }]);
    } catch (_) {
    }

    return { data: staffData };
}

export async function verifyStaffCredentials(email: string, password: string) {
    console.log('API: verifyStaffCredentials for', email);

    // Sanitize input password (digits only)
    const sanitizedPassword = password.replace(/\D/g, '');

    const { data, error } = await supabase
        .from('staffs')
        .select('*')
        .eq('email', email)
        .single();

    if (error || !data) return null;

    // Check if phone matches (also sanitized)
    const storedPassword = (data.phone || '').replace(/\D/g, '');

    if (sanitizedPassword === storedPassword && storedPassword !== '') {
        return data;
    }

    return null;
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

// --- WHATSAPP ---

export async function sendWhatsAppMessage(
    to: string, 
    message: string, 
    contentSid?: string, 
    contentVariables?: Record<string, string>
) {
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { to, message, contentSid, contentVariables },
    });

    if (error) throw error;
    return data;
}
