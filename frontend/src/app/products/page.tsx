"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/api";

type CatalogProduct = {
  _id: string;
  sku: string;
  price: number;
  category: string;
  translations?: { en?: { name?: string; description?: string }; es?: { name?: string; description?: string } };
  images?: { url: string; alt?: string; primary?: boolean }[];
};

export default function ProductsPage(){
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{ _id:string; name:string; slug:string; productCount:number }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize selected from URL
  useEffect(()=>{
    const init = () => {
      const params = new URLSearchParams(searchParams?.toString()||'');
      const arr = params.getAll('category');
      let out: string[] = [];
      if (arr.length){
        for (const a of arr){ a.split(',').forEach(s=>{ const v=s.trim(); if (v) out.push(v); }); }
      } else {
        const one = params.get('category');
        if (one) one.split(',').forEach(s=>{ const v=s.trim(); if (v) out.push(v); });
      }
      out = Array.from(new Set(out));
      setSelected(out);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load categories
  useEffect(()=>{
    let active = true;
    (async()=>{
      try{
        const res = await apiGet('/api/catalog/categories');
        if (!active) return;
        if (res.ok){
          const data = await res.json();
          setCategories(data.items||[]);
        }
      } finally {}
    })();
    return ()=>{ active=false };
  },[]);

  // Update URL when selected changes
  useEffect(()=>{
    const params = new URLSearchParams(searchParams?.toString()||'');
    params.delete('category');
    if (selected.length){
      // Use comma-separated for compatibility
      params.set('category', selected.join(','));
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Load products whenever selection changes
  useEffect(()=>{
    let active = true;
    (async()=>{
      try{
        const qs = new URLSearchParams({ page: '1', limit: '48', sortBy: 'updatedAt', sortDir: 'desc' });
        if (selected.length) qs.set('category', selected.join(','));
        const res = await apiGet(`/api/catalog/products?${qs.toString()}`);
        if (!active) return;
        if (res.ok){
          const data = await res.json();
          setItems(data.items||[]);
        } else {
          setItems([]);
        }
      } finally { setLoading(false); }
    })();
    return ()=>{ active=false };
  },[selected]);

  // Toggle select
  function toggle(cat: string){
    setSelected(prev => prev.includes(cat) ? prev.filter(x=> x!==cat) : [...prev, cat]);
  }
  function clearAll(){ setSelected([]); }

  const selectedSet = useMemo(()=> new Set(selected), [selected]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Products</h1>
          {/* Category dropdown filter */}
          <div className="relative">
            <button onClick={()=> setOpen(o=>!o)} className="px-3 py-2 rounded border text-sm bg-neutral-900 border-neutral-800 text-white/80 hover:text-white hover:bg-neutral-800">
              Categories{selected.length? ` (${selected.length})`:''}
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded shadow-lg z-10">
                <div className="max-h-64 overflow-auto p-2">
                  {categories.map(c=>{
                    const v = c.slug || c.name;
                    const active = selectedSet.has(v);
                    return (
                      <label key={c._id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-neutral-800/60 cursor-pointer">
                        <input type="checkbox" checked={active} onChange={()=> toggle(v)} />
                        <span className="flex-1 text-sm text-white/80">{c.name}</span>
                        <span className="text-xs text-white/50">{typeof c.productCount==='number'? c.productCount: ''}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between p-2 border-t border-neutral-800">
                  <button onClick={clearAll} className="text-xs text-white/70 hover:text-white">Clear All</button>
                  <button onClick={()=> setOpen(false)} className="text-xs text-sky-400 hover:underline">Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Active filter chips */}
        {selected.length>0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selected.map(v=>{
              const label = categories.find(c=> (c.slug||c.name)===v)?.name || v;
              return (
                <span key={v} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-900/30 border border-sky-700 text-sky-100 text-xs">
                  {label}
                  <button onClick={()=> toggle(v)} className="ml-1 text-sky-200/80 hover:text-white">×</button>
                </span>
              );
            })}
          </div>
        )}
      </div>
      {loading ? (
        <div className="text-white/60">Loading...</div>
      ) : items.length===0 ? (
        <div className="text-white/60">No products found</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(p=>{
            const name = p.translations?.es?.name || p.translations?.en?.name || p.sku;
            const primary = (p.images||[]).find(im=> im.primary) || (p.images||[])[0];
            return (
              <div key={p._id} className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                <div className="aspect-square bg-neutral-800 border-b border-neutral-800 flex items-center justify-center">
                  {primary ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={primary.url} alt={primary.alt||name} className="w-full h-full object-cover"/>
                  ) : (
                    <div className="text-white/40 text-sm">No image</div>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-sm text-white/70">{p.category || 'Uncategorized'}</div>
                  <div className="font-medium">{name}</div>
                  <div className="text-white/80">${'{'}p.price.toFixed(2){'}'}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

