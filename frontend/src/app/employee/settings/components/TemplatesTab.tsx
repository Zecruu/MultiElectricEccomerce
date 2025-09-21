"use client";
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

type Tpl = { key:string; name:string; subject:{en:string; es:string}; body:{en:string; es:string}; versions:any[] };

export default function TemplatesTab(){
  const [items, setItems] = useState<Tpl[]>([]);
  const [sel, setSel] = useState<string>("");
  const [tpl, setTpl] = useState<Tpl | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [lang, setLang] = useState<'en'|'es'>('en');

  useEffect(()=>{ (async()=>{
    const res = await apiGet('/api/settings/templates');
    if (res.ok){ const list = await res.json(); setItems(list); if(list.length) setSel(list[0].key); }
  })(); },[]);

  useEffect(()=>{
    if (!sel) return; const t = items.find(i=>i.key===sel) || null; setTpl(t ? JSON.parse(JSON.stringify(t)) : null);
  }, [sel, items]);

  const preview = useMemo(()=>{
    const vars: Record<string,string> = { orderNumber:'MES-123456', customerName:'John Smith', pickupCode:'ABCD', total:'$123.45', status:'ready' };
    const subject = tpl ? (tpl.subject[lang]||'').replace(/{{(.*?)}}/g,(_,k)=> vars[k.trim()]||'') : '';
    const body = tpl ? (tpl.body[lang]||'').replace(/{{(.*?)}}/g,(_,k)=> vars[k.trim()]||'') : '';
    return { subject, body };
  }, [tpl, lang]);

  async function save(){
    if (!tpl) return; setSaving(true); setMsg(null);
    const res = await apiPatch(`/api/settings/templates/${tpl.key}`, { subject: tpl.subject, body: tpl.body });
    const ok = res.ok; const list = await (await apiGet('/api/settings/templates')).json();
    setItems(list); setSaving(false); setMsg(ok? 'Saved' : 'Error');
  }

  async function sendTest(){
    if (!tpl) return; setMsg(null);
    const res = await apiPost(`/api/settings/templates/${tpl.key}/test`, {});
    setMsg(res.ok? 'Test sent' : 'Failed to send test');
  }

  function restoreVersion(v:any){
    if (!tpl) return; setTpl({ ...tpl, subject: v.subject, body: v.body }); setMsg('Version restored (remember to Save)');
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded p-3">
        <h3 className="font-medium mb-2">Templates</h3>
        <ul>
          {items.map(i=> (
            <li key={i.key}>
              <button onClick={()=> setSel(i.key)} className={`w-full text-left px-2 py-1 rounded text-sm ${sel===i.key? 'bg-sky-900/30 text-white' : 'text-white/70 hover:bg-neutral-800'}`}>{i.name}</button>
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <h4 className="text-sm text-white/70 mb-1">Versions</h4>
          <div className="space-y-1 max-h-40 overflow-auto pr-1">
            {tpl?.versions?.length? tpl.versions.map((v,i)=> (
              <div key={i} className="flex items-center justify-between text-xs text-white/70 bg-neutral-800/60 rounded px-2 py-1">
                <span>{new Date(v.at||Date.now()).toLocaleString()}</span>
                <button onClick={()=> restoreVersion(v)} className="text-sky-400 hover:text-sky-300">Restore</button>
              </div>
            )) : <p className="text-xs text-white/50">No previous versions</p>}
          </div>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded p-3 lg:col-span-2">
        {!tpl ? <p className="text-white/70">Select a template</p> : (
          <div className="space-y-2">
            {msg && <p className="text-green-400 text-sm">{msg}</p>}
            <div className="flex items-center gap-2">
              <label className="text-sm text-white/60">Lang</label>
              <select value={lang} onChange={e=> setLang(e.target.value as any)} className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm">
                <option value="en">EN</option>
                <option value="es">ES</option>
              </select>
              <div className="flex-1" />
              <button onClick={sendTest} className="px-3 py-1.5 rounded border border-neutral-800 bg-neutral-900 text-sm hover:bg-neutral-800">Send test</button>
              <button onClick={save} disabled={saving} className={`px-3 py-1.5 rounded border text-sm ${saving? 'border-neutral-800 bg-neutral-800 text-white/50' : 'border-sky-700 bg-sky-700/30 hover:bg-sky-700/40'}`}>Save</button>
            </div>
            <label className="text-sm text-white/70 block">Subject ({lang.toUpperCase()})
              <input value={tpl.subject[lang]||''} onChange={e=> setTpl({ ...tpl, subject: { ...tpl.subject, [lang]: e.target.value } })} className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm" />
            </label>
            <label className="text-sm text-white/70 block">Body ({lang.toUpperCase()})
              <textarea value={tpl.body[lang]||''} onChange={e=> setTpl({ ...tpl, body: { ...tpl.body, [lang]: e.target.value } })} className="w-full mt-1 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm h-52" />
            </label>
            <div className="mt-3 border-t border-neutral-800 pt-3">
              <h4 className="font-medium mb-1">Live preview</h4>
              <p className="text-white/70 text-sm"><span className="text-white/50">Subject:</span> {preview.subject}</p>
              <div className="mt-2 bg-neutral-950 border border-neutral-800 rounded p-3 text-sm text-white/70 whitespace-pre-wrap">{preview.body}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

