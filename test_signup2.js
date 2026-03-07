import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xacprhyszldchpztyidk.supabase.co';
const supabaseKey = 'sb_publishable_eusGYscrdrz4B4XJxdPb0w_8kSGoxIj';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
    console.log("Testing auth signup...");
    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: 'test_staff_100@example.com',
            password: 'Password123!',
            options: {
                data: {
                    full_name: 'Test Staff 100',
                    role: 'sales_executive'
                }
            }
        });

        console.log("Auth Data:", JSON.stringify(authData));
        if (authError) {
            console.error("Auth Error:", JSON.stringify(authError));
        } else {
            console.log("Signup successful!");
        }
    } catch (e) {
        console.error("Exception:", e);
    } finally {
        process.exit(0);
    }
}
testSignup();
