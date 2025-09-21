"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/api";

const COMPLETED = ["ready_for_pickup","picked_up","refunded"] as const;

type CompletedStatus = typeof COMPLETED[number];
function Chip({ children, tone='default' }:{ children: React.ReactNode, tone?: 'default'|'green'|'blue'|'amber'|'purple'}){
  const map:any = {
    default: 'bg-neutral-800 text-white/80 border-neutral-700',
    green: 'bg-green-900/30 text-green-200 border-green-700',
    blue: 'bg-sky-900/30 text-sky-200 border-sky-700',
    amber: 'bg-amber-900/30 text-amber-200 border-amber-700',
    purple: 'bg-purple-900/30 text-purple-200 border-purple-700',
  };
  return <span className={`px-2.5 py-1 rounded-full border text-xs font-medium ${map[tone]}`}>{children}</span>
}

export default function FulfillmentPage(){
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<""|CompletedStatus>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const sp = useSearchParams();

  useEffect(()=>{ const initial=sp.get('q')||""; if(initial) setQ(initial); },[sp]);

  useEffect(()=>{
    let active = true;
    (async()=>{
      try{
        const url = `/api/orders?completed=1&q=${encodeURIComponent(q)}&status=${status}&from=${from}&to=${to}`;
        const res = await apiGet(url);
        if (!active) return;
        if (res.ok){
          const data = await res.json();
          const only = (data.orders||[]).filter((o:any)=> COMPLETED.includes(o.status));
          setRows(only);
        }else{
          // fallback demo data (completed only)
          const now = Date.now();
          const sample = [
            { id:'o1', number:'MES-1A2B3C', customer:'John Smith', total:195.8, items:3, status:'picked_up', deliveredAt:new Date(now-2*86400e3).toISOString(), payment:'paid' },
            { id:'o2', number:'MES-3D4E5F', customer:'Michael Overturn', total:42.0, items:1, status:'ready_for_pickup', deliveredAt:null, payment:'paid' },
            { id:'o3', number:'MES-6G7H8I', customer:'Sarah Johnson', total:324.5, items:5, status:'picked_up', deliveredAt:new Date(now-5*86400e3).toISOString(), payment:'paid' },
          ];
          setRows(sample as any);
        }
      }catch{
        setRows([]);
      }
    })();
    return ()=>{ active = false };
  },[q,status,from,to]);

  const filtered = useMemo(()=> rows.filter((r)=> !status || r.status===status),[rows,status]);
  const totalDelivered = useMemo(()=> rows.filter(r=> r.status==='picked_up').length, [rows]);
  const readyCount = useMemo(()=> rows.filter(r=> r.status==='ready_for_pickup').length, [rows]);
  const thisWeek = useMemo(()=>{
    const start = new Date(); start.setDate(start.getDate()-7);
    return rows.filter(r=> r.deliveredAt && new Date(r.deliveredAt) >= start).length;
  },[rows]);
  const revenue = useMemo(()=> rows.reduce((sum,r)=> sum + (r.status==='picked_up'? Number(r.total||0):0),0),[rows]);
  const fmt = useMemo(()=> new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}),[]);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(()=>{ if(page>totalPages) setPage(totalPages); },[totalPages]);
  const paged = useMemo(()=> filtered.slice((page-1)*pageSize, page*pageSize),[filtered,page]);

  // Quick view drawer
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any|null>(null);
  const openView = (r:any)=>{ setSelected(r); setOpen(true); };

  // CSV export
  function exportCSV(){
    const cols = ["number","customer","total","items","status","deliveredAt","payment"];
    const lines = [cols.join(',')].concat(
      filtered.map((r:any)=> cols.map(c=> JSON.stringify((r as any)[c]??'')).join(','))
    );
    const blob = new Blob([lines.join('\n')],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='completed-orders.csv'; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Fulfillment</h1>
          <p className="text-white/50 text-sm">View fulfillment workspace (deliverables)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-3 py-1.5 rounded border border-neutral-700 hover:bg-neutral-800 text-sm">Export CSV</button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
          <div className="text-white/60 text-xs">Total Delivered</div>
          <div className="text-2xl font-semibold">{totalDelivered}</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
          <div className="text-white/60 text-xs">Ready for Pickup</div>
          <div className="text-2xl font-semibold">{readyCount}</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
          <div className="text-white/60 text-xs">This Week</div>
          <div className="text-2xl font-semibold">{thisWeek}</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
          <div className="text-white/60 text-xs">Total Revenue</div>
          <div className="text-2xl font-semibold">{fmt.format(revenue)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 mb-4 grid grid-cols-1 md:grid-cols-5 gap-2">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search completed orders..." className="md:col-span-2 px-3 py-2 rounded bg-neutral-950 border border-neutral-700 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-600"/>
        <select value={status} onChange={e=>setStatus(e.target.value as any)} className="px-3 py-2 rounded bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-600">
          <option value="">All Completed</option>
          <option value="ready_for_pickup">Ready for Pickup</option>
          <option value="picked_up">Delivered</option>
          <option value="refunded">Refunded</option>
        </select>
        <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="px-3 py-2 rounded bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-600"/>
        <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="px-3 py-2 rounded bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-600"/>
      </div>

      {/* Table (no Shipping column) */}
      <div className="overflow-x-auto bg-neutral-900 border border-neutral-800 rounded-lg">
        <table className="w-full text-sm">
          <thead className="text-left text-white/60">
            <tr className="border-b border-neutral-800">
              <th className="py-3 px-3 w-[12rem]">Order #</th>
              <th className="py-3 px-3">Customer</th>
              <th className="py-3 px-3 w-[8rem]">Total</th>
              <th className="py-3 px-3 w-[10rem]">Items</th>
              <th className="py-3 px-3 w-[10rem]">Status</th>
              <th className="py-3 px-3 w-[16rem]">Delivered</th>
              <th className="py-3 px-3 w-[8rem]">Payment</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r:any)=> (
              <tr key={r.id} className="border-t border-neutral-800 hover:bg-neutral-800/40">
                <td className="py-3 px-3 font-medium text-sky-300">
                  <button onClick={()=> openView(r)} className="hover:underline">{r.number}</button>
                </td>
                <td className="py-3 px-3">{r.customer}</td>
                <td className="py-3 px-3">{fmt.format(Number(r.total||0))}</td>
                <td className="py-3 px-3">{r.items || 0} items</td>
                <td className="py-3 px-3">{r.status==='picked_up' ? <Chip tone='green'>Delivered</Chip> : r.status==='ready_for_pickup' ? <Chip tone='blue'>Ready for Pickup</Chip> : <Chip tone='purple'>Refunded</Chip>}</td>
                <td className="py-3 px-3 whitespace-nowrap">{r.deliveredAt ? new Date(r.deliveredAt).toLocaleString() : '-'}</td>
                <td className="py-3 px-3">{r.payment==='paid' ? <Chip tone='green'>Paid</Chip> : <Chip>Unpaid</Chip>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-white/60">
        <span>Showing {paged.length} of {filtered.length} completed orders (page {page} of {totalPages})</span>
        <div className="flex gap-1">
          <button onClick={()=> setPage(p=> Math.max(1,p-1))} disabled={page<=1} className="px-2 py-1 rounded border border-neutral-700 disabled:opacity-40">Previous</button>
          <span className="px-2 py-1">{page}</span>
          <button onClick={()=> setPage(p=> Math.min(totalPages,p+1))} disabled={page>=totalPages} className="px-2 py-1 rounded border border-neutral-700 disabled:opacity-40">Next</button>
        </div>
      </div>

      {open && selected && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={()=> setOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-neutral-900 border-l border-neutral-800 z-50 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Order {selected.number}</h3>
              <button onClick={()=> setOpen(false)} className="px-2 py-1 rounded border border-neutral-700">Close</button>
            </div>
            <div className="space-y-2 text-sm">
              <div><span className="text-white/60">Customer:</span> {selected.customer}</div>
              <div><span className="text-white/60">Total:</span> {fmt.format(Number(selected.total||0))}</div>
              <div><span className="text-white/60">Items:</span> {selected.items}</div>
              <div className="flex items-center gap-2"><span className="text-white/60">Status:</span> {selected.status==='picked_up' ? <Chip tone='green'>Delivered</Chip> : selected.status==='ready_for_pickup' ? <Chip tone='blue'>Ready for Pickup</Chip> : <Chip tone='purple'>Refunded</Chip>}</div>
              <div><span className="text-white/60">Delivered:</span> {selected.deliveredAt ? new Date(selected.deliveredAt).toLocaleString() : '-'}</div>
              <div className="flex items-center gap-2"><span className="text-white/60">Payment:</span> {selected.payment==='paid' ? <Chip tone='green'>Paid</Chip> : <Chip>Unpaid</Chip>}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

