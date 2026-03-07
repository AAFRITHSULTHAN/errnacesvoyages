import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://xacprhyszldchpztyidk.supabase.co';
const supabaseKey = 'sb_publishable_eusGYscrdrz4B4XJxdPb0w_8kSGoxIj';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    try {
        const { data, error } = await supabase.from('leads').select('*').limit(1);
        fs.writeFileSync('output.json', JSON.stringify({ data, error }, null, 2));
    } catch (err) {
        fs.writeFileSync('output.json', err.toString());
    }
}
check();
