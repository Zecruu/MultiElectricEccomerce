"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; roles: ("employee"|"admin")[] };
const baseItems: Item[] = [
  { href: "/employee/dashboard", label: "Dashboard", roles: ["employee","admin"] },
  { href: "/employee/orders", label: "Orders", roles: ["employee","admin"] },
  { href: "/employee/fulfillment", label: "Fulfillment", roles: ["employee","admin"] },
  { href: "/employee/clients", label: "Clients", roles: ["employee","admin"] },
  { href: "/employee/users", label: "Users", roles: ["admin"] },
  { href: "/employee/inventory", label: "Inventory", roles: ["admin"] },
  { href: "/employee/reports", label: "Reports", roles: ["admin"] },
  { href: "/employee/settings", label: "Settings", roles: ["employee","admin"] },
  { href: "/employee/profile", label: "Profile", roles: ["employee","admin"] },
];

export default function Sidebar({ role }:{ role: 'employee'|'admin'|null }){
  const pathname = usePathname();
  let items = (!role ? [] : baseItems.filter(i=>i.roles.includes(role))).map(i=>{
    // Route tweak: send admins to /admin/reports instead of /employee/reports
    if (i.label === 'Reports' && role === 'admin') {
      return { ...i, href: '/admin/reports' } as Item;
    }
    return i;
  });
  if (role === 'admin') {
    items = [
      ...items,
      { href: '/admin/categories', label: 'Categories', roles: ['admin'] },
    ];
  }
  return (
    <aside className="fixed top-14 bottom-0 left-0 w-60 border-r border-neutral-800 bg-neutral-950/60 backdrop-blur overflow-y-auto">
      <nav className="py-3">
        {items.map(i=>{
          const active = pathname.startsWith(i.href);
          return (
            <Link key={i.href} href={i.href} className={`block mx-3 my-1 px-3 py-2 rounded-lg border text-sm ${active? 'border-sky-700 bg-sky-900/30 text-white' : 'border-neutral-800 text-white/80 hover:text-white hover:bg-neutral-900'}`}>
              {i.label}
            </Link>
          );
        })}
        {/* Divider */}
        <div className="mx-3 my-3 h-px bg-neutral-900" />
      </nav>
    </aside>
  );
}
