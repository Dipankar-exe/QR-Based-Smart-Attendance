"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, getAvatarUrl } from "@/lib/api";
import { XIcon, AlertCircleIcon, CheckCircleIcon } from "../ui/icons";

interface ProfilePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfilePhotoModal({ isOpen, onClose }: ProfilePhotoModalProps) {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "ST";

  const currentAvatarSrc = user?.avatarUrl ? getAvatarUrl(user.avatarUrl) : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError("Invalid image file format. Please upload a JPG, JPEG, PNG, or WebP photo.");
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    // Validate Max File Size (5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError("File size exceeds 5MB limit. Please choose a smaller image.");
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setSelectedFile(file);

    // Generate local preview URL
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !previewUrl) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await apiFetch("/user/avatar", {
        method: "POST",
        body: JSON.stringify({ image: previewUrl }),
      });

      await refreshUser();
      setSuccessMsg("Profile photo updated successfully!");
      setTimeout(() => {
        onClose();
        resetState();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to upload profile photo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await apiFetch("/user/avatar", {
        method: "DELETE",
      });

      await refreshUser();
      setSuccessMsg("Profile photo removed.");
      setTimeout(() => {
        onClose();
        resetState();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to remove profile photo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setSuccessMsg(null);
  };

  const handleModalClose = () => {
    resetState();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#121929] border border-slate-800 text-white rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <h3 className="text-base font-bold tracking-tight text-white">
            Passport Profile Photo
          </h3>
          <button
            onClick={handleModalClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Banners */}
        {error && (
          <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircleIcon className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Avatar Display Container */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative group">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Photo preview"
                className="w-28 h-28 rounded-full object-cover border-2 border-emerald-400 shadow-lg"
              />
            ) : currentAvatarSrc ? (
              <img
                src={currentAvatarSrc}
                alt={user?.name || "User"}
                className="w-28 h-28 rounded-full object-cover border-2 border-emerald-500/50 shadow-lg"
                onError={(e) => {
                  // Fallback to initials if image fails to load
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 font-extrabold text-2xl flex items-center justify-center border-2 border-emerald-300/40 shadow-lg">
                {initials}
              </div>
            )}
          </div>

          <div className="text-center space-y-1">
            <div className="text-sm font-bold text-white">{user?.name}</div>
            <div className="text-xs text-slate-400">
              Upload a clear passport-size photo (JPG, PNG, WebP up to 5MB)
            </div>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Modal Actions */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          {!selectedFile ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Choose Passport Photo
              </button>

              {user?.avatarUrl && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDelete}
                  className="py-2.5 px-4 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleUpload}
                className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? "Uploading..." : "Save Photo"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel Selection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
