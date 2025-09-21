"use client";
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

export default function ClientsPage(){
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);

  useEffect(()=>{
    const h = setTimeout(()=>{ setDebouncedQ(q); setPage(1); }, 300);
    return ()=> clearTimeout(h);
  }, [q]);

  async function load(){
    setLoading(true); setError(null);
    try{
      const qs = new URLSearchParams({ page: String(page), limit: '50' });
      if (debouncedQ.trim()) qs.set('q', debouncedQ.trim());
      const res = await apiGet(`/api/clients?${qs.toString()}`);
      if (!res.ok){ setError('Error'); setRows([]); }
      else {
        const data = await res.json();
        setRows(data.items || data.clients || []);
      }
    } finally { setLoading(false); }
  }

  useEffect(()=>{ load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, debouncedQ]);

  async function sendReset(id: string){
    if (!confirm("Send password reset to this customer?")) return;
    setMsg(null);
    const res = await apiPost(`/api/clients/${id}/send-reset`, {});
    const data = await res.json().catch(()=>({}));
    setMsg(res.ok ? "Reset email sent" : (data.error || "Error"));
  }

  const noResults = useMemo(()=> !loading && rows.length===0 && debouncedQ.trim().length>0, [loading, rows.length, debouncedQ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              value={q}
              onChange={e=> setQ(e.target.value)}
              placeholder={"Search clients (name, email)"}
              className="w-64 md:w-80 bg-neutral-900 border border-neutral-800 rounded pl-3 pr-7 py-1 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
            {q && (
              <button aria-label="Clear search" onClick={()=> setQ('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">×</button>
            )}
          </div>
          <button onClick={load} className="bg-neutral-800 hover:bg-neutral-700 rounded px-3 py-1 border border-black text-sm">Refresh</button>
        </div>
      </div>
      {msg && <p className="text-sm text-white/80 mb-3">{msg}</p>}
      {loading ? <p className="text-white/70">Loading...</p> : error ? (
        <p className="text-red-400">Failed to load</p>
      ) : noResults ? (
        <p className="text-white/70">No results found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-white/60">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Email</th>
                <th className="py-2">Verified</th>
                <th className="py-2">Last Login</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r=> (
                <tr key={r._id} className="border-t border-neutral-800">
                  <td className="py-2">{r.name}</td>
                  <td className="py-2">{r.email}</td>
                  <td className="py-2">{r.emailVerified ? "Yes" : "No"}</td>
                  <td className="py-2">{r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString() : "-"}</td>
                  <td className="py-2 text-right">
                    <button onClick={()=>sendReset(r._id)} className="bg-blue-600 hover:bg-blue-500 rounded px-3 py-1 border border-black">Send reset</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

