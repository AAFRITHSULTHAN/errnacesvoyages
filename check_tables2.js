import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://xacprhyszldchpztyidk.supabase.co';
const supabaseKey = 'sb_publishable_eusGYscrdrz4B4XJxdPb0w_8kSGoxIj';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Starting check_tables...");
    const { data: pData, error: pErr } = await supabase.from('profiles').select('*').limit(3);

    const { data: sData, error: sErr } = await supabase.from('staffs').select('*');

    let synced = 0;

    // Auto-sync missing ones
    if (sData) {
        for (const staff of sData) {
            const { error: insErr } = await supabase.from('profiles').insert([{
                id: staff.id,
                email: staff.email,
                full_name: staff.full_name,
                role: staff.role
            }]);

            if (!insErr) synced++;
            else console.log(`Error syncing ${staff.id}: ${insErr.message}`);
        }
    }

    fs.writeFileSync('node_output.json', JSON.stringify({ synced, pData, sDataIds: sData?.map(s => s.id) }, null, 2));
    process.exit(0);
}
check().catch(console.error);
