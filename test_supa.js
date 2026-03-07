import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xacprhyszldchpztyidk.supabase.co';
const supabaseAnonKey = 'sb_publishable_eusGYscrdrz4B4XJxdPb0w_8kSGoxIj';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    console.log("Signing up user...");
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `test_user_${Date.now()}@example.com`,
        password: 'Password123!',
        options: {
            data: {
                full_name: 'Test Setup',
                role: 'admin',
            }
        }
    });

    if (authError) {
        console.error("Auth Error:", authError);
        return;
    }

    console.log("Auth success! User ID:", authData.user?.id);

    console.log("Inserting profile...");
    const { data: profileData, error: profileError } = await supabase
        .from('staffs')
        .insert([{
            id: authData.user?.id,
            email: authData.user?.email,
            full_name: 'Test Setup',
            role: 'admin',
            phone: '1234567890'
        }])
        .select()
        .single();

    if (profileError) {
        console.error("Profile Error:", profileError);
    } else {
        console.log("Profile success!", profileData);
    }
}

test();
