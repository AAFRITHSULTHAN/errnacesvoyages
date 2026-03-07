import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xacprhyszldchpztyidk.supabase.co';
const supabaseKey = 'sb_publishable_eusGYscrdrz4B4XJxdPb0w_8kSGoxIj';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: pData, error: pErr } = await supabase.from('profiles').select('*').limit(3);
    console.log("Profiles:", pData, pErr);

    const { data: sData, error: sErr } = await supabase.from('staffs').select('*');

    // Auto-sync missing ones
    if (sData) {
        let synced = 0;
        for (const staff of sData) {
            const { error: insErr } = await supabase.from('profiles').insert([{
                id: staff.id,
                email: staff.email,
                full_name: staff.full_name,
                role: staff.role,
                created_at: new Date().toISOString()
            }]);
            if (!insErr) synced++;
        }
        console.log(`Synced ${synced} missing profiles.`);
    }
}
check();
