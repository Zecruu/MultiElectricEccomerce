"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

export default function IntegrationsTab(){
  const [data, setData] = useState<any>(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load(){ const r = await apiGet('/api/settings/integrations'); if(r.ok) setData(await r.json()); }
  useEffect(()=>{ load(); },[]);

  async function save(){ if(!dirty) return; const r = await apiPatch('/api/settings/integrations', data); setMsg(r.ok? 'Saved' : 'Error'); if(r.ok) setDirty(false); }
  async function health(){ const r = await apiPost('/api/settings/integrations/healthcheck', {}); setMsg(r.ok? 'Health checked' : 'Health check failed'); if(r.ok) load(); }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded p-4 space-y-3">
      {!data ? <p className="text-white/70">Loading...</p> : (
        <>
          {msg && <p className="text-green-400 text-sm">{msg}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-neutral-950 border border-neutral-800 rounded p-3">
              <h4 className="font-medium">Payments (Stripe)</h4>
              <p className="text-white/60 text-sm">Connected: {String(!!data.stripe?.connected)}</p>
              <label className="text-sm text-white/70 block mt-2">Account ID
                <input value={data.stripe?.account||''} onChange={e=>{ setData({ ...data, stripe:{ ...(data.stripe||{}), account: e.target.value } }); setDirty(true);} } className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded p-3">
              <h4 className="font-medium">Email (SMTP)</h4>
              <p className="text-white/60 text-sm">Connected: {String(!!data.email?.connected)}</p>
              <p className="text-white/60 text-xs">Last check: {data.email?.lastCheck? new Date(data.email.lastCheck).toLocaleString() : '-'}</p>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded p-3">
              <h4 className="font-medium">Storage (S3)</h4>
              <p className="text-white/60 text-sm">Connected: {String(!!data.storage?.connected)}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={health} className="px-3 py-2 rounded border border-neutral-800 bg-neutral-900 text-sm">Re-check health</button>
            <button onClick={save} disabled={!dirty} className={`px-3 py-2 rounded border text-sm ${(!dirty)? 'border-neutral-800 bg-neutral-800 text-white/50' : 'border-sky-700 bg-sky-700/30 hover:bg-sky-700/40'}`}>Save</button>
          </div>
        </>
      )}
    </div>
  );
}

