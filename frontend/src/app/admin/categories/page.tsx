"use client";
import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

export default function AdminCategoriesPage(){
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any|null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  async function load(){
    setLoading(true);
    try{
      const res = await apiGet('/api/categories');
      if (res.ok){
        const data = await res.json();
        setItems(data.items||[]);
      } else setItems([]);
    } finally { setLoading(false); }
  }
  useEffect(()=>{ load(); },[]);

  const filtered = useMemo(()=> items.filter((c:any)=> !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.description||'').toLowerCase().includes(q.toLowerCase())), [items,q]);

  function openCreate(){ setEditing(null); setName(''); setDescription(''); setModalOpen(true); }
  function openEdit(c:any){ setEditing(c); setName(c.name||''); setDescription(c.description||''); setModalOpen(true); }

  async function save(){
    if (!name.trim()) return alert('Name is required');
    if (editing){
      const res = await apiPatch(`/api/categories/${editing._id}`, { name: name.trim(), description });
      if (res.ok) { setModalOpen(false); load(); }
      else alert('Update failed');
    } else {
      const res = await apiPost('/api/categories', { name: name.trim(), description });
      if (res.ok) { setModalOpen(false); load(); }
      else alert('Create failed');
    }
  }

  const [confirm, setConfirm] = useState<{open:boolean; cat:any|null; action:'reassign'|'delete'|null; to:string}>({open:false, cat:null, action:null, to:''});

  async function askDelete(c:any){
    // Fetch usage
    try{
      const res = await apiGet(`/api/categories/${c._id}/usage`);
      const usage = res.ok ? await res.json() : { products: c.productCount||0 };
      setConfirm({ open:true, cat: { ...c, products: usage.products||0 }, action:null, to:'' });
    }catch{ setConfirm({ open:true, cat: { ...c, products: c.productCount||0 }, action:null, to:'' }); }
  }

  async function doDelete(){
    if (!confirm.cat) return;
    if ((confirm.cat.products||0) > 0){
      if (confirm.action === 'delete'){
        if (!confirm('Really delete ALL products in this category?')) return;
      } else if (confirm.action === 'reassign'){
        if (!confirm.to) return alert('Select a target category');
      } else { return alert('Choose how to handle existing products'); }
    }
    const body:any = {};
    if (confirm.action) body.action = confirm.action;
    if (confirm.action==='reassign') body.to = confirm.to;
    const res = await apiDelete(`/api/categories/${confirm.cat._id}`, body);
    if (res.ok){ setConfirm({ open:false, cat:null, action:null, to:'' }); load(); }
    else alert('Delete failed');
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-white/50 text-sm">Manage product categories</p>
        </div>
        <div className="flex items-center gap-2">
          <input value={q} onChange={e=> setQ(e.target.value)} placeholder="Search categories..." className="px-3 py-2 rounded bg-neutral-950 border border-neutral-700 text-white"/>
          <button onClick={openCreate} className="px-3 py-2 rounded border border-neutral-700 hover:bg-neutral-800">+ New</button>
        </div>
      </div>

      {loading ? (
        <div className="text-white/60">Loading...</div>
      ) : (
        <div className="overflow-x-auto bg-neutral-900 border border-neutral-800 rounded">
          <table className="w-full text-sm">
            <thead className="text-left text-white/60">
              <tr className="border-b border-neutral-800">
                <th className="py-3 px-3">Name</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3">Products</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c=> (
                <tr key={c._id} className="border-t border-neutral-800 hover:bg-neutral-800/40">
                  <td className="py-3 px-3">{c.name}</td>
                  <td className="py-3 px-3 text-white/70">{c.description||'-'}</td>
                  <td className="py-3 px-3">{c.productCount ?? '-'}</td>
                  <td className="py-3 px-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={()=> openEdit(c)} className="px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-800">Edit</button>
                      <button onClick={()=> askDelete(c)} className="px-2 py-1 rounded border border-red-800 text-red-200 hover:bg-red-900/30">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={()=> setModalOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">{editing? 'Edit Category':'New Category'}</div>
                <button onClick={()=> setModalOpen(false)} className="px-2 py-1 rounded border border-neutral-700">Close</button>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-white/60 text-xs mb-1">Name</div>
                  <input value={name} onChange={e=> setName(e.target.value)} className="w-full px-3 py-2 rounded bg-neutral-950 border border-neutral-700"/>
                </div>
                <div>
                  <div className="text-white/60 text-xs mb-1">Description (optional)</div>
                  <textarea value={description} onChange={e=> setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 rounded bg-neutral-950 border border-neutral-700"/>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={()=> setModalOpen(false)} className="px-3 py-1.5 rounded border border-neutral-700">Cancel</button>
                <button onClick={save} className="px-3 py-1.5 rounded border border-sky-700 bg-sky-900/30 hover:bg-sky-900/50">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirm.open && confirm.cat && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={()=> setConfirm({ open:false, cat:null, action:null, to:'' })} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded p-4 space-y-3">
              <div className="font-semibold">Delete category</div>
              <div className="text-white/70 text-sm">This category currently has <span className="text-white">{confirm.cat.products||0}</span> product(s).</div>
              {(confirm.cat.products||0) > 0 ? (
                <div className="space-y-2">
                  <label className="block">
                    <input type="radio" name="delopt" onChange={()=> setConfirm(p=> ({...p, action:'reassign'}))} checked={confirm.action==='reassign'} />
                    <span className="ml-2">Reassign all products to another category</span>
                  </label>
                  {confirm.action==='reassign' && (
                    <select value={confirm.to} onChange={e=> setConfirm(p=> ({...p, to: e.target.value}))} className="w-full px-3 py-2 rounded bg-neutral-950 border border-neutral-700 text-white">
                      <option value="">Select category...</option>
                      {items.filter(i=> i._id!==confirm.cat._id).map((i:any)=> (
                        <option key={i._id} value={i._id}>{i.name}</option>
                      ))}
                    </select>
                  )}
                  <label className="block">
                    <input type="radio" name="delopt" onChange={()=> setConfirm(p=> ({...p, action:'delete'}))} checked={confirm.action==='delete'} />
                    <span className="ml-2 text-red-300">Delete ALL products in this category</span>
                  </label>
                </div>
              ) : (
                <div className="text-white/70 text-sm">No products are assigned. This category can be deleted.</div>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={()=> setConfirm({ open:false, cat:null, action:null, to:'' })} className="px-3 py-1.5 rounded border border-neutral-700">Cancel</button>
                <button onClick={doDelete} className="px-3 py-1.5 rounded border border-red-800 text-red-200 hover:bg-red-900/30">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

