"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import UserChip from "./UserChip";
import { useCart } from "./CartProvider";

export default function PublicNavbar() {
  // Avoid hydration mismatch: do not read localStorage in initial state
  const [lang, setLang] = useState<'en' | 'es'>('es');
  const [mounted, setMounted] = useState(false);
  const [logoOk, setLogoOk] = useState(true);
  const logoCandidates = [
    '/MULTI%20ELECTRCI%20LOGO_LE_upscale_balanced_x4.jpg',
    '/MULTI ELECTRCI LOGO_LE_upscale_balanced_x4.jpg',
    '/logo.jpg',
  ];
  const { items } = useCart();
  const totalQty = useMemo(() => items.reduce((s,i)=>s + (i.qty||0), 0), [items]);

  const [logoIndex, setLogoIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('lang') as 'en'|'es'|null;
      if (saved && saved !== lang) setLang(saved);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang = lang;
      localStorage.setItem('lang', lang);
      // Broadcast language changes so other components can react in the same tab
      window.dispatchEvent(new CustomEvent('lang-change', { detail: { lang } }));
    } catch {}
  }, [lang]);

  return (
    <nav className="bg-neutral-900 text-white border-y border-black">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          {logoOk ? (
            <Image
              src={logoCandidates[logoIndex]}
              alt="Multi Electric"
              width={170}
              height={44}
              className="h-11 w-auto rounded-sm border border-black bg-white/5"
              unoptimized
              onError={() => {
                if (logoIndex < logoCandidates.length - 1) setLogoIndex(logoIndex + 1);
                else setLogoOk(false);
              }}
            />
          ) : (
            <div className="h-11 w-44 rounded-sm border border-black bg-neutral-800" aria-label="logo placeholder" />
          )}
          <span className="hidden md:inline text-white/90 font-semibold tracking-wide">Multi Electric Supply</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/">{mounted && lang === 'en' ? 'Home' : 'Inicio'}</Link>
          <Link href="/products">{mounted && lang === 'en' ? 'Products' : 'Productos'}</Link>
          <Link href="/cart" className="relative inline-flex items-center">
            <span>{mounted && lang === 'en' ? 'Cart' : 'Carrito'}</span>
            {totalQty > 0 && (
              <span aria-label="items in cart" className="ml-1 -mt-2 absolute -right-3 -top-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D4AF37] text-black text-[10px] leading-[18px] text-center font-semibold">
                {totalQty}
              </span>
            )}
          </Link>
          <Link href="/cuenta">{mounted && lang === 'en' ? 'Account' : 'Mi Cuenta'}</Link>
          <UserChip loginLabel={mounted && lang === 'en' ? 'Sign in' : 'Iniciar sesión'} />
          <div className="flex items-center">
            <div className="flex items-center gap-1 rounded-full bg-neutral-800 border border-black p-1">
              <button
                onClick={() => setLang('es')}
                className={`px-3 py-1 rounded-full transition-colors ${lang==='es' ? 'bg-[#D4AF37] text-black' : 'text-white'}`}
                aria-pressed={lang==='es'}
              >ES</button>
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1 rounded-full transition-colors ${lang==='en' ? 'bg-[#D4AF37] text-black' : 'text-white'}`}
                aria-pressed={lang==='en'}
              >EN</button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

