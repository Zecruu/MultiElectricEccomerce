"use client";
import { ReactNode } from "react";
import AppBar from "./AppBar";
import Sidebar from "./Sidebar";

export default function EmployeeShell({ role, children }:{ role: 'employee'|'admin'|null, children: ReactNode }){
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <AppBar role={role} />
      <Sidebar role={role} />
      <main className="pt-16 pl-60 pr-8 pb-8 w-full">
        {children}
      </main>
    </div>
  );
}

