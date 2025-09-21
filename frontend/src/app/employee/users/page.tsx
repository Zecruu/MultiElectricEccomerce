"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

export default function UsersPage(){
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any|null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'employee', password: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{type:'success'|'error', text:string}|null>(null);

  useEffect(()=>{
    (async()=>{
      const res = await apiGet("/api/users");
      if (!res.ok){
        const data = await res.json().catch(()=>({}));
        setError(data.error || "Forbidden");
      } else {
        const data = await res.json();
        setRows(data.users || []);
      }
      setLoading(false);
    })();
  },[]);

  if (loading) return <p className="text-white/70">Loading...</p>;
  if (error) return <p className="text-white/80">{error}</p>;

  async function refresh(){
    const res = await apiGet("/api/users");
    if (res.ok){
      const d = await res.json();
      setRows(d.users || []);
    }
  }

  function openNew(){
    setEditing(null);
    setForm({ name:'', email:'', role:'employee', password:'' });
    setModalOpen(true);
  }
  function openEdit(u:any){
    setEditing(u);
    setForm({ name: u.name||'', email: u.email||'', role: (u.role||'employee'), password:'' });
    setModalOpen(true);
  }
  function validateEmail(str:string){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str); }
  async function saveUser(){
    if (!form.name.trim()){ setToast({type:'error', text:'Name is required'}); return; }
    if (!validateEmail(form.email)){ setToast({type:'error', text:'Valid email is required'}); return; }
    if (!['customer','employee','admin'].includes(form.role)){ setToast({type:'error', text:'Role must be customer, employee, or admin'}); return; }
    if (!editing && (!form.password || form.password.length<8)){ setToast({type:'error', text:'Password must be at least 8 characters'}); return; }
    if (editing && form.password && form.password.length<8){ setToast({type:'error', text:'Password must be at least 8 characters'}); return; }
    setSaving(true);
    try{
      if (!editing){
        const res = await apiPost('/api/users', { name: form.name.trim(), email: form.email.trim(), role: form.role, password: form.password });
        if (!res.ok) throw new Error('create');
        setToast({type:'success', text:'User created'});
      } else {
        let ok = true;
        try {
          const res = await apiPatch(`/api/users/${editing._id}`, { name: form.name.trim(), email: form.email.trim(), role: form.role });
          if (!res.ok) ok = false;
        } catch {}
        if (editing.role !== form.role){
          const r = await apiPatch(`/api/users/${editing._id}/role`, { role: form.role });
          if (!r.ok) ok = false;
        }
        if (form.password){
          const r2 = await apiPost(`/api/users/${editing._id}/reset-password`, { password: form.password });
          if (!r2.ok) ok = false;
        }
        if (!ok) throw new Error('edit');
        setToast({type:'success', text:'User updated'});
      }
      setModalOpen(false);
      await refresh();
    } catch {
      setToast({type:'error', text:'Save failed'});
    } finally {
      setSaving(false);
    }
  }

  function onCreate(){
    openNew();
  }

  async function onSetRole(id:string){
    const role = (prompt("Set role to (customer/employee/admin)", "employee") || "").toLowerCase();
    if(!role) return;
    const res = await apiPatch(`/api/users/${id}/role`, { role });
    if (!res.ok){ alert("Failed to set role"); return; }
    await refresh();
  }

  async function onResetPassword(id:string){
    const password = prompt("New password (min 8 chars)"); if(!password) return;
    const res = await apiPost(`/api/users/${id}/reset-password`, { password });
    if (!res.ok){ alert("Failed to reset password"); return; }
    alert("Password reset");
  }

  async function onDelete(id:string){
    if(!confirm("Delete this user?")) return;
    const res = await apiDelete(`/api/users/${id}`);
    if (!res.ok){ alert("Delete failed"); return; }
    await refresh();
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users (Admin)</h1>
        <button onClick={onCreate} className="px-3 py-1.5 rounded border border-neutral-700 hover:bg-neutral-800 text-sm">+ New User</button>
      </div>
      <div className="overflow-x-auto bg-neutral-900 border border-neutral-800 rounded-lg">
        <table className="w-full text-sm">
          <thead className="text-left text-white/60">
            <tr className="border-b border-neutral-800">
              <th className="py-2 px-3">Name</th>
              <th className="py-2 px-3">Email</th>
              <th className="py-2 px-3">Role</th>
              <th className="py-2 px-3">Verified</th>
              <th className="py-2 px-3 text-right w-64">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=> (
              <tr key={r._id} className="border-t border-neutral-800">
                <td className="py-2 px-3">{r.name}</td>
                <td className="py-2 px-3">{r.email}</td>
                <td className="py-2 px-3">{r.role}</td>
                <td className="py-2 px-3">{r.emailVerified ? "Yes" : "No"}</td>
                <td className="py-2 px-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={()=>openEdit(r)} className="px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-800">Edit</button>
                    <button onClick={()=>onDelete(r._id)} className="px-2 py-1 rounded border border-red-800 text-red-200 hover:bg-red-900/30">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={()=> !saving && setModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">{editing ? 'Edit User' : 'New User'}</h3>
                <button onClick={()=> !saving && setModalOpen(false)} className="px-2 py-1 rounded border border-neutral-700">Close</button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1">Name</label>
                  <input value={form.name} onChange={e=> setForm(p=> ({...p, name: e.target.value}))} className="w-full px-3 py-2 rounded bg-neutral-950 border border-neutral-700 focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e=> setForm(p=> ({...p, email: e.target.value}))} className="w-full px-3 py-2 rounded bg-neutral-950 border border-neutral-700 focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Role</label>
                  <select value={form.role} onChange={e=> setForm(p=> ({...p, role: e.target.value}))} className="w-full px-3 py-2 rounded bg-neutral-950 border border-neutral-700 focus:outline-none">
                    {editing && <option value="customer">customer</option>}
                    <option value="employee">employee</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">{editing ? 'New Password (optional)' : 'Password'}</label>
                  <input type="password" value={form.password} onChange={e=> setForm(p=> ({...p, password: e.target.value}))} placeholder={editing ? 'Leave blank to keep current' : ''} className="w-full px-3 py-2 rounded bg-neutral-950 border border-neutral-700 focus:outline-none"/>
                  {editing && <p className="text-[11px] text-white/50 mt-1">Leave blank to keep the current password.</p>}
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={()=> !saving && setModalOpen(false)} className="px-3 py-1.5 rounded border border-neutral-700">Cancel</button>
                <button onClick={saveUser} disabled={saving} className="px-3 py-1.5 rounded border border-sky-700 bg-sky-900/30 hover:bg-sky-900/50">{editing ? 'Save Changes' : 'Create User'}</button>
              </div>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded border text-sm shadow-lg ${toast.type==='success' ? 'bg-emerald-900/50 border-emerald-700 text-emerald-100' : 'bg-rose-900/50 border-rose-700 text-rose-100'}`} onAnimationEnd={()=> setTimeout(()=> setToast(null), 2500)}>
          {toast.text}
        </div>
      )}

    </div>
  );
}

