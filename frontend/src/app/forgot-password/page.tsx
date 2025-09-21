"use client";
import { useState } from "react";
import { apiPost } from "@/lib/api";
import Link from "next/link";

export default function ForgotPasswordPage(){
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent){
    e.preventDefault();
    setMsg(null);
    const res = await apiPost("/api/auth/forgot-password", { email });
    const data = await res.json().catch(()=>({}));
    setMsg(res.ok ? "If the email exists, a reset link has been sent." : (data.error || "Error"));
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Forgot password</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" placeholder="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <button className="w-full bg-blue-600 hover:bg-blue-500 rounded px-4 py-2 border border-black">Send link</button>
      </form>
      {msg && <p className="mt-3 text-sm text-white/80">{msg}</p>}
      <p className="mt-3 text-sm text-white/70">
        <Link href="/login" className="underline">Back to sign in</Link>
      </p>
    </div>
  );
}

