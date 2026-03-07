import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xacprhyszldchpztyidk.supabase.co';
const supabaseKey = 'sb_publishable_eusGYscrdrz4B4XJxdPb0w_8kSGoxIj';
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanUpBrokenStaffs() {
    console.log("Checking staffs and profiles...");
    const { data: staffs } = await supabase.from('staffs').select('id, full_name');
    const { data: profiles } = await supabase.from('profiles').select('id');

    if (!staffs || !profiles) {
        console.log("Failed to fetch data.");
        return;
    }

    const profileIds = new Set(profiles.map(p => p.id));

    for (const staff of staffs) {
        if (!profileIds.has(staff.id)) {
            console.log(`Staff '${staff.full_name}' (${staff.id}) is broken (no profile). Removing from staffs table...`);
            const { error } = await supabase.from('staffs').delete().eq('id', staff.id);
            if (error) {
                console.error(`Failed to delete ${staff.full_name}:`, error.message);
            } else {
                console.log(`Deleted ${staff.full_name} successfully.`);
            }
        } else {
            console.log(`Staff '${staff.full_name}' is valid.`);
        }
    }
}
cleanUpBrokenStaffs();
