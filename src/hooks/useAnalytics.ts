import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

export function useAnalytics() {
    const location = useLocation();
    const { user } = useAuth();

    // Track page views
    useEffect(() => {
        const trackPageView = async () => {
            try {
                await supabase.from('user_activity').insert({
                    user_id: user?.id || null,
                    event_type: 'page_view',
                    page_path: location.pathname + location.search,
                    metadata: {
                        referrer: document.referrer,
                        userAgent: navigator.userAgent,
                    }
                });
            } catch (error) {
                console.error('Error tracking page view:', error);
            }
        };

        trackPageView();
    }, [location.pathname, location.search, user?.id]);

    // Function to track custom events
    const trackEvent = async (eventType: string, metadata: any = {}) => {
        try {
            await supabase.from('user_activity').insert({
                user_id: user?.id || null,
                event_type: eventType,
                page_path: location.pathname,
                metadata: {
                    ...metadata,
                    userAgent: navigator.userAgent,
                }
            });
        } catch (error) {
            console.error('Error tracking event:', error);
        }
    };

    return { trackEvent };
}
