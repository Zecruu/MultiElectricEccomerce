function isLocalHost(hostname: string){
  return (
    hostname === 'localhost' || hostname === '127.0.0.1' ||
    /^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}
const inferredBase = typeof window !== 'undefined'
  ? (isLocalHost(window.location.hostname)
      ? `${window.location.protocol}//${window.location.hostname}:5000`
      : undefined)
  : undefined;
const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || inferredBase || "http://localhost:5000";
export const API_BASE = BASE;

async function getCsrf() {
  try {
    const res = await fetch(`${BASE}/api/csrf-token`, { credentials: 'include' });
    if (!res.ok) return '';
    const data = await res.json().catch(() => ({}));
    return data.csrfToken || '';
  } catch {
    return '';
  }
}

async function tryRefreshAuth() {
  try {
    const csrf = await getCsrf();
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'csrf-token': csrf, 'x-csrf-token': csrf },
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiPost(path: string, body: any) {
  const csrfToken = await getCsrf();
  let res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'csrf-token': csrfToken, 'x-csrf-token': csrfToken, 'Accept': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (res.status === 401 && await tryRefreshAuth()) {
    const csrf2 = await getCsrf();
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'csrf-token': csrf2, 'x-csrf-token': csrf2, 'Accept': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
  }
  return res;
}

export async function apiPatch(path: string, body: any) {
  const csrfToken = await getCsrf();
  let res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'csrf-token': csrfToken, 'x-csrf-token': csrfToken, 'Accept': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (res.status === 401 && await tryRefreshAuth()) {
    const csrf2 = await getCsrf();
    res = await fetch(`${BASE}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'csrf-token': csrf2, 'x-csrf-token': csrf2, 'Accept': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
  }
  return res;
}

export async function apiPut(path: string, body: any) {
  const csrfToken = await getCsrf();
  let res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'csrf-token': csrfToken, 'x-csrf-token': csrfToken, 'Accept': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (res.status === 401 && await tryRefreshAuth()) {
    const csrf2 = await getCsrf();
    res = await fetch(`${BASE}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'csrf-token': csrf2, 'x-csrf-token': csrf2, 'Accept': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
  }
  return res;
}

export async function apiDelete(path: string) {
  const csrfToken = await getCsrf();
  let res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'csrf-token': csrfToken, 'x-csrf-token': csrfToken, 'Accept': 'application/json' },
  });
  if (res.status === 401 && await tryRefreshAuth()) {
    const csrf2 = await getCsrf();
    res = await fetch(`${BASE}${path}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'csrf-token': csrf2, 'x-csrf-token': csrf2, 'Accept': 'application/json' },
    });
  }
  return res;
}

export async function apiGet(path: string) {
  let res = await fetch(`${BASE}${path}`, { credentials: 'include', cache: 'no-store' });
  if (res.status === 401 && await tryRefreshAuth()) {
    res = await fetch(`${BASE}${path}`, { credentials: 'include', cache: 'no-store' });
  }
  return res;
}

