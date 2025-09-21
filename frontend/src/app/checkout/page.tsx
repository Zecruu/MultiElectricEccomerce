"use client";
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/CartProvider';
import { apiPost } from '@/lib/api';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

function CheckoutForm(){
  const router = useRouter();
  const { items, totals, clear } = useCart();
  const [lang, setLang] = useState<string>(typeof window !== 'undefined' ? (localStorage.getItem('lang')||'es') : 'es');
  const [pending, setPending] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    street: '', city: '', state: '', zip: '', country: 'EC',
  });
  const stripe = useStripe();
  const elements = useElements();
  const isSecure = typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  useEffect(() => {
    const onLang = (e: any) => setLang(e?.detail?.lang || (localStorage.getItem('lang')||'es'));
    const onStorage = () => setLang(localStorage.getItem('lang')||'es');
    window.addEventListener('lang-change', onLang as any);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener('lang-change', onLang as any); window.removeEventListener('storage', onStorage); };
  }, []);
  const t = (es: string, en: string) => lang === 'es' ? es : en;
  const fmt = (n:number) => new Intl.NumberFormat(lang==='es'?'es-US':'en-US', { style:'currency', currency:'USD' }).format(n);

  async function onSubmit(e: React.FormEvent){
    e.preventDefault();
    if (items.length === 0) return;
    if (!stripe || !elements){ setCardError('Payments not ready'); return; }
    setPending(true);
    setCardError(null);
    try{
      const payload = {
        items: items.map(it => ({ productId: it.productId, qty: it.qty })),
        email: form.email,
        shippingAddress: {
          name: form.name,
          street: form.street,
          city: form.city,
          state: form.state,
          zip: form.zip,
          country: form.country,
          phone: form.phone,
        },
        paymentMethod: 'card' as const,
      };
      const res = await apiPost('/api/orders', payload);
      if (!res.ok){
        const err = await res.json().catch(()=>({error:'Checkout failed'}));
        setCardError(err.error || 'Checkout failed');
        return;
      }
      const data = await res.json();
      if (!data?.clientSecret || !stripe || !elements){ setCardError('Payment unavailable'); return; }
      const card = elements.getElement(CardElement);
      if (!card){ setCardError('Enter card details'); return; }
      const r = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card, billing_details: { name: form.name, email: form.email, phone: form.phone } }
      });
      if (r.error){ setCardError(r.error.message || 'Payment failed'); return; }
      clear();
      router.replace(`/order-complete?o=${encodeURIComponent(data.id)}&t=${encodeURIComponent(data.publicToken)}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">{t('Finalizar compra','Checkout')}</h1>

      {items.length===0 ? (
        <div className="bg-neutral-900 border border-black rounded p-6 text-white/70">
          <p className="mb-4">{t('Tu carrito est\u00e1 vac\u00edo.','Your cart is empty.')}</p>
          <a href="/cart" className="inline-block bg-blue-600 hover:bg-blue-500 rounded px-4 py-2 border border-black">{t('Volver al carrito','Back to cart')}</a>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
          {pending && (
            <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <div className="flex items-center gap-2 text-white/80 text-sm bg-neutral-900/80 border border-neutral-700 rounded px-3 py-2">
                <span className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden />
                Processing payment...
              </div>
            </div>
          )}

          <div className="md:col-span-2 space-y-4">
            <div className="bg-neutral-900 border border-black rounded p-4">
              <div className="font-semibold mb-3">{t('Información del cliente','Customer information')}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <input required placeholder={t('Nombre completo','Full name')} value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="bg-neutral-800 border border-neutral-700 rounded px-3 py-2" />
                <input required type="email" placeholder={t('Email','Email')} value={form.email} onChange={e=>setForm({...form, email: e.target.value})} className="bg-neutral-800 border border-neutral-700 rounded px-3 py-2" />
                <input placeholder={t('Teléfono','Phone')} value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} className="bg-neutral-800 border border-neutral-700 rounded px-3 py-2" />
              </div>
            </div>
            <div className="bg-neutral-900 border border-black rounded p-4">
              <div className="font-semibold mb-3">{t('Dirección de envío','Shipping address')}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <input required placeholder={t('Calle y número','Street and number')} value={form.street} onChange={e=>setForm({...form, street: e.target.value})} className="bg-neutral-800 border border-neutral-700 rounded px-3 py-2" />
                <input required placeholder={t('Ciudad','City')} value={form.city} onChange={e=>setForm({...form, city: e.target.value})} className="bg-neutral-800 border border-neutral-700 rounded px-3 py-2" />
                <input placeholder={t('Provincia/Estado','State/Province')} value={form.state} onChange={e=>setForm({...form, state: e.target.value})} className="bg-neutral-800 border border-neutral-700 rounded px-3 py-2" />
                <input placeholder={t('Código postal','ZIP/Postal code')} value={form.zip} onChange={e=>setForm({...form, zip: e.target.value})} className="bg-neutral-800 border border-neutral-700 rounded px-3 py-2" />
                <input placeholder={t('País','Country')} value={form.country} onChange={e=>setForm({...form, country: e.target.value})} className="bg-neutral-800 border border-neutral-700 rounded px-3 py-2" />
              </div>
            </div>
            <div className="bg-neutral-900 border border-black rounded p-4">
              <div className="font-semibold mb-3">{t('Pago','Payment')}</div>
              {!isSecure && (
                <div className="mb-3 text-amber-300 text-sm">
                  {t('Para ingresar la tarjeta, abre esta página en https o en localhost.','To enter card details, open this page over https or on localhost.')}
                </div>
              )}
              <div className="bg-neutral-800 border border-neutral-700 rounded p-3">
                <CardElement options={{ hidePostalCode: true }} onChange={(e:any)=> setCardError(e?.error?.message || null)} />
              </div>
              {cardError && (
                <div className="mt-2 text-sm text-red-400" role="alert" aria-live="polite">{cardError}</div>
              )}
            </div>
          </div>
          <div className="bg-neutral-900 border border-black rounded p-4 h-fit">
            <div className="font-semibold mb-3">{t('Resumen','Summary')}</div>
            <div className="space-y-2 text-sm">
              {(items).map(it => (
                <div key={it.productId} className="flex justify-between">
                  <span className="truncate">{it.name} <span className="text-white/60">x{it.qty}</span></span>
                  <span>{fmt(it.price * it.qty)}</span>
                </div>
              ))}
              <div className="border-t border-neutral-800 pt-2 flex justify-between"><span>{t('Total','Total')}</span><span>{fmt(totals.total)}</span></div>
            </div>
            <button disabled={pending || !stripe || !isSecure} className="mt-4 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 rounded px-4 py-2 border border-black">
              {pending ? t('Procesando...','Processing...') : t('Pagar ahora','Pay now')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function CheckoutPage(){
  const stripePromise = useMemo(() => publishableKey ? loadStripe(publishableKey) : null, []);
  if (!stripePromise) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <p className="text-amber-300">Stripe publishable key missing. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in frontend/.env.local</p>
    </div>
  );
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
}

