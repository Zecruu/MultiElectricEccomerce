"use client";
import { useState } from "react";
import { apiPost } from "@/lib/api";
import Link from "next/link";

export default function RegisterPage(){
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent){
    e.preventDefault();
    setMsg(null);
    const res = await apiPost("/api/auth/register", { name, email, password });
    const data = await res.json().catch(()=>({}));
    setMsg(res.ok ? "Registro completo. Revisa tu email para verificar." : (data.error || "Error"));
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Crear cuenta</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" placeholder="Nombre" value={name} onChange={(e)=>setName(e.target.value)} />
        <input className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" placeholder="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" placeholder="Contraseña" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button className="w-full bg-blue-600 hover:bg-blue-500 rounded px-4 py-2 border border-black">Registrarme</button>
      </form>
      {msg && <p className="mt-3 text-sm text-white/80">{msg}</p>}
      <p className="mt-3 text-sm text-white/70">¿Ya tienes cuenta? <Link href="/login" className="underline">Inicia sesión</Link></p>
    </div>
  );
}

