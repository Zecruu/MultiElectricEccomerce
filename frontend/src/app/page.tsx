"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet } from "@/lib/api";
import { useCart } from "@/components/CartProvider";

type CatalogProduct = {
  _id: string;
  sku: string;
  price: number;
  stock: number;
  lowStockThreshold?: number;
  category: string;
  translations?: { en?: { name?: string; description?: string }; es?: { name?: string; description?: string } };
  images?: { url: string; alt?: string; primary?: boolean }[];
};

export default function Home() {
  const { add } = useCart();
  const [lang, setLang] = useState<'en'|'es'>('es');
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const qTimer = useRef<number|undefined>(undefined);

  // Load lang from localStorage to mirror navbar
  useEffect(()=>{
    try { const saved = localStorage.getItem('lang') as 'en'|'es'|null; if (saved) setLang(saved); } catch{}
  },[]);
  // React to navbar language changes in the same tab
  useEffect(()=>{
    const onLang = (e: any)=>{
      try { setLang(e?.detail?.lang ?? (localStorage.getItem('lang') as 'en'|'es' || 'es')); } catch{}
    };
    const onStorage = (e: StorageEvent)=>{ if (e.key==='lang' && e.newValue){ setLang(e.newValue as 'en'|'es'); } };
    window.addEventListener('lang-change', onLang as any);
    window.addEventListener('storage', onStorage);
    return ()=>{
      window.removeEventListener('lang-change', onLang as any);
      window.removeEventListener('storage', onStorage);
    };
  },[]);


  // Fetch latest products (acts as "featured" for now)
  useEffect(()=>{
    let active = true;
    (async()=>{
      try{
        const qs = new URLSearchParams({ page: '1', limit: '24', sortBy: 'updatedAt', sortDir: 'desc', featured: '1' });
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
  },[]);



  // Apply simple client-side filters
  const filtered = useMemo(()=>{
    const rx = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
    return items.filter(p=>
      (!rx || rx.test(p.sku) || rx.test(p.translations?.es?.name||'') || rx.test(p.translations?.en?.name||''))
    );
  },[items,q]);

  const t = (es: string, en: string)=> lang==='en' ? en : es;

  const scrollToGrid = ()=> document.getElementById('product-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-800 to-blue-400 text-white">
        <div className="max-w-6xl mx-auto px-4 py-24">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">{t('Suministros Eléctricos de Confianza','Trusted Electrical Supplies')}</h1>
          <p className="text-white/90 max-w-2xl mb-6">{t('Equipo eléctrico y soluciones para tu negocio. Enfocados en rapidez, confiabilidad y soporte.','Electrical equipment and solutions for your business. Focused on speed, reliability and support.')}</p>
          <button onClick={scrollToGrid} className="inline-flex items-center px-5 py-2 rounded-md bg-neutral-900/80 hover:bg-neutral-900 border border-black text-white">
            {t('Ver productos','View products')}
          </button>
        </div>
      </section>

      {/* Quick links */}
      <section className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-3 gap-6">
        <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">{t('Servicios','Services')}</div>
        <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">{t('Productos Destacados','Featured Products')}</div>
        <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">{t('Soporte','Support')}</div>
      </section>

      {/* Filters (lightweight for home) */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-4">
          <input
            placeholder={t('Buscar por nombre o SKU…','Search by name or SKU…')}
            defaultValue={q}
            onChange={(e)=>{
              if (qTimer.current) window.clearTimeout(qTimer.current);
              const val = e.target.value;
              qTimer.current = window.setTimeout(()=> setQ(val), 300);
            }}
            className="flex-1 px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
          />

        </div>
      </section>

      {/* Product grid */}
      <section id="product-grid" className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xl font-semibold">{t('Productos destacados','Featured products')}</h2>
          <a href="/products/all" className="text-sm text-sky-400 hover:underline">{t('Ver todos','See all')}</a>
        </div>
        {loading ? (
          <div className="text-white/60 py-8">{t('Cargando productos…','Loading products…')}</div>
        ) : filtered.length === 0 ? (
          <div className="text-white/60 py-8">{t('No hay resultados.','No results.')}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filtered.map((p)=>{
              const name = (lang==='en' ? (p.translations?.en?.name||p.translations?.es?.name) : (p.translations?.es?.name||p.translations?.en?.name)) || p.sku;
              const desc = lang==='en' ? (p.translations?.en?.description||p.translations?.es?.description||'') : (p.translations?.es?.description||p.translations?.en?.description||'');
              const primary = (p.images||[]).find(im=>im.primary) || (p.images||[])[0];
              const badge = p.stock<=0 ? { cls:'bg-red-500/20 text-red-200 border-red-700', label:t('Agotado','Out of stock') } : (p.lowStockThreshold && p.stock<=p.lowStockThreshold ? { cls:'bg-amber-500/20 text-amber-200 border-amber-700', label:t('Bajo stock','Low stock') } : { cls:'bg-emerald-500/20 text-emerald-200 border-emerald-700', label:t('En stock','In stock') });
              return (
                <div key={p._id} className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden hover:-translate-y-0.5 transition-transform">
                  <div className="h-32 sm:h-40 md:aspect-square bg-neutral-800 border-b border-neutral-800 flex items-center justify-center">
                    {primary ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={primary.url} alt={primary.alt||name} className="w-full h-full object-contain" loading="lazy" />
                    ) : (
                      <div className="text-white/40 text-sm">{t('Sin imagen','No image')}</div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-white/60 truncate" title={p.category}>{p.category}</div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <div className="text-sm md:text-base font-medium line-clamp-2" title={name}>{name}</div>
                    {desc && <div className="text-xs md:text-sm text-white/70 line-clamp-1" title={desc}>{desc}</div>}
                    <div className="mt-2 text-base md:text-lg font-semibold">{lang==='en'? `$${p.price.toFixed(2)}` : `US$${p.price.toFixed(2)}`}</div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        disabled={p.stock<=0}
                        onClick={()=>{
                          if (p.stock<=0) return;
                          const primary = (p.images||[]).find(im=>im.primary) || (p.images||[])[0];
                          const name = (lang==='en' ? (p.translations?.en?.name||p.translations?.es?.name) : (p.translations?.es?.name||p.translations?.en?.name)) || p.sku;
                          add({ productId: p._id, sku: p.sku, name, price: p.price, qty: 1, imageUrl: primary?.url });

                        }}
                        className={`px-2.5 py-1.5 rounded-md text-sm border ${p.stock<=0? 'cursor-not-allowed bg-neutral-900 text-white/40 border-neutral-800' : 'bg-sky-600/20 text-sky-100 border-sky-700 hover:bg-sky-600/30'}`}
                        aria-label={p.stock<=0? t('Agotado','Out of stock') : t('Añadir al carrito','Add to cart')}
                      >
                        {p.stock<=0 ? t('Agotado','Out of stock') : (
                          <span className="relative inline-flex items-center justify-center" aria-hidden="true">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="9" cy="20" r="1" />
                              <circle cx="17" cy="20" r="1" />
                              <path d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L21 9H7" />
                            </svg>
                            <svg className="absolute -top-1 -right-1" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                          </span>
                        )}
                      </button>
                      <a href={`/products`} className="px-2 py-1.5 rounded-md text-sm border border-neutral-800 text-white/70 hover:text-white hover:bg-neutral-900" aria-label={t('Ver producto','View product')}>+</a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
