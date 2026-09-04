"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Role } from "@/types";

interface DashboardLayoutProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function DashboardLayout({ children, allowedRoles }: DashboardLayoutProps) {
  const { role } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="min-h-screen flex bg-[#090d16] text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
        <Sidebar
          role={role}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0 bg-[#090d16]">
          <Header onMenuToggle={() => setSidebarOpen(true)} />
          <main className="flex-1 p-4 md:p-8 max-w-[1400px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
