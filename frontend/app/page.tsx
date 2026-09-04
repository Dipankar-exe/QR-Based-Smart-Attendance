"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (user?.role === "ADMIN") {
        router.replace("/admin");
      } else if (user?.role === "TEACHER") {
        router.replace("/teacher");
      } else if (user?.role === "STUDENT") {
        router.replace("/student");
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
        <div className="text-sm font-medium tracking-wide text-slate-300">
          Redirecting to Smart Attendance System...
        </div>
      </div>
    </div>
  );
}
