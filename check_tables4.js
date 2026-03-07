import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xacprhyszldchpztyidk.supabase.co';
const supabaseKey = 'sb_publishable_eusGYscrdrz4B4XJxdPb0w_8kSGoxIj';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking staffs...");
    const { data: sData, error: sErr } = await supabase.from('staffs').select('id, full_name');
    console.log("Staffs:", sData);

    console.log("Checking profiles...");
    const { data: pData, error: pErr } = await supabase.from('profiles').select('id, full_name');
    console.log("Profiles:", pData);
}
check();
