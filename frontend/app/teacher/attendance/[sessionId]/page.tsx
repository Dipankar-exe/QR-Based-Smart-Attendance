"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { QrRenderer } from "@/components/qr/QrRenderer";
import { ManualAttendanceModal } from "@/components/dashboard/ManualAttendanceModal";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  UsersIcon,
  XIcon,
  FileTextIcon,
  ChartSummaryIcon,
  InfoIcon,
} from "@/components/ui/icons";
import { apiFetch } from "@/lib/api";

interface StudentRosterItem {
  studentId: string;
  registrationNumber: string;
  name: string;
  isActive: boolean;
  isMarked: boolean;
  attendance: {
    id: string;
    status: string;
    markedAt: string;
    verificationMethod: string;
  } | null;
}

interface SessionData {
  id: string;
  status: string;
  startTime: string;
  academicClass: { name: string; semester: number; section: string };
  subject: { name: string; code: string };
}

export default function TeacherLiveSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [roster, setRoster] = useState<StudentRosterItem[]>([]);

  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Live session duration counter
  const [durationStr, setDurationStr] = useState<string>("00:00:00");

  // Manual Fallback Modal State
  const [manualStudent, setManualStudent] = useState<{
    studentId: string;
    registrationNumber: string;
    name: string;
  } | null>(null);

  const rosterTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const res = await apiFetch<SessionData>(`/teacher/attendance-sessions/${sessionId}`);
      if (res.data) {
        setSession(res.data);
        if (res.data.status === "CLOSED" || res.data.status === "CANCELLED") {
          router.replace(`/teacher/attendance/${sessionId}/report`);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load session details.");
    } finally {
      setIsLoadingSession(false);
    }
  }, [sessionId, router]);

  const fetchRoster = useCallback(async () => {
    try {
      const res = await apiFetch<StudentRosterItem[]>(`/teacher/attendance-sessions/${sessionId}/students`);
      if (res.data) {
        setRoster(res.data);
      }
    } catch {
      // Ignore background polling errors silently
    }
  }, [sessionId]);

  // Duration timer update
  useEffect(() => {
    if (!session?.startTime) return;

    const updateDuration = () => {
      const startMs = new Date(session.startTime).getTime();
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));

      const hrs = String(Math.floor(diffSec / 3600)).padStart(2, "0");
      const mins = String(Math.floor((diffSec % 3600) / 60)).padStart(2, "0");
      const secs = String(diffSec % 60).padStart(2, "0");

      setDurationStr(`${hrs}:${mins}:${secs}`);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [session?.startTime]);

  // Polling setup with tab visibility check
  useEffect(() => {
    fetchSession();
    fetchRoster();

    rosterTimerRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchRoster();
      }
    }, 4000);

    return () => {
      if (rosterTimerRef.current) clearInterval(rosterTimerRef.current);
    };
  }, [fetchSession, fetchRoster]);

  const handleCloseSession = async () => {
    if (!window.confirm("Are you sure you want to close this attendance session? Unmarked students will be marked ABSENT.")) {
      return;
    }

    setIsClosing(true);
    setError(null);
    try {
      await apiFetch(`/teacher/attendance-sessions/${sessionId}/close`, { method: "PATCH" });
      router.push(`/teacher/attendance/${sessionId}/report`);
    } catch (err: any) {
      setError(err.message || "Failed to close session.");
      setIsClosing(false);
    }
  };

  const handleCancelSession = async () => {
    if (!window.confirm("Are you sure you want to CANCEL this session? (Only allowed if 0 attendance records exist).")) {
      return;
    }

    setIsCancelling(true);
    setError(null);
    try {
      await apiFetch(`/teacher/attendance-sessions/${sessionId}/cancel`, { method: "PATCH" });
      router.push(`/teacher/attendance/${sessionId}/report`);
    } catch (err: any) {
      setError(err.message || "Failed to cancel session.");
      setIsCancelling(false);
    }
  };

  const markedCount = roster.filter((r) => r.isMarked).length;
  const totalCount = roster.length;
  const attendancePercentage = totalCount > 0 ? Math.round((markedCount / totalCount) * 100) : 0;

  // Helper for student avatar initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DashboardLayout allowedRoles={["TEACHER"]}>
      <div className="space-y-6">
        {/* Active Session Header Control Card */}
        <div className="bg-gradient-to-r from-[#0c1825] via-[#0d1c2b] to-[#0a1420] border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden shadow-lg">
          {/* Background Radar Graphic */}
          <svg className="absolute right-48 top-1/2 -translate-y-1/2 w-48 h-48 opacity-15 pointer-events-none text-emerald-400 hidden lg:block" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" fill="none" />
            <circle cx="50" cy="50" r="15" stroke="currentColor" strokeWidth="1" fill="none" />
            <path d="M50 50 L85 15" stroke="currentColor" strokeWidth="1.5" />
          </svg>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
                <span className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE SESSION ACTIVE
                </span>
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                {session?.subject.name} ({session?.subject.code})
              </h2>

              <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>Class: <strong className="text-white">{session?.academicClass.name} (Sec {session?.academicClass.section})</strong></span>
                <span>•</span>
                <span>Sem {session?.academicClass.semester}</span>
              </div>

              {/* Compact Session Metadata */}
              <div className="pt-2 flex flex-wrap items-center gap-6 text-xs border-t border-slate-800/80 text-slate-400">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Session ID</span>
                  <span className="font-mono text-slate-300 font-semibold">{sessionId ? `SES-${sessionId.slice(0, 8)}...` : "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Started At</span>
                  <span className="font-mono text-slate-300 font-semibold">
                    {session?.startTime ? new Date(session.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Duration</span>
                  <span className="font-mono text-emerald-400 font-bold">{durationStr}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="outline"
                size="md"
                onClick={handleCancelSession}
                isLoading={isCancelling}
                disabled={isClosing}
                className="border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl text-xs font-semibold gap-1.5"
              >
                <XIcon className="w-4 h-4 text-slate-400" />
                <span>Cancel Session</span>
              </Button>

              <Button
                size="md"
                onClick={handleCloseSession}
                isLoading={isClosing}
                disabled={isCancelling}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs gap-2 shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all"
              >
                <FileTextIcon className="w-4 h-4" />
                <span>Close Session & Generate Report</span>
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-sm flex items-start gap-3">
            <AlertCircleIcon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {isLoadingSession ? (
          <CardSkeleton />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Live QR Column (42% on lg) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <QrRenderer sessionId={sessionId} />
            </div>

            {/* Live Roster Column (58% on lg) */}
            <div className="lg:col-span-7 bg-[#121929] rounded-2xl border border-slate-800/80 shadow-lg overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-500/15 border border-purple-500/30 text-purple-400 rounded-xl">
                      <UsersIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base tracking-tight">
                        LIVE ATTENDANCE ROSTER
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Real-time student check-in status
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full inline-block">
                      {markedCount} / {totalCount} Marked
                    </div>
                    <div className="text-[11px] font-bold text-emerald-400 mt-1">
                      {attendancePercentage}% Attendance
                    </div>
                  </div>
                </div>

                {/* Roster Table */}
                <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[11px] uppercase bg-[#182236] text-slate-400 font-semibold border-b border-slate-800/80 sticky top-0 z-10 tracking-wider">
                      <tr>
                        <th className="px-4 py-3 text-center">#</th>
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3">Registration No.</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {roster.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-xs text-slate-400">
                            Loading student roster...
                          </td>
                        </tr>
                      ) : (
                        roster.map((st, idx) => (
                          <tr
                            key={st.studentId}
                            className="hover:bg-[#1a2438]/50 transition-colors"
                          >
                            <td className="px-4 py-3.5 text-center text-xs font-mono font-bold text-slate-400">
                              {idx + 1}
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-300/40">
                                  {getInitials(st.name)}
                                </div>
                                <span className="font-bold text-white text-sm">
                                  {st.name}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-3.5 text-xs font-mono text-slate-300">
                              {st.registrationNumber}
                            </td>

                            <td className="px-4 py-3.5 text-center">
                              {st.isMarked ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  <CheckCircleIcon className="w-3.5 h-3.5" />
                                  <span>Marked</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  <span>⌛ Pending</span>
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3.5 text-center">
                              {st.isMarked ? (
                                <span className="text-slate-500 text-xs">—</span>
                              ) : (
                                <button
                                  onClick={() => setManualStudent(st)}
                                  className="px-3 py-1 bg-slate-800 hover:bg-amber-950/40 border border-slate-700 hover:border-amber-500/40 text-amber-400 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                                >
                                  Manual Fallback
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Attendance Progress Panel */}
              <div className="p-5 border-t border-slate-800/80 bg-[#161f33]/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <div className="flex items-center gap-2">
                    <ChartSummaryIcon className="w-4 h-4 text-emerald-400" />
                    <span>Attendance Progress</span>
                  </div>
                  <span className="text-emerald-400 font-mono text-sm font-extrabold">
                    {attendancePercentage}%
                  </span>
                </div>

                <div className="w-full bg-[#182236] h-3 rounded-full overflow-hidden border border-slate-800/80">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                    style={{ width: `${attendancePercentage}%` }}
                  />
                </div>

                <div className="text-[11px] text-slate-400 font-medium pt-0.5">
                  {markedCount} of {totalCount} students marked
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Session Information & Control Card */}
        {session && (
          <div className="p-5 bg-[#121929] border border-slate-800/80 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="p-2.5 bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded-xl shrink-0">
                <InfoIcon className="w-5 h-5" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-6 gap-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Subject</span>
                  <span className="font-bold text-white truncate block">{session.subject.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Subject Code</span>
                  <span className="font-mono text-slate-300 font-bold block">{session.subject.code}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Class / Semester</span>
                  <span className="text-slate-300 font-semibold block">{session.academicClass.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Section</span>
                  <span className="text-slate-300 font-semibold block">Sec {session.academicClass.section}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Status</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    LIVE
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
              <Button
                variant="outline"
                size="md"
                onClick={handleCancelSession}
                isLoading={isCancelling}
                disabled={isClosing}
                className="w-full sm:w-auto border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl text-xs font-semibold gap-1.5"
              >
                <XIcon className="w-4 h-4 text-slate-400" />
                <span>Cancel Session</span>
              </Button>

              <div className="flex flex-col items-center sm:items-end w-full sm:w-auto">
                <Button
                  size="md"
                  onClick={handleCloseSession}
                  isLoading={isClosing}
                  disabled={isCancelling}
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs gap-2 shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all"
                >
                  <FileTextIcon className="w-4 h-4" />
                  <span>Close Session & Generate Report</span>
                </Button>
                <span className="text-[10px] text-slate-500 mt-1">
                  This will stop attendance and generate the final report.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Attendance Modal */}
      <ManualAttendanceModal
        sessionId={sessionId}
        student={manualStudent}
        isOpen={!!manualStudent}
        onClose={() => setManualStudent(null)}
        onSuccess={fetchRoster}
      />
    </DashboardLayout>
  );
}
