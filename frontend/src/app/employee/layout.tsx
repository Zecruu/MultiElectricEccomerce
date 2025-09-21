"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import EmployeeShell from "@/components/portal/EmployeeShell";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<"customer"|"employee"|"admin"|null>(null); // display-only in shell
  const [perms, setPerms] = useState<{canManageProducts:boolean; canEditStock:boolean; canManageUsers:boolean} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const applyFromData = (data: any) => {
      const raw = (data?.role ?? data?.user?.role ?? "").toString().toLowerCase();
      const mapped = raw === "administrator" ? "admin" : raw;
      setRole(mapped as any);
      if (data?.permissions) {
        setPerms({
          canManageProducts: !!data.permissions.canManageProducts,
          canEditStock: !!data.permissions.canEditStock,
          canManageUsers: !!data.permissions.canManageUsers,
        });
      } else {
        // Fallback from role
        setPerms({
          canManageProducts: mapped === 'admin',
          canEditStock: mapped === 'admin' || mapped === 'employee',
          canManageUsers: mapped === 'admin',
        });
      }
    };

    const fetchMe = async (attempt = 0) => {
      try {
        const res = await apiGet("/api/me");
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          applyFromData(data);
          setLoading(false);
        } else if (attempt < 1) {
          // Retry once after a brief delay (cookies may not be visible immediately after login)
          setTimeout(() => { if (mounted) fetchMe(attempt + 1); }, 300);
        } else {
          setRole(null);
          setPerms(null);
          setLoading(false);
        }
      } catch {
        if (attempt < 1) {
          setTimeout(() => { if (mounted) fetchMe(attempt + 1); }, 300);
        } else {
          setRole(null);
          setPerms(null);
          setLoading(false);
        }
      }
    };

    fetchMe(0);
    return () => { mounted = false };
  }, []);

  const isStaff = !!(perms?.canEditStock || perms?.canManageProducts) || role === "employee" || role === "admin"; // fallback
  const isEmployeeRoot = pathname === "/employee";
  const canViewChildren = isStaff || isEmployeeRoot; // allow login page to render

  // Route-level permission checks (admins always allowed)
  const isAdmin = role === 'admin';
  const wantsUsers = pathname.startsWith("/employee/users") && !(isAdmin || !!perms?.canManageUsers);
  const wantsInventory = pathname.startsWith("/employee/inventory") && !(isAdmin || !!perms?.canEditStock || !!perms?.canManageProducts);
  const wantsReports = pathname.startsWith("/employee/reports") && !(isAdmin || !!perms?.canManageProducts);
  // Settings should always be accessible because everyone has at least the Account/Profile tab
  const isForbiddenRoute = isStaff && (wantsUsers || wantsInventory || wantsReports);

  // Redirects
  useEffect(() => {
    if (!loading && isStaff && isEmployeeRoot) {
      router.replace("/employee/dashboard");
    }
    if (!loading && isForbiddenRoute) {
      router.replace("/employee/dashboard?denied=1");
    }
  }, [loading, isStaff, isEmployeeRoot, isForbiddenRoute, router]);

  return (
    <>
      {loading ? (
        <div className="pt-16 pl-60 pr-4"><p className="text-white/70">Loading...</p></div>
      ) : canViewChildren ? (
        isEmployeeRoot ? (
          // show the login page content without shell
          <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
        ) : (
          <EmployeeShell role={isStaff ? (role as any) : null}>
            {children}
          </EmployeeShell>
        )
      ) : (
        <EmployeeShell role={isStaff ? (role as any) : null}>
          <div className="bg-neutral-900 border border-neutral-800 rounded p-6">
            <p className="text-white/80 mb-2">Acceso denegado</p>
            <p className="text-white/60">No tienes permisos para esta sección.</p>
          </div>
        </EmployeeShell>
      )}
    </>
  );
}

