import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xacprhyszldchpztyidk.supabase.co';
const supabaseKey = 'sb_publishable_eusGYscrdrz4B4XJxdPb0w_8kSGoxIj';
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncProfiles() {
    try {
        console.log("Fetching staffs...");
        const { data: staffs, error: staffError } = await supabase.from('staffs').select('*');
        if (staffError) {
            console.error("Staff fetch error:", staffError);
            process.exit(1);
        }

        console.log(`Found ${staffs.length} staffs. Syncing to profiles...`);

        for (const staff of staffs) {
            console.log(`Checking profile for ${staff.id} / ${staff.full_name}`);
            const { error: insertError } = await supabase.from('profiles').insert([{
                id: staff.id,
                email: staff.email,
                full_name: staff.full_name,
                role: staff.role
            }]);

            if (insertError) {
                if (insertError.code === '23505') { // Unique violation
                    console.log(`Profile ${staff.id} already exists`);
                } else {
                    console.error(`Failed to sync ${staff.id}:`, insertError);
                }
            } else {
                console.log(`Successfully synced ${staff.id} to profiles`);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
syncProfiles();
