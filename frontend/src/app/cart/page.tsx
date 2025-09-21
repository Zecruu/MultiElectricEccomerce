"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/CartProvider';

export default function CartPage(){
  const { items, setQty, remove, totals } = useCart();
  const [lang, setLang] = useState<string>(typeof window !== 'undefined' ? (localStorage.getItem('lang')||'es') : 'es');
  useEffect(() => {
    const onLang = (e: any) => setLang(e?.detail?.lang || (localStorage.getItem('lang')||'es'));
    const onStorage = () => setLang(localStorage.getItem('lang')||'es');
    window.addEventListener('lang-change', onLang as any);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener('lang-change', onLang as any); window.removeEventListener('storage', onStorage); };
  }, []);

  const t = (es: string, en: string) => lang === 'es' ? es : en;
  const fmt = (n:number) => new Intl.NumberFormat(lang==='es'?'es-US':'en-US', { style:'currency', currency:'USD' }).format(n);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">{t('Carrito','Cart')}</h1>

      {items.length===0 ? (
        <div className="bg-neutral-900 border border-black rounded p-6 text-white/70">
          <p className="mb-4">{t('Tu carrito está vacío.','Your cart is empty.')}</p>
          <Link href="/" className="inline-block bg-blue-600 hover:bg-blue-500 rounded px-4 py-2 border border-black">{t('Seguir comprando','Continue shopping')}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-neutral-900 border border-black rounded divide-y divide-neutral-800">
            {items.map((it) => (
              <div key={it.productId} className="p-4 flex items-center gap-4">
                <div className="w-20 h-20 rounded bg-neutral-800 border border-neutral-700 overflow-hidden flex items-center justify-center">
                  <img src={it.imageUrl || "/MULTI%20ELECTRCI%20LOGO_LE_upscale_balanced_x4.jpg"} alt={it.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{it.name}</div>
                  <div className="text-white/70 text-sm">{fmt(it.price)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} value={it.qty} onChange={(e)=> setQty(it.productId, Math.max(1, parseInt(e.target.value||'1',10)))} className="w-16 bg-neutral-800 border border-neutral-700 rounded px-2 py-1" />
                  <button onClick={()=>remove(it.productId)} className="text-white/70 hover:text-white text-sm">{t('Eliminar','Remove')}</button>
                </div>
                <div className="w-24 text-right font-semibold">{fmt(it.price * it.qty)}</div>
              </div>
            ))}
          </div>
          <div className="bg-neutral-900 border border-black rounded p-4 h-fit">
            <h2 className="font-semibold mb-3">{t('Resumen','Summary')}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>{t('Subtotal','Subtotal')}</span><span>{fmt(totals.subtotal)}</span></div>
              <div className="flex justify-between"><span>{t('Envío','Shipping')}</span><span>{fmt(totals.shipping)}</span></div>
              <div className="flex justify-between"><span>{t('Impuestos','Taxes')}</span><span>{fmt(totals.tax)}</span></div>
              <div className="border-t border-neutral-800 pt-2 flex justify-between font-semibold"><span>{t('Total','Total')}</span><span>{fmt(totals.total)}</span></div>
            </div>
            <Link href="/checkout" className="mt-4 inline-block w-full text-center bg-blue-600 hover:bg-blue-500 rounded px-4 py-2 border border-black">{t('Ir a pagar','Proceed to checkout')}</Link>
          </div>
        </div>
      )}
    </div>
  );
}

