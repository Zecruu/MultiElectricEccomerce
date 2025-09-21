"use client";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiGet } from '@/lib/api';

export default function OrderCompletePage(){
  const sp = useSearchParams();
  const [lang, setLang] = useState<string>(typeof window !== 'undefined' ? (localStorage.getItem('lang')||'es') : 'es');
  const [order, setOrder] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onLang = (e: any) => setLang(e?.detail?.lang || (localStorage.getItem('lang')||'es'));
    const onStorage = () => setLang(localStorage.getItem('lang')||'es');
    window.addEventListener('lang-change', onLang as any);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener('lang-change', onLang as any); window.removeEventListener('storage', onStorage); };
  }, []);
  const t = (es: string, en: string) => lang === 'es' ? es : en;
  const fmt = (n:number) => new Intl.NumberFormat(lang==='es'?'es-US':'en-US', { style:'currency', currency:'USD' }).format(n);

  useEffect(() => {
    const id = sp.get('o') || '';
    const token = sp.get('t') || '';
    if (!id || !token) { setError('Missing order reference'); return; }
    let active = true;
    (async () => {
      try{
        const res = await apiGet(`/api/orders/public/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`);
        if (!active) return;
        if (!res.ok) { setError('Not found'); return; }
        const data = await res.json();
        setOrder(data);
      } catch {
        if (active) setError('Failed to load order');
      }
    })();
    return () => { active = false };
  }, [sp]);

  if (error) return <div className="max-w-3xl mx-auto px-4 py-12 text-white/80">{t('No se pudo cargar la orden.','Could not load order.')}</div>;
  if (!order) return <div className="max-w-3xl mx-auto px-4 py-12 text-white/60">{t('Cargando...','Loading...')}</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-2">{t('Pedido completado','Order complete')}</h1>
      <p className="text-white/70 mb-6">
        {t('Gracias por tu compra.','Thank you for your purchase.')}
        <span className="text-white font-medium">{t('N.º de orden:','Order Number:')}</span>
        <span className="ml-1 text-white">{order.orderNumber || `MES-${String(order._id).slice(-6).toUpperCase()}`}</span>
      </p>

      <div className="bg-neutral-900 border border-black rounded overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-4 border-b md:border-b-0 md:border-r border-neutral-800">
            <div className="font-semibold mb-2">{t('Resumen','Summary')}</div>
            <div className="space-y-1 text-sm">
              {(order.items||[]).map((it:any, idx:number) => (
                <div key={it.sku||idx} className="flex justify-between">
                  <span className="truncate">{it.name} <span className="text-white/60">x{it.qty}</span></span>
                  <span>{fmt(it.price * it.qty)}</span>
                </div>
              ))}
              <div className="border-t border-neutral-800 pt-2 flex justify-between font-semibold"><span>{t('Total','Total')}</span><span>{fmt(order.total||0)}</span></div>
            </div>
          </div>
          <div className="p-4">
            <div className="font-semibold mb-2">{t('Envío','Shipping')}</div>
            <div className="text-sm text-white/80">
              <div>{order.shippingAddress?.name}</div>
              <div>{order.shippingAddress?.street}</div>
              <div>{order.shippingAddress?.city}{order.shippingAddress?.state?`, ${order.shippingAddress.state}`:''} {order.shippingAddress?.zip}</div>
              <div>{order.shippingAddress?.country}</div>
              {order.shippingAddress?.phone && <div>{order.shippingAddress.phone}</div>}
            </div>

          </div>
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <a href="/" className="bg-blue-600 hover:bg-blue-500 rounded px-4 py-2 border border-black">{t('Volver al inicio','Back to Home')}</a>
        <a href="/cuenta" className="bg-neutral-800 hover:bg-neutral-700 rounded px-4 py-2 border border-black">{t('Ver mis órdenes','View my orders')}</a>
      </div>
    </div>
  );
}

