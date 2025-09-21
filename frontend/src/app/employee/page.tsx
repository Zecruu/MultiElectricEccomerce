"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

export default function EmployeeLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showLogo, setShowLogo] = useState(true);
  const logoCandidates = [
    "/logo.jpg",
    "/MULTI ELECTRCI LOGO_LE_upscale_balanced_x4.jpg",
  ];
  const [li, setLi] = useState(0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setPending(true);
    const res = await apiPost("/api/auth/login-employee", { email, password });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg("Logged in");
      // small delay to ensure cookies applied, then redirect
      setTimeout(() => router.replace("/employee/dashboard"), 150);
    } else {
      setMsg(data.error || "Error");
    }
    setPending(false);
  }

  return (
    <div className="min-h-[70vh] grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto px-4 py-10">
      {/* Left: form */}
      <div className="flex items-center justify-center">
        <div className="w-full max-w-sm bg-neutral-900 border border-black rounded-lg p-6 shadow">
          <div className="flex flex-col items-center mb-4">
            {showLogo ? (
              <Image src={logoCandidates[li]} alt="Multi Electric" width={64} height={64} className="h-16 w-16 rounded-full border border-black bg-white/5"
                     unoptimized onError={() => { if (li < logoCandidates.length-1) setLi(li+1); else setShowLogo(false); }} />
            ) : (
              <div className="h-16 w-16 rounded-full border border-black bg-neutral-800" />
            )}
            <h1 className="mt-3 text-lg font-semibold">Welcome to Multi Electric — Portal</h1>
            <p className="text-xs text-white/70">Sign in to your employee/admin account.</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-3">
            <input className="w-full px-3 py-2 rounded bg-neutral-950 border border-black" placeholder="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <input className="w-full px-3 py-2 rounded bg-neutral-950 border border-black" placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
            <label className="flex items-center gap-2 text-xs text-white/80">
              <input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} className="accent-[#D4AF37]" />
              Remember my login details
            </label>
            <button disabled={pending} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 rounded px-4 py-2 border border-black">SIGN IN</button>
          </form>
          {msg && <p className="mt-3 text-sm text-white/80">{msg}</p>}
        </div>
      </div>

      {/* Right: info panel */}
      <div className="flex items-center">
        <div className="w-full">
          <h2 className="text-2xl font-semibold">Multi Electric Supply</h2>
          <p className="mt-2 text-white/70 max-w-md">
            Powering your projects with reliable electrical supplies and expert support.
          </p>
          <div className="mt-6 space-y-2 max-w-md">
            <div className="bg-neutral-900 border border-black rounded px-3 py-2 text-sm">Customer Management</div>
            <div className="bg-neutral-900 border border-black rounded px-3 py-2 text-sm">Order & Fulfillment</div>
            <div className="bg-neutral-900 border border-black rounded px-3 py-2 text-sm">Inventory & Pricing</div>
          </div>
        </div>
      </div>
    </div>
  );
}

