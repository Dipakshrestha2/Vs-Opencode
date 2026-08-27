const SUPABASE_URL = 'https://ugngjqszxobbhrdxlyso.supabase.co';

const SUPABASE_ANON_KEY = 'sb_publishable_oSI-qrM2TWCzvLdrXVtUyw_QdJgpo0E';

let supabaseClient = null;

if (window.supabase) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}

export {
  supabaseClient as supabase,
  SUPABASE_URL,
  SUPABASE_ANON_KEY
};