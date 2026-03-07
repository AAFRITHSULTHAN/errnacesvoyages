import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://xacprhyszldchpztyidk.supabase.co';
const supabaseKey = 'sb_publishable_eusGYscrdrz4B4XJxdPb0w_8kSGoxIj';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: 'test_staff_102@example.com',
            password: 'Password123!',
            options: {
                data: {
                    full_name: 'Test Staff 102',
                    role: 'sales_executive'
                }
            }
        });

        const output = {
            authData,
            authError,
            message: authError ? authError.message : 'Success'
        };
        fs.writeFileSync('signup_result.json', JSON.stringify(output, null, 2));
    } catch (e) {
        fs.writeFileSync('signup_result.json', JSON.stringify({ exception: e.message }));
    }
    process.exit(0);
}
testSignup();
