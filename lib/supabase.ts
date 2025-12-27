import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// REPLACE THESE WITH YOUR ACTUAL SUPABASE KEYS
const supabaseUrl = 'https://jtogrpgrvcqvrxoaajfz.supabase.co';
const supabaseAnonKey = 'sb_publishable_AVc5j7QcUHJQS1qoE00U4g_q_jNVi1I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);