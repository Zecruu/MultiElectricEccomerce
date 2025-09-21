"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, API_BASE } from "@/lib/api";
import UserChip from "@/components/UserChip";

type AlertItem = { id: string; type: "order"; title: string; detail?: string; at: string; amount?: number; orderNumber?: string };

export default function AppBar({ role }:{ role: 'customer'|'employee'|'admin'|null }){
  const router = useRouter();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [openBell, setOpenBell] = useState(false);
  const [flash, setFlash] = useState<AlertItem | null>(null);
  const isStaff = role === 'employee' || role === 'admin';

  // Alerts: fetch recent + subscribe via SSE across all portal pages
  useEffect(() => {
    if (!isStaff) return;
    let active = true;
    let es: EventSource | null = null;

    (async () => {
      try {
        const res = await apiGet('/api/alerts/recent');
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          setAlerts(Array.isArray(data?.alerts) ? data.alerts : []);
        }
      } catch (_e) {}

      try {
        es = new EventSource(`${API_BASE}/api/alerts/stream`, { withCredentials: true } as any);
        es.addEventListener('prime', (e: any) => {
          try {
            const data = JSON.parse(e.data || '{}');
            if (Array.isArray(data?.recent)) setAlerts(data.recent);
          } catch (_e) {}
        });
        es.addEventListener('alert', (e: any) => {
          try {
            const a = JSON.parse(e.data || '{}');
            setAlerts(prev => [a, ...prev].slice(0, 50));
            setFlash(a);
            setTimeout(() => setFlash(null), 5000);
          } catch (_e) {}
        });
      } catch (_e) {}
    })();

    return () => { active = false; try { es?.close(); } catch (_e) {} };
  }, [isStaff]);

  // Ctrl+K focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function onSearchSubmit(e: React.FormEvent){
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/employee/orders?q=${encodeURIComponent(q)}`);
  }

  const unread = alerts.length; // simple counter for now

  function goToAlert(a: AlertItem){
    if (a?.orderNumber) router.push(`/employee/orders?q=${encodeURIComponent(a.orderNumber)}`);
    setOpenBell(false);
  }

  return (
    <header className="fixed top-0 inset-x-0 h-14 z-40 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center gap-4">
        <Link href="/employee/dashboard" className="font-semibold tracking-wide whitespace-nowrap mr-2">
          Multi Electric — Portal
        </Link>

        <div className="hidden sm:block h-6 w-px bg-neutral-800" />

        <select className="hidden md:block text-sm bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white/80">
          <option>Main Store</option>
          <option>Warehouse</option>
        </select>

        <form onSubmit={onSearchSubmit} className="flex-1 flex max-w-xl items-center">
          <div className="relative w-full">
            <input
              ref={searchRef}
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
              placeholder="Search orders, clients... (Ctrl+K)"
              className="w-full text-sm bg-neutral-950/90 border border-neutral-800 rounded pl-9 pr-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-sky-700"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" aria-hidden>🔎</span>
          </div>
        </form>

        <div className="flex items-center gap-3 ml-auto">
          {isStaff && (
            <>
              <button
                title="Notifications"
                onClick={()=>setOpenBell(v=>!v)}
                className="relative inline-flex items-center justify-center h-8 w-8 rounded-full border border-neutral-800 text-white/80 hover:text-white hover:bg-neutral-900"
              >
                <span role="img" aria-label="bell">🔔</span>
                {unread>0 && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-sky-500" />}
              </button>
              {openBell && (
                <div className="absolute right-4 top-14 z-50 w-80 rounded-lg border border-neutral-800 bg-neutral-950 shadow-xl">
                  <div className="px-3 py-2 border-b border-neutral-800 text-sm text-white/70">Alerts</div>
                  <div className="max-h-80 overflow-auto">
                    {alerts.length===0 ? (
                      <div className="p-3 text-white/50 text-sm">No alerts</div>
                    ) : alerts.map(a=> (
                      <button key={a.id} onClick={()=>goToAlert(a)} className="block w-full text-left p-3 border-b border-neutral-900 text-sm hover:bg-neutral-900">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-white/90">{a.title}</div>
                          <div className="text-white/40 text-xs">{formatTime(a.at)}</div>
                        </div>
                        {a.detail && <div className="text-white/60 text-xs mt-1">{a.detail}</div>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {flash && (
                <div className="fixed right-4 top-16 z-50 w-80 rounded-lg border border-sky-800 bg-sky-900/30 shadow-xl p-3" onClick={()=>goToAlert(flash)}>
                  <div className="text-xs text-white/60">New</div>
                  <div className="font-medium text-white/90">{flash.title}</div>
                  {flash.detail && <div className="text-white/70 text-xs mt-0.5">{flash.detail}</div>}
                </div>
              )}
            </>
          )}

          {role && (
            <span className="hidden sm:inline text-xs px-2 py-1 rounded-full border border-sky-700 bg-sky-600/20 text-sky-200 capitalize">
              {role}
            </span>
          )}
          <UserChip loginHref="/employee" profileHref="/employee/profile" />
        </div>
      </div>
    </header>
  );
}

function formatTime(iso: string){
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  } catch (_e) { return ""; }
}
