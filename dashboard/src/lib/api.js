import { supabase } from './supabase';

const API = import.meta.env.VITE_API_URL;

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  };
}

export async function setupAccount(name) {
  const res = await fetch(`${API}/auth/setup`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function getMe() {
  const res = await fetch(`${API}/auth/me`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}

export async function updateConfig(data) {
  const res = await fetch(`${API}/auth/config`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getLeads() {
  const res = await fetch(`${API}/auth/leads`, {
    headers: await authHeaders(),
  });
  return res.json();
}
