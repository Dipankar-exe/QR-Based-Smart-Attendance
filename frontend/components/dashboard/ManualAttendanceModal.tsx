"use client";

import React, { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "../ui/Button";
import { AlertCircleIcon, XIcon } from "../ui/icons";

interface ManualAttendanceModalProps {
  sessionId: string;
  student: {
    studentId: string;
    registrationNumber: string;
    name: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManualAttendanceModal({
  sessionId,
  student,
  isOpen,
  onClose,
  onSuccess,
}: ManualAttendanceModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 5 || trimmedReason.length > 200) {
      setError("Reason must be between 5 and 200 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch(`/teacher/attendance-sessions/${sessionId}/manual-attendance`, {
        method: "POST",
        body: JSON.stringify({
          studentId: student.studentId,
          reason: trimmedReason,
        }),
      });

      setReason("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to mark manual attendance.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <XIcon />
        </button>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
          Manual Attendance / Fallback
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Manually mark attendance for <span className="font-semibold text-slate-800 dark:text-slate-200">{student.name}</span> ({student.registrationNumber}).
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-start gap-2">
            <AlertCircleIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Audit Reason (Mandatory, 5-200 chars)
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Indoor GPS accuracy failure or location permission issue"
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              disabled={isSubmitting}
              required
              minLength={5}
              maxLength={200}
            />
            <div className="text-[10px] text-slate-400 text-right mt-1">
              {reason.length} / 200
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-amber-600 hover:bg-amber-500 text-white"
              isLoading={isSubmitting}
            >
              Confirm Manual Fallback
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
