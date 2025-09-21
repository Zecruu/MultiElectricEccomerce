"use client";
import { usePathname } from "next/navigation";
import PublicNavbar from "./PublicNavbar";

export default function NavSwitcher() {
  const pathname = usePathname();
  if (pathname && pathname.startsWith("/employee")) return null;
  return <PublicNavbar />;
}

