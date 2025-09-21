"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";

export default function StoreInfoTab({ canEdit }: { canEdit: boolean }){
  const [data, setData] = useState<any>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(()=>{ (async()=>{
    const res = await apiGet('/api/settings/store');
    if (res.ok){ setData(await res.json()); setDirty(false); }
  })(); },[]);

  async function save(){
    if (!canEdit || !dirty || !data) return;
    setSaving(true); setMsg(null);
    const res = await apiPatch('/api/settings/store', data);
    const json = res.ok ? await res.json() : await res.json().catch(()=>({error:'Error'}));
    setSaving(false);
    if (res.ok){ setData(json); setDirty(false); setMsg('Saved'); }
    else setMsg(json.error||'Error');
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded p-4">
      {!data ? <p className="text-white/70">Loading...</p> : (
        <div className="space-y-3">
          {msg && <p className="text-green-400 text-sm">{msg}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm text-white/70">Store name
              <input value={data.storeName||''} onChange={e=>{ setData({...data, storeName:e.target.value}); setDirty(true); }} className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm" disabled={!canEdit} />
            </label>
            <label className="text-sm text-white/70">Legal name
              <input value={data.legalName||''} onChange={e=>{ setData({...data, legalName:e.target.value}); setDirty(true); }} className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm" disabled={!canEdit} />
            </label>
            <label className="text-sm text-white/70">Support email
              <input value={(data.emails?.[0]||'')} onChange={e=>{ setData({...data, emails:[e.target.value]}); setDirty(true); }} className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm" disabled={!canEdit} />
            </label>
            <label className="text-sm text-white/70">Phone
              <input value={(data.phones?.[0]||'')} onChange={e=>{ setData({...data, phones:[e.target.value]}); setDirty(true); }} className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm" disabled={!canEdit} />
            </label>
          </div>
          <label className="text-sm text-white/70 block">Pickup instructions
            <textarea value={data.pickupInstructions||''} onChange={e=>{ setData({...data, pickupInstructions:e.target.value}); setDirty(true); }} className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm h-28" disabled={!canEdit} />
          </label>
          <label className="text-sm text-white/70 block">Return policy
            <textarea value={data.returnPolicy||''} onChange={e=>{ setData({...data, returnPolicy:e.target.value}); setDirty(true); }} className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm h-28" disabled={!canEdit} />
          </label>
          <div className="flex gap-2 justify-end">
            <button onClick={()=>{ setDirty(false); (async()=>{ const r=await apiGet('/api/settings/store'); if(r.ok) setData(await r.json()); })(); }} className="px-3 py-2 rounded border border-neutral-800 bg-neutral-900 text-sm">Cancel</button>
            <button onClick={save} disabled={!canEdit || !dirty || saving} className={`px-3 py-2 rounded border text-sm ${(!canEdit || !dirty || saving)? 'border-neutral-800 bg-neutral-800 text-white/50' : 'border-sky-700 bg-sky-700/30 hover:bg-sky-700/40'}`}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

