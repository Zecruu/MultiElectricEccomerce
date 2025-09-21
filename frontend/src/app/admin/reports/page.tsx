"use client";
import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";

// Simple CSV exporter
function toCSV(rows: any[], headers?: string[]): string {
  if (!rows || rows.length===0) return "";
  const cols = headers || Array.from(new Set(rows.flatMap((r:any)=>Object.keys(r))));
  const escape = (v:any)=> '"'+String(v??'').replace(/"/g,'""')+'"';
  const lines = [cols.join(",")];
  for (const r of rows) lines.push(cols.map(c=>escape((r as any)[c])).join(","));
  return lines.join("\n");
}
function downloadCSV(filename: string, rows: any[], headers?: string[]) {
  const blob = new Blob([toCSV(rows, headers)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'custom', label: 'Custom' },
] as const;

type SalesRes = {
  kpis: { totalRevenue:number; totalOrders:number; avgOrderValue:number; activeCustomers:number; topProduct: any };
  series: { date:string; revenue:number; orders:number }[];
  orders: { items: any[]; page:number; limit:number; total:number; totalPages:number };
};

type InventoryRes = { lowStock:any[]; outOfStock:any[]; categoryPie:{category:string;stock:number}[]; totalProducts:number };

type CustomersRes = { newCustomers:number; returningCustomers:number; topCustomers:{ email:string; orders:number; value:number }[] };

export default function AdminReportsPage(){
  const [preset, setPreset] = useState<'today'|'7d'|'30d'|'custom'>('30d');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [category, setCategory] = useState('');
  const [employee, setEmployee] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [employees, setEmployees] = useState<{id:string; name:string; role:string}[]>([]);

  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<SalesRes|null>(null);
  const [inventory, setInventory] = useState<InventoryRes|null>(null);
  const [customers, setCustomers] = useState<CustomersRes|null>(null);

  // Compute date range
  const range = useMemo(()=>{
    const now = new Date();
    let fromD = new Date(now), toD = new Date(now);
    if (preset==='today') {
      // today
    } else if (preset==='7d') {
      fromD = new Date(now.getTime() - 6*24*60*60*1000);
    } else if (preset==='30d') {
      fromD = new Date(now.getTime() - 29*24*60*60*1000);
    } else if (preset==='custom') {
      fromD = from? new Date(from) : new Date(now.getTime()-29*24*60*60*1000);
      toD = to? new Date(to) : now;
    }
    const fmt = (d:Date)=> d.toISOString().slice(0,10);
    return { from: fmt(fromD), to: fmt(toD) };
  }, [preset, from, to]);

  // Load filter sources
  useEffect(()=>{
    let mounted = true;
    (async ()=>{
      try {
        // categories from products
        const res = await apiGet('/api/products?limit=1000');
        if (res.ok) {
          const data = await res.json();
          const cats = Array.from(new Set((data?.items||data?.products||[]).map((p:any)=>p.category))).filter(Boolean).sort();
          if (mounted) setCategories(cats);
        }
      } catch {}
      try {
        const res = await apiGet('/api/users'); // admin only
        if (res.ok){
          const data = await res.json();
          const emps = (data.users||[]).filter((u:any)=>u.role==='employee' || u.role==='admin').map((u:any)=>({ id: u._id || u.id, name: u.name || u.email, role: u.role }));
          if (mounted) setEmployees(emps);
        }
      } catch {}
    })();
    return ()=>{ mounted = false };
  },[]);

  async function loadAll(){
    setLoading(true);
    const qs = new URLSearchParams({ from: range.from, to: range.to });
    if (category) qs.set('category', category);
    if (employee) qs.set('employee', employee);
    try {
      const [s, i, c] = await Promise.all([
        apiGet(`/api/reports/sales?${qs.toString()}`),
        apiGet(`/api/reports/inventory?${qs.toString()}`),
        apiGet(`/api/reports/customers?${qs.toString()}`),
      ]);
      setSales(s.ok ? await s.json() : null);
      setInventory(i.ok ? await i.json() : null);
      setCustomers(c.ok ? await c.json() : null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [range.from, range.to, category, employee]);

  const kpis = sales?.kpis;

  return (
    <div className="pt-4">
      {/* Filters */}
      <div className="bg-neutral-900 border border-neutral-800 rounded p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-white/60 mb-1">Date range</label>
            <select value={preset} onChange={e=>setPreset(e.target.value as any)} className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-sm">
              {PRESETS.map(p=> <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          {preset==='custom' && (
            <>
              <div>
                <label className="block text-xs text-white/60 mb-1">From</label>
                <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">To</label>
                <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-sm" />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs text-white/60 mb-1">Category</label>
            <select value={category} onChange={e=>setCategory(e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-sm">
              <option value="">All</option>
              {categories.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Employee</label>
            <select value={employee} onChange={e=>setEmployee(e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-sm">
              <option value="">All</option>
              {employees.map(e=> <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
            </select>
          </div>
          <button onClick={loadAll} className="ml-auto bg-neutral-800 hover:bg-neutral-700 rounded px-3 py-1 border border-black text-sm">Refresh</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-5 gap-3 mb-4">
        {loading ? (
          Array.from({length:5}).map((_,i)=>(<div key={i} className="h-20 bg-neutral-900 border border-neutral-800 rounded animate-pulse"/>))
        ) : (
          <>
            <div className="bg-neutral-900 border border-neutral-800 rounded p-3">
              <div className="text-xs text-white/60">Total Revenue</div>
              <div className="text-xl font-semibold">${kpis?.totalRevenue?.toFixed(2) || '0.00'}</div>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded p-3">
              <div className="text-xs text-white/60">Total Orders</div>
              <div className="text-xl font-semibold">{kpis?.totalOrders ?? 0}</div>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded p-3">
              <div className="text-xs text-white/60">Avg Order Value</div>
              <div className="text-xl font-semibold">${kpis?.avgOrderValue?.toFixed(2) || '0.00'}</div>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded p-3">
              <div className="text-xs text-white/60">Active Customers</div>
              <div className="text-xl font-semibold">{kpis?.activeCustomers ?? 0}</div>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded p-3">
              <div className="text-xs text-white/60">Top Product</div>
              <div className="text-sm font-semibold">{kpis?.topProduct ? `${kpis.topProduct.name} (${kpis.topProduct.qty})` : '-'}</div>
            </div>
          </>
        )}
      </div>

      {/* Sales Report */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Sales</h2>
          <div className="flex gap-2">
            <button onClick={()=> downloadCSV(`sales_series_${range.from}_${range.to}.csv`, sales?.series||[])} className="bg-neutral-800 hover:bg-neutral-700 rounded px-3 py-1 border border-black text-sm">Export CSV (Series)</button>
            <button onClick={()=> downloadCSV(`sales_orders_${range.from}_${range.to}.csv`, sales?.orders?.items||[])} className="bg-neutral-800 hover:bg-neutral-700 rounded px-3 py-1 border border-black text-sm">Export CSV (Orders)</button>
          </div>
        </div>
        {/* Chart placeholder */}
        <div className="bg-neutral-900 border border-neutral-800 rounded p-3 mb-3">
          {loading ? (
            <div className="h-40 animate-pulse bg-neutral-800 rounded" />
          ) : (
            <div className="text-white/70 text-sm">
              {/* Placeholder sparkline as list */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {(sales?.series||[]).slice(-12).map(s=> (
                  <div key={s.date} className="bg-neutral-950 border border-neutral-800 rounded p-2">
                    <div className="text-xs text-white/50">{s.date}</div>
                    <div className="text-sm">${s.revenue.toFixed(2)}</div>
                    <div className="text-xs text-white/50">{s.orders} orders</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-white/50 text-xs">Charts will use Recharts after package install.</div>
            </div>
          )}
        </div>
        {/* Orders table (paginated from API page=1 currently) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/70 border-b border-neutral-800">
                <th className="p-2">Order</th>
                <th className="p-2">Date</th>
                <th className="p-2">Customer</th>
                <th className="p-2">Total</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(sales?.orders?.items||[]).map((o:any)=>(
                <tr key={o._id} className="border-b border-neutral-800">
                  <td className="p-2">{o.orderNumber || `MES-${String(o._id).slice(-6).toUpperCase()}`}</td>
                  <td className="p-2">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="p-2">{o.email}</td>
                  <td className="p-2 font-semibold">${(o.total||0).toFixed(2)}</td>
                  <td className="p-2">{o.status}</td>
                </tr>
              ))}
              {(!loading && (sales?.orders?.items||[]).length===0) && (
                <tr><td colSpan={5} className="p-3 text-white/60">No data for selected range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Inventory Report */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Inventory</h2>
          <div className="flex gap-2">
            <button onClick={()=> downloadCSV(`inventory_low_${range.from}_${range.to}.csv`, inventory?.lowStock||[])} className="bg-neutral-800 hover:bg-neutral-700 rounded px-3 py-1 border border-black text-sm">Export CSV (Low)</button>
            <button onClick={()=> downloadCSV(`inventory_out_${range.from}_${range.to}.csv`, inventory?.outOfStock||[])} className="bg-neutral-800 hover:bg-neutral-700 rounded px-3 py-1 border border-black text-sm">Export CSV (Out)</button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="bg-neutral-900 border border-neutral-800 rounded p-3">
            <div className="font-semibold mb-2">Low stock</div>
            <div className="max-h-64 overflow-auto">
              {(inventory?.lowStock||[]).map((p:any)=>(
                <div key={p.sku} className="flex justify-between py-1 border-b border-neutral-800/60">
                  <div className="truncate">{p.translations?.es?.name || p.translations?.en?.name || p.sku} <span className="text-white/50">({p.sku})</span></div>
                  <div className="font-semibold">{p.stock}</div>
                </div>
              ))}
              {(!loading && (inventory?.lowStock||[]).length===0) && <div className="text-white/60">No data for selected range.</div>}
            </div>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded p-3">
            <div className="font-semibold mb-2">Out of stock</div>
            <div className="max-h-64 overflow-auto">
              {(inventory?.outOfStock||[]).map((p:any)=>(
                <div key={p.sku} className="flex justify-between py-1 border-b border-neutral-800/60">
                  <div className="truncate">{p.translations?.es?.name || p.translations?.en?.name || p.sku} <span className="text-white/50">({p.sku})</span></div>
                  <div className="font-semibold">{p.stock}</div>
                </div>
              ))}
              {(!loading && (inventory?.outOfStock||[]).length===0) && <div className="text-white/60">No data for selected range.</div>}
            </div>
          </div>
        </div>
      </section>

      {/* Customers Report */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Customers</h2>
          <div className="flex gap-2">
            <button onClick={()=> downloadCSV(`top_customers_${range.from}_${range.to}.csv`, customers?.topCustomers||[])} className="bg-neutral-800 hover:bg-neutral-700 rounded px-3 py-1 border border-black text-sm">Export CSV</button>
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded p-3 mb-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-neutral-950 border border-neutral-800 rounded p-3">
              <div className="text-xs text-white/60">New</div>
              <div className="text-xl font-semibold">{customers?.newCustomers ?? 0}</div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded p-3">
              <div className="text-xs text-white/60">Returning</div>
              <div className="text-xl font-semibold">{customers?.returningCustomers ?? 0}</div>
            </div>
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/70 border-b border-neutral-800">
                <th className="p-2">Customer</th>
                <th className="p-2">Orders</th>
                <th className="p-2">Value</th>
              </tr>
            </thead>
            <tbody>
              {(customers?.topCustomers||[]).map(c=> (
                <tr key={c.email} className="border-b border-neutral-800">
                  <td className="p-2">{c.email}</td>
                  <td className="p-2">{c.orders}</td>
                  <td className="p-2 font-semibold">${c.value.toFixed(2)}</td>
                </tr>
              ))}
              {(!loading && (customers?.topCustomers||[]).length===0) && (
                <tr><td colSpan={3} className="p-3 text-white/60">No data for selected range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

