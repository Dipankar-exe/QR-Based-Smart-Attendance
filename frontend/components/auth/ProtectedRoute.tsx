"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Role } from "@/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // Redirect to user's correct home dashboard
        if (user.role === "ADMIN") router.replace("/admin");
        else if (user.role === "TEACHER") router.replace("/teacher");
        else if (user.role === "STUDENT") router.replace("/student");
      }
    }
  }, [isAuthenticated, isLoading, user, allowedRoles, router]);

  if (isLoading || !isAuthenticated || (allowedRoles && user && !allowedRoles.includes(user.role))) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
          <div className="text-sm font-medium tracking-wide text-slate-300">
            QR Attendance System
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
