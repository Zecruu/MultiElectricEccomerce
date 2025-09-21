"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

export default function ProfilePage(){
  const [me, setMe] = useState<any|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    let active = true;
    (async()=>{
      const res = await apiGet("/api/me");
      if(!active) return;
      setMe(res.ok ? await res.json() : null);
      setLoading(false);
    })();
    return ()=>{active=false};
  },[]);

  if (loading) return <p className="text-white/70">Loading...</p>;
  if (!me) return <p className="text-white/80">Not signed in.</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Profile</h1>
      <div className="bg-neutral-900 border border-neutral-800 rounded p-4 text-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="text-white/60">Name</div>
          <div className="font-medium">{me.name}</div>
        </div>
        <div>
          <div className="text-white/60">Email</div>
          <div className="font-medium">{me.email}</div>
        </div>
        <div>
          <div className="text-white/60">Role</div>
          <div className="font-medium capitalize">{me.role}</div>
        </div>
        <div>
          <div className="text-white/60">Last login</div>
          <div className="font-medium">{me.lastLoginAt ? new Date(me.lastLoginAt).toLocaleString() : '-'}</div>
        </div>
        <div>
          <div className="text-white/60">Created</div>
          <div className="font-medium">{me.createdAt ? new Date(me.createdAt).toLocaleString() : '-'}</div>
        </div>
      </div>
      <div className="mt-4 text-sm text-white/60">Account management (change password, link Google, sessions) 2 coming soon.</div>
    </div>
  );
}

