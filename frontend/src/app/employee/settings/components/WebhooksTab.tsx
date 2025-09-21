"use client";
import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

type Hook = { id:string; name:string; url:string; secret:string; events:string[]; status:string; lastDelivery:string|null };
const ALL_EVENTS = ['order.paid','order.ready','order.picked_up','inventory.low','user.password_reset'];

export default function WebhooksTab(){
  const [endpoints, setEndpoints] = useState<Hook[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [modal, setModal] = useState<{open:boolean; editing:Hook|null}>({open:false, editing:null});
  const [form, setForm] = useState<Partial<Hook>>({ name:'', url:'', events: [] });
  const [msg, setMsg] = useState<string | null>(null);

  async function load(){
    const res = await apiGet('/api/settings/webhooks');
    if (res.ok){ const json = await res.json(); setEndpoints(json.endpoints||[]); setDeliveries(json.deliveries||[]); }
  }
  useEffect(()=>{ load(); },[]);

  function openNew(){ setForm({ name:'', url:'', events: [] }); setModal({open:true, editing:null}); }
  function openEdit(h:Hook){ setForm({ ...h }); setModal({open:true, editing:h}); }
  function close(){ setModal({open:false, editing:null}); }

  async function save(){
    if (!form.url || !/^https?:\/\//i.test(form.url)) { setMsg('URL must be HTTPS/HTTP'); return; }
    setMsg(null);
    if (modal.editing){
      const res = await apiPatch(`/api/settings/webhooks/${modal.editing.id}`, form);
      if (res.ok){ await load(); close(); }
      else setMsg('Failed to update');
    } else {
      const res = await apiPost('/api/settings/webhooks', form);
      if (res.ok){ await load(); close(); }
      else setMsg('Failed to create');
    }
  }

  async function remove(id:string){ if (!confirm('Delete endpoint?')) return; const r = await apiDelete(`/api/settings/webhooks/${id}`); if (r.ok) load(); }
  async function replay(id:string){ const r = await apiPost(`/api/settings/webhooks/${id}/replay`, {}); if (r.ok) load(); }

  function toggleEvent(ev:string){
    const cur = new Set(form.events||[]);
    if (cur.has(ev)) cur.delete(ev); else cur.add(ev);
    setForm({ ...form, events: Array.from(cur) });
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded p-3 xl:col-span-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Endpoints</h3>
          <button onClick={openNew} className="px-3 py-1.5 rounded border border-neutral-800 bg-neutral-900 text-sm hover:bg-neutral-800">Add endpoint</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-white/60">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">URL</th>
                <th className="py-2">Events</th>
                <th className="py-2">Status</th>
                <th className="py-2">Last</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map(h=> (
                <tr key={h.id} className="border-t border-neutral-800">
                  <td className="py-2">{h.name}</td>
                  <td className="py-2 text-white/70 truncate max-w-[280px]">{h.url}</td>
                  <td className="py-2 text-white/70">{h.events?.join(', ')||'-'}</td>
                  <td className="py-2 text-white/70">{h.status}</td>
                  <td className="py-2 text-white/70">{h.lastDelivery? new Date(h.lastDelivery).toLocaleString() : '-'}</td>
                  <td className="py-2 text-right space-x-2">
                    <button onClick={()=> openEdit(h)} className="px-2 py-1 rounded border border-neutral-800 bg-neutral-900 text-xs">Edit</button>
                    <button onClick={()=> replay(h.id)} className="px-2 py-1 rounded border border-neutral-800 bg-neutral-900 text-xs">Replay</button>
                    <button onClick={()=> remove(h.id)} className="px-2 py-1 rounded border border-red-900 bg-red-900/20 text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded p-3">
        <h3 className="font-medium mb-2">Recent deliveries</h3>
        <div className="space-y-2 max-h-80 overflow-auto pr-1">
          {deliveries.length? deliveries.map(d=> (
            <div key={d.id} className="text-xs text-white/70 bg-neutral-800/60 rounded px-2 py-1">
              <div className="flex justify-between"><span>{d.event}</span><span>{d.status}</span></div>
              <div className="flex justify-between"><span>{d.latencyMs} ms</span><span>{new Date(d.createdAt).toLocaleString()}</span></div>
            </div>
          )) : <p className="text-white/60 text-sm">No deliveries yet</p>}
        </div>
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded p-4 w-full max-w-xl">
            <h3 className="font-medium mb-2">{modal.editing? 'Edit endpoint' : 'Add endpoint'}</h3>
            {msg && <p className="text-red-400 text-sm mb-2">{msg}</p>}
            <label className="text-sm text-white/70 block mb-2">Name
              <input value={form.name||''} onChange={e=> setForm({ ...form, name: e.target.value })} className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-white/70 block mb-2">URL (HTTPS)
              <input value={form.url||''} onChange={e=> setForm({ ...form, url: e.target.value })} className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm" />
            </label>
            <div className="text-sm text-white/70 mb-2">Events</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              {ALL_EVENTS.map(ev=> (
                <label key={ev} className="text-sm text-white/70 inline-flex items-center gap-2">
                  <input type="checkbox" checked={(form.events||[]).includes(ev)} onChange={()=> toggleEvent(ev)} /> {ev}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={close} className="px-3 py-1.5 rounded border border-neutral-800 bg-neutral-900 text-sm">Cancel</button>
              <button onClick={save} className="px-3 py-1.5 rounded border border-sky-700 bg-sky-700/30 text-sm hover:bg-sky-700/40">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

