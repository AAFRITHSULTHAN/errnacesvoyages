import fs from 'fs';
fs.writeFileSync('node_output.json', JSON.stringify({ status: "started" }));
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xacprhyszldchpztyidk.supabase.co';
const supabaseKey = 'sb_publishable_eusGYscrdrz4B4XJxdPb0w_8kSGoxIj';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    try {
        fs.writeFileSync('node_output.json', JSON.stringify({ status: "checking" }));
        const { data: pData, error: pErr } = await supabase.from('profiles').select('*').limit(3);
        const { data: sData, error: sErr } = await supabase.from('staffs').select('*');
        let synced = 0;
        if (sData) {
            for (const staff of sData) {
                const { error: insErr } = await supabase.from('profiles').insert([{
                    id: staff.id,
                    email: staff.email,
                    full_name: staff.full_name,
                    role: staff.role
                }]);
                if (!insErr) synced++;
            }
        }
        fs.writeFileSync('node_output.json', JSON.stringify({ synced, pData, sDataCount: sData?.length }, null, 2));
    } catch (e) {
        fs.writeFileSync('node_output.json', JSON.stringify({ error: e.message }));
    } finally {
        process.exit(0);
    }
}
check();
