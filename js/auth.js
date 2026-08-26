import { supabase } from './config.js';
import { setState, clearState } from './state.js';

export async function signIn(email, password) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error };
  await loadProfile(data.user.id);
  return { data };
}

export async function signOut() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  clearState();
  sessionStorage.removeItem('profile');
  window.location.href = 'login.html';
}

export async function loadProfile(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) return null;
  setState('user', userId);
  setState('profile', data);
  setState('role', data.role);
  return data;
}

export async function getCurrentSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
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
    supervisor: '#/supervisor/dashboard',
    teacher: '#/teacher/dashboard',
    parent: '#/parent/dashboard'
  };
  return routes[role] || 'login.html';
}
