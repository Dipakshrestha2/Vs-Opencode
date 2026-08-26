import { supabase } from './config.js';
import { getState } from './state.js';

async function auditLog(action, tableName, recordId, oldData, newData) {
  if (!supabase) return;
  const profile = getState().profile;
  await supabase.from('audit_logs').insert({
    user_id: profile?.id,
    action,
    table_name: tableName,
    record_id: recordId,
    old_data: oldData || null,
    new_data: newData || null
  });
}

export async function fetchAll(table, filters = {}, select = '*') {
  let query = supabase.from(table).select(select);
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') query = query.eq(key, val);
  });
  const { data, error } = await query;
  return error ? { error } : { data };
}

export async function fetchOne(table, id, select = '*') {
  const { data, error } = await supabase.from(table).select(select).eq('id', id).single();
  return error ? { error } : { data };
}

export async function insertRecord(table, record) {
  const { data, error } = await supabase.from(table).insert(record).select().single();
  if (!error) await auditLog('INSERT', table, data.id, null, record);
  return error ? { error } : { data };
}

export async function updateRecord(table, id, updates) {
  const old = await fetchOne(table, id);
  const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single();
  if (!error) await auditLog('UPDATE', table, id, old.data, updates);
  return error ? { error } : { data };
}

export async function deleteRecord(table, id) {
  const old = await fetchOne(table, id);
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (!error) await auditLog('DELETE', table, id, old.data, null);
  return error ? { error } : { data: true };
}

export async function fetchWithJoin(table, filters = {}, select = '*', joins = '') {
  let query = supabase.from(table).select(joins ? `${select}, ${joins}` : select);
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') query = query.eq(key, val);
  });
  const { data, error } = await query;
  return error ? { error } : { data };
}

export async function createNotification(userId, title, message, type = 'info', link = null) {
  return insertRecord('notifications', { user_id: userId, title, message, type, link });
}

export { auditLog };
