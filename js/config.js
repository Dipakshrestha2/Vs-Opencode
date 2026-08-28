// =============================================
// Supabase configuration
// Replace these with your own project values.
//   Publishable key format:  sb_publishable_xxxxxxxxxxxxx
//   Legacy anon key format:  eyJhbGciOiJIUzI1NiIs...
// =============================================
const SUPABASE_URL = 'https://kusnddqigbqphyqtqrrh.supabase.co';

const SUPABASE_ANON_KEY = 'sb_publishable_H01k4qP0y2g2X_3R3kK_6Q_i-QeC-0M';

const SDK_WAIT_TIMEOUT = 8000;

let supabaseClient = null;

function isValidKey(key) {
  if (typeof key !== 'string' || !key.trim()) return false;
  return /^(eyJ|sb_publishable_|sb_secret_)/.test(key.trim());
}

function sdkGlobal() {
  return window.supabase && typeof window.supabase.createClient === 'function' ? window.supabase : null;
}

function createClient() {
  if (supabaseClient) return supabaseClient;
  const sdk = sdkGlobal();
  if (!sdk) return null;
  if (!SUPABASE_URL || !isValidKey(SUPABASE_ANON_KEY)) return null;
  supabaseClient = sdk.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  return supabaseClient;
}

/**
 * Returns the shared Supabase client if the SDK has loaded, otherwise null.
 */
export function getSupabase() {
  return createClient();
}

/**
 * Waits for the Supabase SDK (local bundle or CDN fallback) to become
 * available and returns a ready-to-use client, or null after the timeout.
 */
export async function ensureSupabase(timeoutMs = SDK_WAIT_TIMEOUT) {
  const ready = createClient();
  if (ready) return ready;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const client = createClient();
    if (client) return client;
    await new Promise((r) => setTimeout(r, 100));
  }
  console.warn('[Supabase] SDK did not load within timeout. Running in demo mode.');
  return null;
}

// Backward-compatible live export. Modules that import `supabase` read the
// current value each time, so this becomes non-null as soon as the SDK loads.
export { supabaseClient as supabase };

// Auto-test the connection immediately. Safe because createClient() is a no-op
// until the SDK is present.
if (typeof window !== 'undefined') {
  const client = createClient();
  if (client) {
    client.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('❌ Supabase Connection Failed:', error.message);
        console.error(
          'Please double-check SUPABASE_URL and SUPABASE_ANON_KEY in js/config.js. ' +
          'The key may be a publishable key (sb_publishable_...) or a legacy anon key (eyJ...).'
        );
      } else {
        console.log('✅ Supabase is CONNECTED successfully!');
      }
    }).catch((err) => {
      console.error('❌ Supabase Connection Error:', err);
    });
  } else if (!window.supabase) {
    console.warn('❌ Supabase SDK could not be loaded. Make sure js/vendor/supabase.min.js exists.');
  }
}

export { SUPABASE_URL, SUPABASE_ANON_KEY };