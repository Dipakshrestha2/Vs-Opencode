import { getSupabase } from './config.js';
import { setState, clearState } from './state.js';

export function supabase() {
  return getSupabase();
}

function persistProfile(profile) {
  if (!profile) return profile;
  setState('user', profile.id);
  setState('profile', profile);
  setState('role', profile.role);
  sessionStorage.setItem('profile', JSON.stringify(profile));
  return profile;
}

export async function signIn(email, password) {
  const client = getSupabase();
  if (!client) return { error: { message: 'Supabase not configured' } };
  const { data: authData, error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { error };
  const profile = await loadProfile(authData.user.id);
  if (!profile) {
    return { error: { message: 'Profile not found for this account. Contact the administrator.' } };
  }
  return { data: profile };
}

export async function signUp(email, password, metadata = {}) {
  const client = getSupabase();
  if (!client) return { error: { message: 'Supabase not configured' } };
  return client.auth.signUp({
    email,
    password,
    options: { data: { full_name: metadata.full_name || '', role: metadata.role || 'parent' } }
  });
}

export async function resetPassword(email) {
  const client = getSupabase();
  if (!client) return { error: { message: 'Supabase not configured' } };
  return client.auth.resetPasswordForEmail(email);
}

export async function signOut() {
  const client = getSupabase();
  if (client) {
    await client.auth.signOut();
  }
  clearState();
  sessionStorage.removeItem('profile');
  window.location.href = 'login.html';
}

export async function loadProfile(userId) {
  const client = getSupabase();
  if (!client) return null;
  if (!userId) {
    const { data: { session } } = await client.auth.getSession();
    if (!session) return null;
    userId = session.user.id;
  }
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error || !data) {
    const stored = JSON.parse(sessionStorage.getItem('profile') || 'null');
    return stored ? persistProfile(stored) : null;
  }
  return persistProfile(data);
}

export async function getCurrentSession() {
  const client = getSupabase();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  if (!session) return null;
  const profile = await loadProfile(session.user.id);
  return profile;
}

export function requireAuth(allowedRoles = []) {
  const profile = JSON.parse(sessionStorage.getItem('profile') || 'null');
  if (!profile) {
    window.location.href = 'login.html';
    return false;
  }
  if (allowedRoles.length && !allowedRoles.includes(profile.role)) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

export function redirectByRole(role) {
  const routes = {
    admin: '#/admin/dashboard',
    head_teacher: '#/head_teacher/dashboard',
    teacher: '#/teacher/dashboard',
    parent: '#/parent/dashboard'
  };
  return routes[role] || '';
}

export function roleLabel(role) {
  const map = {
    admin: 'Admin',
    head_teacher: 'Head Teacher',
    teacher: 'Teacher',
    parent: 'Parent',
    supervisor: 'Supervisor'
  };
  return map[role] || role || '';
}