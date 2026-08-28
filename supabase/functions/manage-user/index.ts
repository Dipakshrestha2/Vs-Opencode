// manage-user: Admin-only Edge Function for user creation and deletion.
// Uses the service role key (available server-side only) to call Supabase Auth Admin APIs.
// The anon key cannot call these APIs, hence the need for this function.

// @ts-ignore: Deno URL imports are valid in Edge Function runtime (not Node.js)
// deno-lint-ignore-file
/// <reference lib="deno.window" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS });
  }

  // Verify the caller is a logged-in admin using the anon client
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: CORS });
  }

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user: caller }, error: authError } = await anonClient.auth.getUser();
  if (authError || !caller) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
  }

  // Confirm caller is an admin by checking their profile role
  const { data: profile, error: profileError } = await anonClient
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle();

  if (profileError || profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), { status: 403, headers: CORS });
  }

  // Use the service role client for auth admin operations
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const body = await req.json();
  const { action } = body;

  // ----------------------------------------------------------------
  // CREATE USER
  // ----------------------------------------------------------------
  if (action === 'create') {
    const { email, password, full_name, role } = body;
    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'email, password, full_name, and role are required' }), { status: 400, headers: CORS });
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: CORS });
    }

    // The handle_new_user trigger in the DB creates the profiles row automatically.
    return new Response(JSON.stringify({ data: { id: data.user.id, email, full_name, role } }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ----------------------------------------------------------------
  // DELETE USER
  // ----------------------------------------------------------------
  if (action === 'delete') {
    const { user_id } = body;
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), { status: 400, headers: CORS });
    }

    const { error } = await adminClient.auth.admin.deleteUser(user_id);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: CORS });
    }

    // Profile row will be deleted automatically via ON DELETE CASCADE on auth.users → profiles.
    return new Response(JSON.stringify({ data: { deleted: true } }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Unknown action. Use "create" or "delete".' }), { status: 400, headers: CORS });
});
