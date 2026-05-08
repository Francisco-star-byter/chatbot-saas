import { supabase } from './supabase';

const API = import.meta.env.VITE_API_URL;

if (!API) {
  console.error('[API] VITE_API_URL is missing! API calls will fail.');
} else {
  console.log('[API] Backend URL:', API);
}

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) console.warn('[API] No session found when building auth headers!');
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
  console.log('[API] getMe → ', `${API}/auth/me`);
  const res = await fetch(`${API}/auth/me`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    console.error('[API] getMe failed with status:', res.status);
    throw new Error('Unauthorized');
  }
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

export async function patchLeadStatus(leadId, status) {
  const res = await fetch(`${API}/auth/leads/${leadId}/status`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify({ status }),
  });
  return res.json();
}

// ── Properties ──

export async function getProperties(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API}/properties${qs ? `?${qs}` : ''}`, {
    headers: await authHeaders(),
  });
  return res.json();
}

export async function createProperty(data) {
  const res = await fetch(`${API}/properties`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateProperty(id, data) {
  const res = await fetch(`${API}/properties/${id}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteProperty(id) {
  const res = await fetch(`${API}/properties/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  return res.json();
}

export async function uploadPropertyImage(file) {
  const ext = file.name.split('.').pop();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('property-images')
    .upload(filename, file, { cacheControl: '3600', upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage
    .from('property-images')
    .getPublicUrl(filename);

  return data.publicUrl;
}
