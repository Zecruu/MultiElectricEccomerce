"use client";
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";

const STATUSES = ['pending','paid','shipped','completed','failed','cancelled'] as const;

type Order = {
  _id: string;
  orderNumber?: string;
  email: string;
  status: string;
  total: number;
  createdAt: string;
  items: { sku: string; name: string; qty: number; price: number; imageUrl?: string }[];
  shippingAddress?: { name?: string; street?: string; city?: string; state?: string; zip?: string; country?: string; phone?: string };
  payment?: { method?: string; paidAt?: string | null; reference?: string | null };
};

export default function EmployeeOrdersPage(){
  const [lang, setLang] = useState<string>(typeof window !== 'undefined' ? (localStorage.getItem('lang')||'es') : 'es');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [items, setItems] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [busyId, setBusyId] = useState<string| null>(null);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');


  useEffect(() => {
    const onLang = (e: any) => setLang(e?.detail?.lang || (localStorage.getItem('lang')||'es'));
    const onStorage = () => setLang(localStorage.getItem('lang')||'es');
    window.addEventListener('lang-change', onLang as any);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener('lang-change', onLang as any); window.removeEventListener('storage', onStorage); };
  }, []);
  // Debounce search input
  useEffect(() => {
    const h = setTimeout(() => { setDebouncedQ(q); setPage(1); }, 300);
    return () => clearTimeout(h);
  }, [q]);
  const t = (es: string, en: string) => lang === 'es' ? es : en;
  const fmt = (n:number) => new Intl.NumberFormat(lang==='es'?'es-US':'en-US', { style:'currency', currency:'USD' }).format(n);

  async function load(){
    setLoading(true); setError(null);
    try{
      const qs = new URLSearchParams({ page: String(page), limit: '50', status: statusFilter, q: debouncedQ });
      const res = await apiGet(`/api/orders/admin?${qs.toString()}`);
      if (!res.ok){ setError('No autorizado o error'); setItems([]); }
      else {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch { setError('Error'); setItems([]); }
    finally { setLoading(false); }
  }

  useEffect(()=>{ load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, statusFilter, debouncedQ]);

  async function updateStatus(id: string, status: string){
    setBusyId(id);
    try{
      const res = await apiPatch(`/api/orders/admin/${id}`, { status });
      if (res.ok){
        setItems(cur => cur.map(o => o._id===id ? { ...o, status } : o));
      }
    } finally {
      setBusyId(null);
    }
  }

  const noResults = useMemo(() => !loading && items.length===0 && (debouncedQ.trim().length>0 || !!statusFilter), [loading, items.length, debouncedQ, statusFilter]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{t('Órdenes','Orders')}</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              value={q}
              onChange={e=> setQ(e.target.value)}
              placeholder={t('Buscar órdenes, clientes...','Search orders, clients...')}
              className="w-64 md:w-80 bg-neutral-900 border border-neutral-800 rounded pl-3 pr-7 py-1 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
            {q && (
              <button aria-label="Clear search" onClick={()=> setQ('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">×</button>
            )}
          </div>
          <select value={statusFilter} onChange={e=>{ setStatusFilter(e.target.value); setPage(1); }} className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm">
            <option value="">{t('Todos los estados','All statuses')}</option>
            {STATUSES.map(s=> <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={load} className="bg-neutral-800 hover:bg-neutral-700 rounded px-3 py-1 border border-black text-sm">{t('Actualizar','Refresh')}</button>
        </div>
      </div>

      {loading ? (
        <div className="text-white/70">{t('Cargando...','Loading...')}</div>
      ) : error ? (
        <div className="text-red-400">{t('Error al cargar','Failed to load')}</div>
      ) : noResults ? (
        <div className="text-white/70">{t('No se encontraron resultados','No results found')}</div>
      ) : items.length===0 ? (
        <div className="text-white/70">{t('No hay órdenes','No orders')}</div>
      ) : (
        <div className="bg-neutral-900 border border-black rounded divide-y divide-neutral-800">
          {items.map(o => (
            <details key={o._id} className="group">
              <summary className="list-none p-4 grid grid-cols-6 gap-3 items-center cursor-pointer group-open:bg-neutral-800/40">
                <div className="col-span-2">
                  <div className="text-xs text-white/60">{o.orderNumber || `MES-${String(o._id).slice(-6).toUpperCase()}`}</div>
                  <div className="text-xs text-white/50">{new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="truncate">{o.email}</div>
                <div className="text-right font-semibold">{fmt(o.total||0)}</div>
                <div>
                  <select disabled={busyId===o._id} value={o.status} onChange={(e)=>updateStatus(o._id, e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-sm">
                    {STATUSES.map(s=> <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="text-right text-white/60 text-sm">{t('Ver','View')}</div>
              </summary>
              <div className="p-4 grid md:grid-cols-2 gap-4">
                <div>
                  <div className="font-semibold mb-2">{t('Artículos','Items')}</div>
                  <div className="space-y-2 text-sm">
                    {(o.items||[]).map((it,idx)=> (
                      <div key={it.sku||idx} className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded bg-neutral-800 border border-neutral-700 overflow-hidden flex items-center justify-center">
                          <img src={it.imageUrl || "/MULTI%20ELECTRCI%20LOGO_LE_upscale_balanced_x4.jpg"} alt={it.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-1 truncate">
                          <div className="truncate">{it.name}</div>
                          <div className="text-white/60">{it.sku} · x{it.qty}</div>
                        </div>
                        <div className="font-semibold">{fmt(it.price * it.qty)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="font-semibold mb-2">{t('Cliente / Envío','Customer / Shipping')}</div>
                  <div className="text-sm text-white/80 space-y-1">
                    <div>{o.shippingAddress?.name}</div>
                    <div>{o.shippingAddress?.street}</div>
                    <div>{o.shippingAddress?.city}{o.shippingAddress?.state?`, ${o.shippingAddress.state}`:''} {o.shippingAddress?.zip}</div>
                    <div>{o.shippingAddress?.country}</div>
                    {o.shippingAddress?.phone && <div>{o.shippingAddress.phone}</div>}
                  </div>
                  <div className="mt-3 text-sm text-white/60">{t('Pago','Payment')}: {o.payment?.method || 'mock'} {o.payment?.paidAt ? `· ${t('Pagado','Paid')}` : ''}</div>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
