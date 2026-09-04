"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { CardSkeleton, StatCardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState, EmptyState } from "@/components/ui/ErrorState";
import {
  BookOpenIcon,
  QrCodeIcon,
  ChartSummaryIcon,
  ChevronRightIcon,
  BriefcaseIcon,
  CodeIcon,
  DatabaseIcon,
  ClockIcon,
} from "@/components/ui/icons";
import { apiFetch } from "@/lib/api";
import {
  TeacherAssignment,
  TeacherSessionSummary,
  TeacherAggregateSummaryItem,
} from "@/types";

export default function TeacherDashboardPage() {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [sessions, setSessions] = useState<TeacherSessionSummary[]>([]);
  const [summaries, setSummaries] = useState<TeacherAggregateSummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [assignRes, sessRes, sumRes] = await Promise.all([
        apiFetch<TeacherAssignment[]>("/teacher/assignments"),
        apiFetch<TeacherSessionSummary[]>("/teacher/attendance-sessions?limit=5"),
        apiFetch<TeacherAggregateSummaryItem[]>("/teacher/attendance-summary"),
      ]);

      if (assignRes.data) setAssignments(assignRes.data);
      if (sessRes.data) setSessions(sessRes.data);
      if (sumRes.data) setSummaries(sumRes.data);
    } catch (err: any) {
      setError(err.message || "Failed to load teacher dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeSession = sessions.find((s) => s.status === "ACTIVE");

  // Helper to pick subject icon badge
  const getSubjectIcon = (name: string, code: string, index: number) => {
    const combined = `${name} ${code}`.toLowerCase();
    if (combined.includes("code") || combined.includes("program") || combined.includes("network") || combined.includes("cse")) {
      return <CodeIcon className="w-4 h-4 text-emerald-400" />;
    }
    if (combined.includes("data") || combined.includes("db") || combined.includes("sql")) {
      return <DatabaseIcon className="w-4 h-4 text-purple-400" />;
    }
    const colors = ["text-blue-400", "text-amber-400", "text-teal-400"];
    const color = colors[index % colors.length];
    return <BookOpenIcon className={`w-4 h-4 ${color}`} />;
  };

  return (
    <DashboardLayout allowedRoles={["TEACHER"]}>
      <div className="space-y-6">
        {error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : (
          <>
            {/* Top Row: Active Attendance Session & Metric Cards */}
            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-5">
                  <CardSkeleton />
                </div>
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Active Attendance Session Large Card */}
                <div className="lg:col-span-5 bg-gradient-to-br from-[#0c1825] via-[#0d1c2b] to-[#0a1420] border border-emerald-500/30 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-lg group">
                  {/* Radar sweep background graphic */}
                  <svg className="absolute -right-8 -bottom-8 w-48 h-48 opacity-15 pointer-events-none text-emerald-400" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="1" fill="none" />
                    <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" fill="none" />
                    <circle cx="50" cy="50" r="15" stroke="currentColor" strokeWidth="1" fill="none" />
                    <path d="M50 50 L85 15" stroke="currentColor" strokeWidth="1.5" />
                  </svg>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        LIVE
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Active Attendance Session
                    </span>
                  </div>

                  {activeSession ? (
                    <div className="my-4 space-y-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                          <QrCodeIcon className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                          <div className="text-lg font-bold text-white leading-tight">
                            {activeSession.subject.name}
                          </div>
                          <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                            {activeSession.subject.code}
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 space-y-1 pl-1">
                        <div>Class: <span className="font-semibold text-white">{activeSession.academicClass.name} (Sec {activeSession.academicClass.section})</span></div>
                        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                          <ClockIcon className="w-3.5 h-3.5" />
                          <span>Started at {new Date(activeSession.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Link
                          href={`/teacher/attendance/${activeSession.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-md"
                        >
                          <span>Manage Session</span>
                          <ChevronRightIcon className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="my-4 space-y-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-400 flex items-center justify-center shrink-0">
                          <QrCodeIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-base font-bold text-white">
                            No Active Attendance Session
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Ready to start a class? Launch a new live session with dynamic QR code.
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Link
                          href="/teacher/attendance"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-md"
                        >
                          <span>Start Session</span>
                          <ChevronRightIcon className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Proximity verification enabled</span>
                    <span className="text-emerald-400 font-medium">Dynamic QR Ready</span>
                  </div>
                </div>

                {/* 3 Compact Metric Cards */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard
                    title="Assigned Teaching Courses"
                    value={assignments.length}
                    subtitle="Courses assigned"
                    icon={<BookOpenIcon className="w-5 h-5" />}
                    accentColor="blue"
                    href="/teacher/attendance"
                  />
                  <StatCard
                    title="Recent Sessions"
                    value={sessions.length}
                    subtitle="Sessions conducted"
                    icon={<QrCodeIcon className="w-5 h-5" />}
                    accentColor="purple"
                    href="/teacher/attendance"
                  />
                  <StatCard
                    title="Completed Subject Summaries"
                    value={summaries.length}
                    subtitle="Subjects completed"
                    icon={<ChartSummaryIcon className="w-5 h-5" />}
                    accentColor="amber"
                    href="/teacher/attendance"
                  />
                </div>
              </div>
            )}

            {/* Middle Grid: My Teaching Assignments & Closed Session Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: My Teaching Assignments */}
              <div className="lg:col-span-5 bg-[#121929] border border-slate-800/80 rounded-2xl p-5 shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded-xl">
                        <BriefcaseIcon className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        My Teaching Assignments
                      </h3>
                    </div>
                  </div>

                  {isLoading ? (
                    <CardSkeleton />
                  ) : assignments.length === 0 ? (
                    <EmptyState
                      title="No assignments found"
                      message="You currently have no class assignments."
                    />
                  ) : (
                    <div className="space-y-3">
                      {assignments.map((asg, idx) => (
                        <Link
                          key={asg.id}
                          href="/teacher/attendance"
                          className="p-3.5 rounded-xl bg-[#172033] hover:bg-[#1c273e] border border-slate-800/80 flex items-center justify-between transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-[#121929] border border-slate-700/50 rounded-xl shrink-0">
                              {getSubjectIcon(asg.subject.name, asg.subject.code, idx)}
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                                {asg.subject.name} ({asg.subject.code})
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {asg.teacher?.department?.code || "CSE"} • Semester {asg.academicClass.semester} • Section {asg.academicClass.section}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                              Assigned
                            </span>
                            <ChevronRightIcon className="w-4 h-4 text-slate-500 group-hover:text-slate-200 transition-colors" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {assignments.length > 0 && (
                  <div className="pt-4 mt-4 border-t border-slate-800/80 text-center">
                    <Link
                      href="/teacher/attendance"
                      className="text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
                    >
                      <span>View All Assignments</span>
                      <ChevronRightIcon className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Right Column: Closed Session Performance Table */}
              <div className="lg:col-span-7 bg-[#121929] border border-slate-800/80 rounded-2xl overflow-hidden shadow-md flex flex-col justify-between">
                <div>
                  <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-purple-500/15 border border-purple-500/30 text-purple-400 rounded-xl">
                        <ChartSummaryIcon className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        Closed Session Performance
                      </h3>
                    </div>
                    <Link
                      href="/teacher/attendance"
                      className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
                    >
                      View All
                    </Link>
                  </div>

                  {isLoading ? (
                    <div className="p-6">
                      <CardSkeleton />
                    </div>
                  ) : summaries.length === 0 ? (
                    <div className="p-6">
                      <EmptyState
                        title="No completed session stats"
                        message="Close an active session to view aggregate performance metrics."
                      />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-[11px] uppercase bg-[#182236] text-slate-400 font-semibold border-b border-slate-800/80 tracking-wider">
                          <tr>
                            <th className="px-5 py-3.5">Subject</th>
                            <th className="px-5 py-3.5">Class / Semester</th>
                            <th className="px-5 py-3.5 text-center">Sessions</th>
                            <th className="px-5 py-3.5 text-center">Attendance</th>
                            <th className="px-5 py-3.5 text-right">Attended</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {summaries.map((sum, i) => {
                            const pct = sum.averageAttendancePercentage;
                            const isExc = pct >= 90;
                            const isGood = pct >= 75 && pct < 90;
                            const isWarn = pct >= 60 && pct < 75;

                            return (
                              <tr
                                key={i}
                                className="hover:bg-[#1a2438]/50 transition-colors"
                              >
                                <td className="px-5 py-4 font-bold text-white">
                                  {sum.subject.name}
                                </td>
                                <td className="px-5 py-4 text-xs text-slate-400">
                                  {sum.academicClass.name}
                                </td>
                                <td className="px-5 py-4 text-center font-semibold text-slate-300">
                                  {sum.completedSessions}
                                </td>
                                <td className="px-5 py-4 text-center">
                                  <span
                                    className={`inline-flex px-3 py-1 text-xs font-extrabold rounded-full border ${
                                      isExc
                                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                        : isGood
                                        ? "bg-teal-500/20 text-teal-400 border-teal-500/30"
                                        : isWarn
                                        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                        : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                                    }`}
                                  >
                                    {pct}%
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-right text-xs font-mono font-medium text-slate-300">
                                  {sum.totalRecordedAttendances} / {sum.totalPossibleAttendances}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Row: Start a New Attendance Session CTA Banner */}
            <div className="p-6 bg-gradient-to-r from-[#0d1f1b] via-[#0c1825] to-[#09111c] border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg relative overflow-hidden">
              {/* Classroom background graphic */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-10 hidden md:block">
                <svg className="w-64 h-32 text-emerald-400" viewBox="0 0 200 100" fill="none">
                  <rect x="20" y="20" width="40" height="30" rx="6" stroke="currentColor" strokeWidth="2" />
                  <rect x="80" y="20" width="40" height="30" rx="6" stroke="currentColor" strokeWidth="2" />
                  <rect x="140" y="20" width="40" height="30" rx="6" stroke="currentColor" strokeWidth="2" />
                  <circle cx="100" cy="80" r="15" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>

              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <QrCodeIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Start a New Attendance Session</h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    Generate a new QR code and start marking attendance for your class in real-time.
                  </p>
                </div>
              </div>

              <Link
                href="/teacher/attendance"
                className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] shrink-0 relative z-10"
              >
                <QrCodeIcon className="w-5 h-5" />
                <span>Start Attendance</span>
              </Link>
            </div>

            {/* Footer */}
            <div className="pt-2 text-center text-xs text-slate-500">
              © 2026 Smart Attendance • All rights reserved.
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
