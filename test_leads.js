import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xacprhyszldchpztyidk.supabase.co';
const supabaseKey = 'sb_publishable_eusGYscrdrz4B4XJxdPb0w_8kSGoxIj';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeads() {
    const { data: leads, error: fetchError } = await supabase.from('leads').select('*').limit(1);
    if (fetchError) {
        console.error("Fetch error:", JSON.stringify(fetchError));
    } else {
        console.log("Existing lead example:", leads[0]);
    }

    const testLead = {
        name: 'Test Lead',
        email: 'test@example.com',
        phone: '1234567890',
        status: 'new',
        source: 'Website',
        budget: 0,
        tour_interest: '',
        notes: 'test',
        assigned_staff_id: null
    };

    const { data, error } = await supabase.from('leads').insert([testLead]).select();

    if (error) {
        console.error("Insert error:", JSON.stringify(error));
    } else {
        console.log("Insert successful, returned data:", data);

        // Cleanup
        await supabase.from('leads').delete().eq('id', data[0].id);
    }
}

checkLeads();
