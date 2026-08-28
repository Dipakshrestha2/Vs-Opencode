import { getSupabase } from './config.js';
import { getState } from './state.js';

function client() {
  return getSupabase();
}

function isDemo() {
  return !client();
}

async function currentUserId() {
  const profile = getState().profile;
  if (profile?.id) return profile.id;
  const c = client();
  if (c) {
    const { data: { session } } = await c.auth.getSession();
    if (session) return session.user.id;
  }
  return null;
}

async function auditLog(action, tableName, recordId, oldData, newData) {
  const c = client();
  if (!c) return;
  const userId = await currentUserId();
  await c.from('audit_logs').insert({
    user_id: userId,
    action,
    table_name: tableName,
    record_id: recordId || null,
    old_data: oldData || null,
    new_data: newData || null
  });
}

export async function fetchAll(table, filters = {}, select = '*') {
  const c = client();
  if (!c) return { error: { message: 'Demo Mode: Supabase not configured' } };
  let query = c.from(table).select(select);
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') query = query.eq(key, val);
  });
  const { data, error } = await query;
  return error ? { error } : { data };
}

export async function fetchOne(table, id, select = '*') {
  const c = client();
  if (!c) return { error: { message: 'Demo Mode: Supabase not configured' } };
  const { data, error } = await c.from(table).select(select).eq('id', id).maybeSingle();
  return error ? { error } : { data };
}

export async function fetchCount(table, filters = {}) {
  const c = client();
  if (!c) return { error: { message: 'Demo Mode: Supabase not configured' } };
  let query = c.from(table).select('id', { count: 'exact', head: true });
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') query = query.eq(key, val);
  });
  const { count, error } = await query;
  return error ? { error } : { count: count || 0 };
}

/**
 * Fetch rows from Supabase; if the client is unavailable or the query fails
 * (demo mode, offline, broken RLS), return the provided fallback data instead.
 */
export async function fetchAllOrDemo(table, demoData, filters = {}, select = '*') {
  const { data, error } = await fetchAll(table, filters, select);
  return { data: error || !data ? demoData : data, fromDb: !error && !!data };
}

export async function insertRecord(table, record) {
  const c = client();
  if (!c) return { error: { message: 'Demo Mode: Supabase not configured' } };
  const { data, error } = await c.from(table).insert(record).select().maybeSingle();
  if (!error && data) await auditLog('INSERT', table, data.id, null, record);
  return error ? { error } : { data };
}

export async function updateRecord(table, id, updates) {
  const c = client();
  if (!c) return { error: { message: 'Demo Mode: Supabase not configured' } };
  const old = await fetchOne(table, id);
  const { data, error } = await c.from(table).update(updates).eq('id', id).select().maybeSingle();
  if (!error && data) await auditLog('UPDATE', table, id, old.data, updates);
  return error ? { error } : { data };
}

export async function deleteRecord(table, id) {
  const c = client();
  if (!c) return { error: { message: 'Demo Mode: Supabase not configured' } };
  const old = await fetchOne(table, id);
  const { error } = await c.from(table).delete().eq('id', id);
  if (!error) await auditLog('DELETE', table, id, old.data, null);
  return error ? { error } : { data: true };
}

export async function fetchWithJoin(table, filters = {}, select = '*', joins = '') {
  const c = client();
  if (!c) return { error: { message: 'Demo Mode: Supabase not configured' } };
  let query = c.from(table).select(joins ? `${select}, ${joins}` : select);
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') query = query.eq(key, val);
  });
  const { data, error } = await query;
  return error ? { error } : { data };
}

export async function createNotification(userId, title, message, type = 'info', link = null) {
  return insertRecord('notifications', { user_id: userId, title, message, type, link });
}

export { auditLog, isDemo, getSupabase };