import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xacprhyszldchpztyidk.supabase.co';
const supabaseKey = 'sb_publishable_eusGYscrdrz4B4XJxdPb0w_8kSGoxIj';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testProfiles() {
    console.log("Testing insert to profiles...");
    const { data: pData, error: pError } = await supabase.from('profiles').insert([{
        id: crypto.randomUUID(),
        full_name: 'Fallback Tester',
        email: 'fallback@example.com',
        role: 'sales_executive'
    }]).select();

    console.log("Insert result:", pData);
    console.log("Insert error:", pError);
}
testProfiles();
