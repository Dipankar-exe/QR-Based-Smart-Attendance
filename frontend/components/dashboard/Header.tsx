"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getAvatarUrl } from "@/lib/api";
import {
  MenuIcon,
  LogOutIcon,
  SunIcon,
  BellIcon,
  ChevronDownIcon,
  CameraIcon,
} from "../ui/icons";
import { ProfilePhotoModal } from "./ProfilePhotoModal";

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, role, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Reset image error state whenever user.avatarUrl changes
  useEffect(() => {
    setImgError(false);
  }, [user?.avatarUrl]);

  // Fallback initials for user avatar
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "ST";

  const avatarSrc = user?.avatarUrl ? getAvatarUrl(user.avatarUrl) : null;

  return (
    <>
      <header className="bg-[#0c101a] border-b border-slate-800/80 px-4 md:px-8 py-5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl"
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>

          <div className="space-y-0.5">
            <div className="text-xs font-normal text-slate-400">Welcome back,</div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Hello, {user?.name || "Student"} 👋
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              Track your class attendance performance across completed official sessions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          {/* Visual UI Theme Toggle Button */}
          <button
            className="p-2.5 bg-slate-800/60 border border-slate-700/60 hover:bg-slate-700/60 text-slate-300 rounded-xl transition-colors cursor-pointer"
            title="Theme (UI visual preview)"
          >
            <SunIcon className="w-4 h-4" />
          </button>

          {/* Visual UI Notification Bell Button */}
          <button
            className="p-2.5 bg-slate-800/60 border border-slate-700/60 hover:bg-slate-700/60 text-slate-300 rounded-xl transition-colors relative cursor-pointer"
            title="Notifications (UI visual preview)"
          >
            <BellIcon className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-[10px] font-bold text-slate-950 rounded-full flex items-center justify-center border-2 border-[#0c101a]">
              3
            </span>
          </button>

          {/* User Profile Pill & Dropdown */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 p-1.5 pl-2 pr-3 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 rounded-full transition-all cursor-pointer"
              >
                {/* Circular Passport Avatar or Initials Fallback */}
                {avatarSrc && !imgError ? (
                  <img
                    src={avatarSrc}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border border-emerald-400/80 shrink-0 shadow-xs"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-300/40">
                    {initials}
                  </div>
                )}

                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-white leading-tight">
                    {user.name}
                  </div>
                  <div className="inline-block mt-0.5 px-2 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-extrabold uppercase rounded-full">
                    {role}
                  </div>
                </div>
                <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 ml-1 hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-52 bg-[#131a2b] border border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-800/80">
                    <p className="text-xs font-bold text-white">{user.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setIsPhotoModalOpen(true);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-300 hover:bg-slate-800/80 flex items-center gap-2 transition-colors cursor-pointer border-b border-slate-800/50"
                  >
                    <CameraIcon className="w-4 h-4 text-emerald-400" />
                    <span>Upload / Edit Photo</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      logout();
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-medium text-rose-400 hover:bg-rose-950/30 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOutIcon className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Profile Photo Upload Modal */}
      <ProfilePhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
      />
    </>
  );
}
