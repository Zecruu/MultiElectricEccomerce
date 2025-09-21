"use client";
import { useSearchParams } from "next/navigation";

export default function DashboardPage(){
  const sp = useSearchParams();
  const denied = sp.get("denied");
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      {denied && (
        <div className="mb-4 rounded border border-amber-700 bg-amber-900/30 text-amber-200 px-3 py-2 text-sm">
          Acceso denegado: no tienes permisos para esa secci2n.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-white/60 text-sm">Orders Today</div>
          <div className="text-2xl font-semibold">--</div>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-white/60 text-sm">Ready for Pickup</div>
          <div className="text-2xl font-semibold">--</div>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-white/60 text-sm">Average Prep Time</div>
          <div className="text-2xl font-semibold">--</div>
        </div>
      </div>
      <p className="text-white/70">Welcome to the staff dashboard.</p>
    </div>
  );
}

