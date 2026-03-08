import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@/types';
import { useAppStore } from '@/store';
import { supabase } from '@/lib/supabase';
import { verifyStaffCredentials } from '@/lib/api';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password?: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const { setUser, user } = useAppStore();

    useEffect(() => {
        let mounted = true;

        // Check active session
        const initAuth = async () => {
            try {
                // Create a timeout promise
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Auth timeout')), 2000)
                );

                // Race between getSession and timeout
                const { data: { session }, error } = await Promise.race([
                    supabase.auth.getSession(),
                    timeoutPromise
                ]) as any;

                if (error) throw error;
                if (mounted) await handleUserSession(session);
            } catch (error) {
                console.warn('Auth initialization session check failed:', error);

                // Fallback: Check for custom staff session
                const staffSessionStr = localStorage.getItem('staff_session');
                if (staffSessionStr && mounted) {
                    try {
                        const profile = JSON.parse(staffSessionStr);
                        setUser(profile as User);
                        console.log('Restored custom staff session:', profile.email);
                    } catch (_) {
                        localStorage.removeItem('staff_session');
                    }
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state change:', event, session?.user?.email);
            if (mounted) {
                await handleUserSession(session);
                setLoading(false);
            }
        });

        initAuth();

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [setUser]);

    const handleUserSession = async (session: any) => {
        try {
            if (session?.user) {
                // Fetch staff details
                const { data: profile, error } = await supabase
                    .from('staffs')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found" (0 rows)
                    console.error('Error fetching profile:', error);
                }

                if (profile) {
                    setUser(profile as User);
                } else {
                    // Fallback or create profile if missing
                    console.log('Profile not found, using session metadata fallback');
                    const fallbackUser: User = {
                        id: session.user.id,
                        email: session.user.email!,
                        full_name: session.user.user_metadata.full_name || 'Admin',
                        role: session.user.email === 'admin@errancesvoyages.com' ? 'admin' : 'sales_executive',
                        avatar_url: session.user.user_metadata.avatar_url,
                    };
                    setUser(fallbackUser);
                }
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Error in handleUserSession:', error);
            setUser(null);
        }
    };

    const signIn = async (email: string, password?: string) => {
        if (password) {
            try {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } catch (authError: any) {
                // If standard login fails, try custom staff verification
                console.log('Supabase login failed, trying custom staff auth...');
                const staffProfile = await verifyStaffCredentials(email, password);

                if (staffProfile) {
                    // Success! Store in AppStore and LocalStorage
                    setUser(staffProfile as User);
                    localStorage.setItem('staff_session', JSON.stringify(staffProfile));
                    console.log('Custom staff login success:', email);
                } else {
                    // Both failed
                    throw authError;
                }
            }
        } else {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: window.location.origin,
                },
            });
            if (error) throw error;
            alert('Check your email for the login link!');
        }
    };

    const signOut = async () => {
        console.log('AuthProvider: signOut initiated');
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Supabase signout error:', error);
            } else {
                console.log('Supabase signout successful');
            }
        } catch (err) {
            console.error('Signout failed unexpectedly:', err);
        } finally {
            console.log('AuthProvider: clearing user state');
            localStorage.removeItem('staff_session');
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
