"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EyeIcon, EyeOffIcon, AlertCircleIcon } from "@/components/ui/icons";

export default function LoginPage() {
  const { login, isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"STUDENT" | "STAFF">("STUDENT");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && user) {
      if (user.role === "ADMIN") router.replace("/admin");
      else if (user.role === "TEACHER") router.replace("/teacher");
      else if (user.role === "STUDENT") router.replace("/student");
    }
  }, [isAuthenticated, isAuthLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (activeTab === "STUDENT") {
      if (!registrationNumber.trim() || !password) {
        setError("Please enter both Registration Number and Password.");
        return;
      }
    } else {
      if (!email.trim() || !password) {
        setError("Please enter both Email Address and Password.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = activeTab === "STUDENT"
        ? { registrationNumber: registrationNumber.trim(), password }
        : { email: email.trim(), password };

      const loggedUser = await login(payload);
      if (loggedUser.role === "ADMIN") router.push("/admin");
      else if (loggedUser.role === "TEACHER") router.push("/teacher");
      else if (loggedUser.role === "STUDENT") router.push("/student");
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 rounded-xl mb-3 border border-emerald-500/20 font-bold text-xl">
            QR
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Smart Attendance System
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Sign in to access your dashboard
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-800 rounded-xl mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setActiveTab("STUDENT"); setError(null); }}
            className={`py-2 rounded-lg transition-colors ${
              activeTab === "STUDENT"
                ? "bg-emerald-500 text-slate-950 shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Student Login
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("STAFF"); setError(null); }}
            className={`py-2 rounded-lg transition-colors ${
              activeTab === "STAFF"
                ? "bg-emerald-500 text-slate-950 shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Teacher / Admin
          </button>
        </div>

        {error && (
          <div className="p-4 mb-6 rounded-lg bg-red-950/50 border border-red-800/50 text-red-300 text-sm flex items-start gap-3">
            <AlertCircleIcon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {activeTab === "STUDENT" ? (
            <Input
              label="Registration Number"
              type="text"
              placeholder="e.g. STU123456"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              disabled={isSubmitting}
              required
              autoComplete="username"
            />
          ) : (
            <Input
              label="Email Address"
              type="email"
              placeholder="you@institution.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
              autoComplete="email"
            />
          )}

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-200"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full mt-2 bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 focus:ring-emerald-500"
            isLoading={isSubmitting}
          >
            {activeTab === "STUDENT" ? "Sign In as Student" : "Sign In as Staff"}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
          QR-Based Smart Attendance System &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
