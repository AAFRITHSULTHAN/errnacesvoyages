import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xacprhyszldchpztyidk.supabase.co';
const supabaseKey = 'sb_publishable_eusGYscrdrz4B4XJxdPb0w_8kSGoxIj';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
    console.log("Testing auth signup...");
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'test_staff_99@example.com',
        password: 'Password123!',
        options: {
            data: {
                full_name: 'Test Staff 99',
                role: 'sales_executive'
            }
        }
    });

    console.log("Auth Data:", authData);
    console.log("Auth Error:", authError);
    if (authError) {
        console.log(authError.message);
    }
}
testSignup();
