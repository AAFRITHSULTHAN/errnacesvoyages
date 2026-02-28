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
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `tours/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('tour-images')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
        .from('tour-images')
        .getPublicUrl(filePath);

    return publicUrl;
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

export async function createStaff(user: any, password?: string) {
    if (password) {
        // Create auth user using a separate client to avoid signing out current user
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });

        const { data: authData, error: authError } = await tempSupabase.auth.signUp({
            email: user.email,
            password: password,
            options: {
                data: {
                    full_name: user.full_name,
                    role: user.role,
                }
            }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create user account');

        // Insert into staffs table
        const { data: profileData, error: profileError } = await supabase
            .from('staffs')
            .insert([{
                id: authData.user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                avatar_url: user.avatar_url,
                department: user.department,
                phone: user.phone
            }])
            .select()
            .single();

        if (profileError) throw profileError;
        return profileData;
    } else {
        // Just update staff if user exists
        const { data, error } = await supabase
            .from('staffs')
            .insert([user])
            .select()
            .single();
        if (error) throw error;
        return data;
    }
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
