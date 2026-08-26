const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

let supabaseClient = null;
if (window.supabase && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export { supabaseClient as supabase, SUPABASE_URL, SUPABASE_ANON_KEY };
