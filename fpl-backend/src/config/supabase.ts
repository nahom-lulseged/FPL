import { createClient } from '@supabase/supabase-js';
import { env } from './env';

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, options);
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, options);
