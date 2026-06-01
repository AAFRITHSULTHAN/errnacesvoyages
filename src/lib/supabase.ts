import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Custom Lock implementation to bypass Navigator LockManager issues in dev/local environment
const debugLock = async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
    // Bypass lock and execute immediately
    // console.log(`Acquiring lock ${name} bypassed`);
    return await fn();
};

export const anonClient = createClient(supabaseUrl, supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: window.localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        lock: debugLock, // Force usage of our dummy lock
    },
});

