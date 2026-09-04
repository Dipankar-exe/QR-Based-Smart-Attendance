"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, Role } from "@/types";
import { apiFetch, setOnAuthFailedCallback } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email?: string; registrationNumber?: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearAuth = useCallback(() => {
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiFetch<User>("/auth/me");
      if (res.data) {
        setUser(res.data);
      } else {
        clearAuth();
      }
    } catch {
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  }, [clearAuth]);

  // Initial Bootstrap
  useEffect(() => {
    setOnAuthFailedCallback(() => {
      clearAuth();
      setIsLoading(false);
    });

    refreshUser();
  }, [refreshUser, clearAuth]);

  const login = async (credentials: { email?: string; registrationNumber?: string; password: string }): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await apiFetch<User>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });

      if (res.data) {
        setUser(res.data);
        return res.data;
      }
      throw new Error(res.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // Ignore logout API errors, clear local state anyway
    } finally {
      clearAuth();
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    role: user ? user.role : null,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
