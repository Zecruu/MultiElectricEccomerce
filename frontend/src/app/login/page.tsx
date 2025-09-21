"use client";
import { useState } from "react";
import { apiPost, API_BASE } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await apiPost("/api/auth/login", { email, password });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setMsg("Conectado"); else setMsg(data.error || "Error");
  }

  const googleStart = () => {
    window.location.href = `${API_BASE}/api/auth/google/start`;
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Iniciar sesion</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" placeholder="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" placeholder="Contrasena" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button className="w-full bg-blue-600 hover:bg-blue-500 rounded px-4 py-2 border border-black">Entrar</button>
      </form>
      <button onClick={googleStart} className="mt-3 w-full bg-neutral-800 hover:bg-neutral-700 rounded px-4 py-2 border border-black">Continuar con Google</button>
      <div className="mt-3 text-sm text-white/70 flex items-center justify-between">
        <a href="/register" className="underline">Crear cuenta</a>
        <a href="/forgot-password" className="underline">Olvide mi contrasena</a>
      </div>
      {msg && <p className="mt-3 text-sm text-white/80">{msg}</p>}
    </div>
  );
}

