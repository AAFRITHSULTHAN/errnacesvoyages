import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xacprhyszldchpztyidk.supabase.co';
const supabaseKey = 'sb_publishable_eusGYscrdrz4B4XJxdPb0w_8kSGoxIj';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
    console.log("Fetching a lead...");
    const { data: leads, error: fetchError } = await supabase.from('leads').select('*').limit(1);

    if (fetchError || !leads || leads.length === 0) {
        console.error("Fetch error or no leads:", fetchError);
        return;
    }

    const lead = leads[0];
    console.log("Got lead:", lead.id);
    console.log("Attempting to update lead with a bogus assigned_staff_id...");

    const { data: updateData, error: updateError } = await supabase.from('leads').update({
        assigned_staff_id: '123'
    }).eq('id', lead.id);

    if (updateError) {
        console.error("Update error:", updateError);
    } else {
        console.log("Update successful!");
    }
}
testUpdate();
