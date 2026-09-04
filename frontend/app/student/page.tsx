"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { CardSkeleton, StatCardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState, EmptyState } from "@/components/ui/ErrorState";
import {
  QrCodeIcon,
  BookOpenIcon,
  CheckCircleIcon,
  HeartbeatIcon,
  GraduationCapIcon,
  UserXIcon,
  ShieldCheckIcon,
  CodeIcon,
  DatabaseIcon,
  CalendarCheckIcon,
  ChartSummaryIcon,
  ClockIcon,
  PinIcon,
  AlertCircleIcon,
} from "@/components/ui/icons";
import { apiFetch } from "@/lib/api";
import { StudentAttendanceSummary } from "@/types";

export default function StudentDashboardPage() {
  const [summary, setSummary] = useState<StudentAttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<StudentAttendanceSummary>("/student/attendance/summary");
      if (res.data) {
        setSummary(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load student attendance summary.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const overallPct = summary?.overall.overallAttendancePercentage ?? 0;
  const isHealthy = overallPct >= 75;
  const isWarning = overallPct >= 60 && overallPct < 75;

  // Circular progress ring parameters
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * overallPct) / 100;

  // Helper to pick subject icon based on name/code
  const getSubjectIcon = (name: string, code: string) => {
    const combined = `${name} ${code}`.toLowerCase();
    if (combined.includes("code") || combined.includes("program") || combined.includes("network") || combined.includes("cse")) {
      return <CodeIcon className="w-4 h-4 text-emerald-400" />;
    }
    if (combined.includes("data") || combined.includes("db") || combined.includes("sql")) {
      return <DatabaseIcon className="w-4 h-4 text-purple-400" />;
    }
    return <BookOpenIcon className="w-4 h-4 text-blue-400" />;
  };

  return (
    <DashboardLayout allowedRoles={["STUDENT"]}>
      <div className="space-y-6">
        {error ? (
          <ErrorState message={error} onRetry={fetchSummary} />
        ) : (
          <>
            {/* Top Row: Overall Attendance & Primary Stat Cards Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-4">
                  <CardSkeleton />
                </div>
                <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Overall Attendance Rate Visual Card */}
                <div className="lg:col-span-4 bg-[#121929] border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-md group">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      OVERALL ATTENDANCE RATE
                    </span>
                    <span
                      className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${
                        isHealthy
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : isWarning
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      {isHealthy ? "On Track" : isWarning ? "Fair Attendance" : "Low Attendance"}
                    </span>
                  </div>

                  <div className="flex items-center gap-5 my-3">
                    {/* SVG Circular Progress Ring */}
                    <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 90 90">
                        <circle
                          cx="45"
                          cy="45"
                          r={radius}
                          stroke="#1a2436"
                          strokeWidth="7"
                          fill="transparent"
                        />
                        <circle
                          cx="45"
                          cy="45"
                          r={radius}
                          stroke={isHealthy ? "#10b981" : isWarning ? "#f59e0b" : "#f43f5e"}
                          strokeWidth="7"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          fill="transparent"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-emerald-400">
                        <HeartbeatIcon className="w-6 h-6 animate-pulse" />
                      </div>
                    </div>

                    <div>
                      <div className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                        {overallPct}%
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Calculated from {summary?.overall.totalCompletedSessions ?? 0} closed sessions
                      </p>
                    </div>
                  </div>

                  {/* Sparkline Curve Graphic at bottom */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Performance trend</span>
                    <svg className="w-24 h-6 text-emerald-400" viewBox="0 0 100 30" fill="none">
                      <path
                        d="M0 25 Q 25 15, 50 20 T 100 5"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                      />
                    </svg>
                  </div>
                </div>

                {/* 4 Top Primary Stat Cards */}
                <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Total Completed */}
                  <div className="p-4 bg-[#121929] border border-slate-800/80 rounded-2xl flex flex-col justify-between shadow-md relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                        <GraduationCapIcon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400">Completed</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl font-extrabold text-white">
                        {summary?.overall.totalCompletedSessions ?? 0}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Closed sessions</div>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
                      <div className="bg-emerald-500 h-full w-full"></div>
                    </div>
                  </div>

                  {/* Attended */}
                  <div className="p-4 bg-[#121929] border border-slate-800/80 rounded-2xl flex flex-col justify-between shadow-md relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                        <CheckCircleIcon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400">Attended</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl font-extrabold text-white">
                        {summary?.overall.totalAttended ?? 0}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Sessions attended</div>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
                      <div className="bg-blue-500 h-full w-4/5"></div>
                    </div>
                  </div>

                  {/* Absent */}
                  <div className="p-4 bg-[#121929] border border-slate-800/80 rounded-2xl flex flex-col justify-between shadow-md relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                        <UserXIcon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400">Absent</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl font-extrabold text-white">
                        {summary?.overall.totalAbsent ?? 0}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Sessions missed</div>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
                      <div className="bg-rose-500 h-full w-1/4"></div>
                    </div>
                  </div>

                  {/* Subjects Enrolled */}
                  <div className="p-4 bg-[#121929] border border-slate-800/80 rounded-2xl flex flex-col justify-between shadow-md relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                        <BookOpenIcon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400">Enrolled</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl font-extrabold text-white">
                        {summary?.subjectWise.length ?? 0}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Active courses</div>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
                      <div className="bg-purple-500 h-full w-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Secondary Quick Metrics Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {isLoading ? (
                <>
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </>
              ) : (
                <>
                  <StatCard
                    title="Enrolled Subjects"
                    value={summary?.subjectWise.length ?? 0}
                    subtitle="Active semester courses"
                    icon={<BookOpenIcon className="w-5 h-5" />}
                    accentColor="purple"
                    href="/student/attendance"
                  />
                  <StatCard
                    title="Attended Classes"
                    value={summary?.overall.totalAttended ?? 0}
                    subtitle="Verified attendance entries"
                    icon={<CalendarCheckIcon className="w-5 h-5" />}
                    accentColor="blue"
                    href="/student/attendance"
                  />
                  <StatCard
                    title="Absences"
                    value={summary?.overall.totalAbsent ?? 0}
                    subtitle="Derived unrecorded closed sessions"
                    icon={<AlertCircleIcon className="w-5 h-5" />}
                    accentColor="rose"
                    href="/student/attendance"
                  />
                </>
              )}
            </div>

            {/* Main Content Split Grid: Subject Table (Left) & QR Scanner Frame (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Subject-Wise Attendance Summary Table */}
              <div className="lg:col-span-8 bg-[#121929] border border-slate-800/80 rounded-2xl overflow-hidden shadow-md flex flex-col justify-between">
                <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-500/15 border border-purple-500/30 text-purple-400 rounded-xl">
                      <ChartSummaryIcon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Subject-Wise Attendance Summary
                    </h3>
                  </div>
                  <Link
                    href="/student/attendance"
                    className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
                  >
                    View Details
                  </Link>
                </div>

                {isLoading ? (
                  <div className="p-6">
                    <CardSkeleton />
                  </div>
                ) : !summary || summary.subjectWise.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      title="No course records found"
                      message="No closed sessions exist for your enrolled subjects yet."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[11px] uppercase bg-[#182236] text-slate-400 font-semibold border-b border-slate-800/80 tracking-wider">
                        <tr>
                          <th className="px-5 py-3.5">SUBJECT NAME</th>
                          <th className="px-5 py-3.5">CODE</th>
                          <th className="px-5 py-3.5 text-center">CLOSED SESSIONS</th>
                          <th className="px-5 py-3.5 text-center">ATTENDED</th>
                          <th className="px-5 py-3.5 text-center">ABSENT</th>
                          <th className="px-5 py-3.5 text-right">ATTENDANCE RATE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {summary.subjectWise.map((sub) => {
                          const pct = sub.attendancePercentage;
                          const subHealthy = pct >= 75;
                          const subWarning = pct >= 60 && pct < 75;

                          return (
                            <tr
                              key={sub.subjectId}
                              className="hover:bg-[#1a2438]/50 transition-colors"
                            >
                              <td className="px-5 py-4 font-medium text-white flex items-center gap-3">
                                <div className="p-2 bg-[#1b253b] border border-slate-700/50 rounded-xl shrink-0">
                                  {getSubjectIcon(sub.subjectName, sub.subjectCode)}
                                </div>
                                <span>{sub.subjectName}</span>
                              </td>
                              <td className="px-5 py-4 text-xs font-mono text-slate-400">
                                {sub.subjectCode}
                              </td>
                              <td className="px-5 py-4 text-center font-semibold text-slate-300">
                                {sub.totalClosedSessions}
                              </td>
                              <td className="px-5 py-4 text-center font-bold text-emerald-400">
                                {sub.attendedClosedSessions}
                              </td>
                              <td className="px-5 py-4 text-center font-bold text-rose-400">
                                {sub.absentClosedSessions}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <span
                                  className={`inline-flex px-3 py-1 text-xs font-extrabold rounded-full border ${
                                    subHealthy
                                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                      : subWarning
                                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                      : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                                  }`}
                                >
                                  {pct}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Right Column: QR Scanner & Location Verification Card */}
              <div className="lg:col-span-4 bg-[#121929] border border-slate-800/80 rounded-2xl p-5 shadow-md flex flex-col justify-between space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                    <QrCodeIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-snug">
                      QR Scanner & Location Verification
                    </h3>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Live dynamic camera scanning and proximity verification will be enabled in Step 17.
                    </p>
                  </div>
                </div>

                {/* Viewport Frame Graphic */}
                <div className="bg-[#0b101c] border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden space-y-4 min-h-[220px]">
                  {/* Bracket corners */}
                  <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm"></div>
                  <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm"></div>
                  <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm"></div>
                  <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-emerald-400 rounded-br-sm"></div>

                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-pulse">
                    <QrCodeIcon className="w-8 h-8" />
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>Scanner Ready</span>
                  </div>

                  <button
                    disabled
                    className="w-full py-2.5 px-4 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs font-semibold text-slate-400 flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <ClockIcon className="w-4 h-4" />
                    <span>Scanner Ready in Step 17</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Row: Location Status Banner */}
            <div className="p-5 bg-[#121929] border border-slate-800/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center shrink-0">
                  <ShieldCheckIcon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Stay within the class location</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Make sure you are within the allowed area to mark your attendance successfully.
                  </p>
                </div>
              </div>

              <Link
                href="/student/scan"
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shrink-0"
              >
                <PinIcon className="w-4 h-4 text-emerald-400" />
                <span>View Location Status</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
