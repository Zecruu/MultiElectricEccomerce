"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { apiPost } from "@/lib/api";

function ResetPasswordInner(){
  const sp = useSearchParams();
  const token = sp.get("token") || "";
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent){
    e.preventDefault();
    setMsg(null);
    const res = await apiPost("/api/auth/reset-password", { token, password });
    const data = await res.json().catch(()=>({}));
    setMsg(res.ok ? "Password updated. You can now sign in." : (data.error || "Error"));
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Reset password</h1>
      {!token ? (
        <p className="text-white/80">Missing token.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <input className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" placeholder="New password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          <button className="w-full bg-blue-600 hover:bg-blue-500 rounded px-4 py-2 border border-black">Update</button>
        </form>
      )}
      {msg && <p className="mt-3 text-sm text-white/80">{msg}</p>}
    </div>
  );
}

export default function ResetPasswordPage(){
  return (
    <Suspense fallback={<div className="max-w-md mx-auto p-6 text-white/60">Loading...</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}

