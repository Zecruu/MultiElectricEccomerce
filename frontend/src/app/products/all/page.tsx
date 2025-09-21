"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/api";

type CatalogProduct = {
  _id: string; sku: string; price: number; stock?: number; lowStockThreshold?: number; category: string;
  translations?: { en?: { name?: string; description?: string }, es?: { name?: string; description?: string } };
  images?: { url: string; alt?: string; primary?: boolean }[];
};

export default function AllProductsPage(){
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [lang, setLang] = useState<'en'|'es'>('es');

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams?.get('q') || '';
  const page = Math.max(parseInt(searchParams?.get('page')||'1', 10) || 1, 1);

  // sync language with navbar
  useEffect(()=>{ try{ const saved = localStorage.getItem('lang') as 'en'|'es'|null; if (saved) setLang(saved);}catch{} },[]);
  useEffect(()=>{
    const onLang = (e:any)=>{ try{ setLang(e?.detail?.lang ?? (localStorage.getItem('lang') as 'en'|'es' || 'es')); }catch{} };
    const onStorage = (e:StorageEvent)=>{ if (e.key==='lang' && e.newValue) setLang(e.newValue as 'en'|'es'); };
    window.addEventListener('lang-change', onLang as any);
    window.addEventListener('storage', onStorage);
    return ()=>{ window.removeEventListener('lang-change', onLang as any); window.removeEventListener('storage', onStorage); };
  },[]);

  function setQ(v: string){
    const params = new URLSearchParams(searchParams?.toString()||'');
    if (v) params.set('q', v); else params.delete('q');
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  }
  function go(p: number){
    const params = new URLSearchParams(searchParams?.toString()||'');
    params.set('page', String(p));
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(()=>{
    let active = true;
    (async()=>{
      try{
        setLoading(true);
        const qs = new URLSearchParams({ page: String(page), limit: '24', sortBy: 'updatedAt', sortDir: 'desc' });
        if (q) qs.set('q', q);
        const res = await apiGet(`/api/catalog/products?${qs.toString()}`);
        if (!active) return;
        if (res.ok){
          const data = await res.json();
          setItems(data.items||[]);
          setTotalPages(data.totalPages||1);
        } else {
          setItems([]); setTotalPages(1);
        }
      } finally { if (active) setLoading(false); }
    })();
    return ()=>{ active=false };
  }, [q, page]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">All Products</h1>
        <div className="relative">
          <input defaultValue={q} onChange={e=> setQ(e.target.value)} placeholder="Search by name or SKU..." className="w-64 md:w-80 bg-neutral-900 border border-neutral-800 rounded pl-3 pr-7 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-600"/>
        </div>
      </div>

      {loading ? (
        <div className="text-white/60">Loading...</div>
      ) : items.length===0 ? (
        <div className="text-white/60">No products found</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(p=>{
            const name = (lang==='en' ? (p.translations?.en?.name||p.translations?.es?.name) : (p.translations?.es?.name||p.translations?.en?.name)) || p.sku;
            const primary = (p.images||[]).find(im=> im.primary) || (p.images||[])[0];
            const badge = (p.stock??0)<=0 ? { cls:'bg-red-500/20 text-red-200 border-red-700', label: (lang==='en'?'Out of stock':'Agotado') } : ((p.lowStockThreshold && (p.stock??0)<=p.lowStockThreshold) ? { cls:'bg-amber-500/20 text-amber-200 border-amber-700', label:(lang==='en'?'Low stock':'Bajo stock') } : { cls:'bg-emerald-500/20 text-emerald-200 border-emerald-700', label:(lang==='en'?'In stock':'En stock') });
            return (
              <div key={p._id} className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                <div className="aspect-square bg-neutral-800 border-b border-neutral-800 flex items-center justify-center">
                  {primary ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={primary.url} alt={primary.alt||name} className="w-full h-full object-contain"/>
                  ) : (
                    <div className="text-white/40 text-sm">No image</div>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-white/60 truncate" title={p.category}>{p.category || 'Uncategorized'}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <div className="font-medium" title={name}>{name}</div>
                  <div className="text-white/80">{lang==='en'? `$${p.price.toFixed(2)}` : `US$${p.price.toFixed(2)}`}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button disabled={page<=1} onClick={()=> go(page-1)} className="px-3 py-1.5 rounded border border-neutral-800 text-white/70 disabled:opacity-50 hover:text-white hover:bg-neutral-900">Previous</button>
        <div className="text-white/60 text-sm">Page {page} of {totalPages}</div>
        <button disabled={page>=totalPages} onClick={()=> go(page+1)} className="px-3 py-1.5 rounded border border-neutral-800 text-white/70 disabled:opacity-50 hover:text-white hover:bg-neutral-900">Next</button>
      </div>
    </div>
  );
}
