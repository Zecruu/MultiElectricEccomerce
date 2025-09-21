"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";

export type Me = {
  name?: string;
  email?: string;
  role?: "customer" | "employee" | "admin";
};

function initialsFrom(name?: string, email?: string) {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

export default function UserChip({ loginLabel, loginHref, profileHref }: { loginLabel?: string; loginHref?: string; profileHref?: string }) {
  const [me, setMe] = useState<Me | null | undefined>(undefined); // undefined=loading, null=not logged in

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiGet("/api/me");
        if (!active) return;
        if (!res.ok) {
          setMe(null);
        } else {
          const data = await res.json();
          setMe({ name: data.name, email: data.email, role: data.role });
        }
      } catch {
        setMe(null);
      }
    })();
    return () => { active = false; };
  }, []);

  const initials = useMemo(() => initialsFrom(me?.name, me?.email), [me]);

  if (me === undefined) {
    // loading state: reserve space
    return <div className="w-8 h-8 rounded-full border border-black bg-white/10" aria-label="loading" />;
  }

  if (me === null) {
    return (
      <Link href={loginHref || "/login"} className="bg-white/10 px-3 py-1 rounded border border-black">
        {loginLabel || "Sign in"}
      </Link>
    );
  }

  return (
    <Link href={profileHref || "/cuenta"} className="w-8 h-8 grid place-items-center rounded-full border border-black bg-[#D4AF37] text-black text-xs font-semibold" title={me.name || me.email}>
      {initials}
    </Link>
  );
}

