"use client";
import { CartProvider } from './CartProvider';

export default function ClientProviders({ children }: { children: React.ReactNode }){
  return (
    <CartProvider>
      {children}
    </CartProvider>
  );
}

