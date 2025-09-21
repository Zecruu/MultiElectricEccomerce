"use client";
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPut, apiPost } from '@/lib/api';
import type { CartItem } from '@/lib/cart';
import { loadCart, saveCart, upsertItem as upsert, setQty as setQ, removeItem as remove, totals as calc } from '@/lib/cart';

interface CartContextValue {
  items: CartItem[];
  add: (item: CartItem) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  totals: { subtotal: number; tax: number; shipping: number; total: number };
  syncPending: boolean;
}

const CartCtx = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }){
  const [items, setItems] = useState<CartItem[]>([]);
  const [syncPending, setSyncPending] = useState(false);
  const t = useMemo(() => calc(items), [items]);

  useEffect(() => {
    setItems(loadCart());
  }, []);

  useEffect(() => { saveCart(items); }, [items]);

  // Try to sync with backend if signed-in
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await apiGet('/api/me');
        if (!active || !me.ok) return;
        setSyncPending(true);
        const res = await apiGet('/api/cart');
        if (res.ok) {
          const data = await res.json();
          // Simple policy: if backend has items and local is empty, use backend; else push local to backend
          if ((data.items||[]).length > 0 && items.length === 0) {
            setItems(data.items);
          } else {
            await apiPut('/api/cart', { items });
          }
        }
      } catch {}
      finally { if (active) setSyncPending(false); }
    })();
    return () => { active = false };
  }, []); // on mount

  function add(item: CartItem){ setItems(cur => upsert(cur, item)); }
  function setQty(productId: string, qty: number){ setItems(cur => setQ(cur, productId, qty)); }
  function removeItem(productId: string){ setItems(cur => remove(cur, productId)); }
  function clear(){ setItems([]); }

  const value: CartContextValue = { items, add, setQty, remove: removeItem, clear, totals: t, syncPending };
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart(){
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

