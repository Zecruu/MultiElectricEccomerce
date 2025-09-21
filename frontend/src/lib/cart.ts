export type CartItem = {
  productId: string;
  sku: string;
  name: string;
  price: number;
  qty: number;
  imageUrl?: string;
};

const STORAGE_KEY = 'cart:v1';

export function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch { return []; }
}

export function saveCart(items: CartItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

export function upsertItem(items: CartItem[], item: CartItem): CartItem[] {
  const idx = items.findIndex(i => i.productId === item.productId);
  if (idx === -1) return [...items, item];
  const next = items.slice();
  next[idx] = { ...next[idx], qty: next[idx].qty + item.qty };
  return next;
}

export function setQty(items: CartItem[], productId: string, qty: number): CartItem[] {
  if (qty <= 0) return items.filter(i => i.productId !== productId);
  return items.map(i => i.productId === productId ? { ...i, qty } : i);
}

export function removeItem(items: CartItem[], productId: string): CartItem[] {
  return items.filter(i => i.productId !== productId);
}

export function totals(items: CartItem[]) {
  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const tax = 0;
  const shipping = 0;
  const total = subtotal + tax + shipping;
  return { subtotal, tax, shipping, total };
}

