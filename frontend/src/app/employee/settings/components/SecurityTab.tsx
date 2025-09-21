"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

export default function SecurityTab(){
  const [data, setData] = useState<any>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(()=>{ (async()=>{ const r = await apiGet('/api/settings/security'); if(r.ok) setData(await r.json()); })(); },[]);

  async function save(){
    if (!dirty) return; setSaving(true); setMsg(null);
    const res = await apiPatch('/api/settings/security', data);
    const ok = res.ok; if (ok) setDirty(false); setSaving(false); setMsg(ok? 'Saved' : 'Error');
  }

  async function invalidate(){
    if (!confirm('Invalidate all employee sessions?')) return;
    // Use account revoke-all as a simple stand-in for now
    const r = await apiPost('/api/account/sessions/revoke-all', {});
    setMsg(r.ok? 'All sessions invalidated' : 'Failed');
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded p-4">
      {!data ? <p className="text-white/70">Loading...</p> : (
        <div className="space-y-3">
          {msg && <p className="text-green-400 text-sm">{msg}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="text-sm text-white/70">Min password length
              <input type="number" value={data.passwordPolicy?.minLength||8} onChange={e=>{ setData({ ...data, passwordPolicy:{ ...data.passwordPolicy, minLength: parseInt(e.target.value||'0',10) } }); setDirty(true);} } className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-white/70">Require symbol
              <input type="checkbox" checked={!!data.passwordPolicy?.requireSymbol} onChange={e=>{ setData({ ...data, passwordPolicy:{ ...data.passwordPolicy, requireSymbol: e.target.checked } }); setDirty(true);} } className="ml-2" />
            </label>
            <label className="text-sm text-white/70">Require number
              <input type="checkbox" checked={!!data.passwordPolicy?.requireNumber} onChange={e=>{ setData({ ...data, passwordPolicy:{ ...data.passwordPolicy, requireNumber: e.target.checked } }); setDirty(true);} } className="ml-2" />
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="text-sm text-white/70">Login attempts
              <input type="number" value={data.loginRateLimit?.attempts||10} onChange={e=>{ setData({ ...data, loginRateLimit:{ ...data.loginRateLimit, attempts: parseInt(e.target.value||'0',10) } }); setDirty(true);} } className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-white/70">Lockout window (min)
              <input type="number" value={data.loginRateLimit?.windowMinutes||15} onChange={e=>{ setData({ ...data, loginRateLimit:{ ...data.loginRateLimit, windowMinutes: parseInt(e.target.value||'0',10) } }); setDirty(true);} } className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="text-sm text-white/70">Access token lifetime (min)
              <input type="number" value={data.sessions?.accessMinutes||15} onChange={e=>{ setData({ ...data, sessions:{ ...data.sessions, accessMinutes: parseInt(e.target.value||'0',10) } }); setDirty(true);} } className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-white/70">Refresh lifetime (days)
              <input type="number" value={data.sessions?.refreshDays||14} onChange={e=>{ setData({ ...data, sessions:{ ...data.sessions, refreshDays: parseInt(e.target.value||'0',10) } }); setDirty(true);} } className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="flex justify-between items-center pt-2">
            <button onClick={invalidate} className="px-3 py-2 rounded border border-red-900 bg-red-900/20 text-sm">Invalidate all employee sessions</button>
            <button onClick={save} disabled={!dirty || saving} className={`px-3 py-2 rounded border text-sm ${(!dirty||saving)? 'border-neutral-800 bg-neutral-800 text-white/50' : 'border-sky-700 bg-sky-700/30 hover:bg-sky-700/40'}`}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

