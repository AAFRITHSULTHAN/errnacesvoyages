import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xacprhyszldchpztyidk.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_eusGYscrdrz4B4XJxdPb0w_8kSGoxIj';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Fetching staff data to see if we have access...");
    const { data, error } = await supabase.from('staffs').select('*').limit(1);
    if (error) {
        console.error("Staff fetch error:", error);
    } else {
        console.log("Staff data:", data);
    }

    // Try to insert directly with a fake UUID
    const id = crypto.randomUUID();
    console.log("Attempting direct insert with fake id:", id);
    const { error: insertError } = await supabase.from('staffs').insert([{
        id,
        email: 'fake@example.com',
        full_name: 'Fake Staff',
        role: 'admin'
    }]);

    if (insertError) {
        console.error("Direct insert error:", insertError);
    } else {
        console.log("Direct insert successful!");
    }
}
checkSchema();
