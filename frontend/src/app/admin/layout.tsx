"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import EmployeeShell from "@/components/portal/EmployeeShell";

export default function AdminLayout({ children }: { children: React.ReactNode }){
  const [role, setRole] = useState<"customer"|"employee"|"admin"|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    let mounted = true;
    const fetchMe = async (attempt = 0) => {
      try{
        const res = await apiGet('/api/me');
        if (!mounted) return;
        if (res.ok){
          const data = await res.json();
          const raw = (data?.role ?? data?.user?.role ?? '').toString().toLowerCase();
          const mapped = raw === 'administrator' ? 'admin' : raw;
          setRole(mapped as any);
          setLoading(false);
        } else if (attempt < 1) {
          setTimeout(()=> fetchMe(attempt+1), 300);
        } else {
          setRole(null); setLoading(false);
        }
      } catch {
        if (attempt < 1) { setTimeout(()=> fetchMe(attempt+1), 300); }
        else { if (mounted) { setRole(null); setLoading(false); } }
      }
    };
    fetchMe(0);
    return ()=>{ mounted = false };
  },[]);

  if (loading) return <div className="pt-16 pl-60 pr-4"><p className="text-white/70">Loading...</p></div>;

  const isAdmin = role === 'admin';

  return (
    isAdmin ? (
      <EmployeeShell role={'admin'}>
        {children}
      </EmployeeShell>
    ) : (
      <div className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="max-w-3xl mx-auto bg-neutral-900 border border-neutral-800 rounded p-6">
          <p className="text-white/80 mb-2">Acceso denegado</p>
          <p className="text-white/60">Solo administradores pueden acceder a esta sección.</p>
        </div>
      </div>
    )
  );
}

