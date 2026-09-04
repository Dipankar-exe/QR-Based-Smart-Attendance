"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatCardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  UsersIcon,
  TeacherIcon,
  QrCodeIcon,
  BookOpenIcon,
  BuildingIcon,
  ClipboardListIcon,
  ChevronRightIcon,
  ClockIcon,
  BellIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  InfoIcon,
} from "@/components/ui/icons";
import { apiFetch } from "@/lib/api";
import { AdminOverview } from "@/types";

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<AdminOverview>("/admin/attendance/overview");
      if (res.data) {
        setOverview(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load institution overview.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  // Calculate attendance health status badge
  const attendancePct = overview?.institutionAverageAttendancePercentage ?? 0;
  const isHealthy = attendancePct >= 75;
  const isWarning = attendancePct >= 60 && attendancePct < 75;
  const attendanceLabel = isHealthy ? "Healthy Rate" : isWarning ? "Needs Attention ⚠️" : "Low Attendance ⚠️";
  const attendancePositive = isHealthy;

  // Quick navigation modules list
  const navModules = [
    { name: "Departments", route: "/admin/departments", step: "Step 02", icon: <BuildingIcon className="w-5 h-5 text-emerald-400" />, accentBg: "bg-emerald-500/15 border-emerald-500/30" },
    { name: "Classes", route: "/admin/classes", step: "Step 03", icon: <UsersIcon className="w-5 h-5 text-blue-400" />, accentBg: "bg-blue-500/15 border-blue-500/30" },
    { name: "Subjects", route: "/admin/subjects", step: "Step 04", icon: <BookOpenIcon className="w-5 h-5 text-purple-400" />, accentBg: "bg-purple-500/15 border-purple-500/30" },
    { name: "Teachers", route: "/admin/teachers", step: "Step 05", icon: <TeacherIcon className="w-5 h-5 text-amber-400" />, accentBg: "bg-amber-500/15 border-amber-500/30" },
    { name: "Students", route: "/admin/students", step: "Step 06", icon: <UsersIcon className="w-5 h-5 text-cyan-400" />, accentBg: "bg-cyan-500/15 border-cyan-500/30" },
    { name: "Assignments", route: "/admin/assignments", step: "Step 07", icon: <ClipboardListIcon className="w-5 h-5 text-rose-400" />, accentBg: "bg-rose-500/15 border-rose-500/30" },
  ];

  return (
    <DashboardLayout allowedRoles={["ADMIN"]}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            Institution Overview
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            System-wide statistics and active attendance session status.
          </p>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={fetchOverview} />
        ) : (
          <>
            {/* 3-Column x 2-Row Metric Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {isLoading ? (
                <>
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </>
              ) : (
                <>
                  <StatCard
                    title="Total Students"
                    value={overview?.totalStudents ?? 0}
                    subtitle="Enrolled in active period"
                    icon={<UsersIcon className="w-5 h-5 text-emerald-400" />}
                    accentColor="emerald"
                    href="/admin/students"
                  />
                  <StatCard
                    title="Total Teachers"
                    value={overview?.totalTeachers ?? 0}
                    subtitle="Faculty accounts"
                    icon={<TeacherIcon className="w-5 h-5 text-emerald-400" />}
                    accentColor="emerald"
                    href="/admin/teachers"
                  />
                  <StatCard
                    title="Total Sessions"
                    value={overview?.totalSessions ?? 0}
                    subtitle="Cumulative sessions conducted"
                    icon={<BookOpenIcon className="w-5 h-5 text-purple-400" />}
                    accentColor="purple"
                    href="/admin/attendance"
                  />
                  <StatCard
                    title="Active Sessions"
                    value={overview?.activeSessions ?? 0}
                    subtitle="Live sessions requiring QR scans"
                    icon={<QrCodeIcon className="w-5 h-5 text-cyan-400" />}
                    accentColor="cyan"
                    href="/admin/attendance"
                  />
                  <StatCard
                    title="Closed Sessions"
                    value={overview?.closedSessions ?? 0}
                    subtitle="Completed official sessions"
                    icon={<BookOpenIcon className="w-5 h-5 text-blue-400" />}
                    accentColor="blue"
                    href="/admin/attendance"
                  />
                  <StatCard
                    title="Institution Attendance"
                    value={`${overview?.institutionAverageAttendancePercentage ?? 0}%`}
                    subtitle="Weighted average across closed sessions"
                    icon={<UsersIcon className="w-5 h-5 text-amber-400" />}
                    accentColor="amber"
                    trend={{
                      label: attendanceLabel,
                      positive: attendancePositive,
                    }}
                    href="/admin/attendance"
                  />
                </>
              )}
            </div>

            {/* Admin Management Quick Navigation */}
            <div className="bg-[#121929] border border-slate-800/80 rounded-2xl p-6 shadow-md">
              <h3 className="text-base font-bold text-white tracking-tight mb-1">
                Admin Management Quick Navigation
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                Management modules (Departments, Classes, Subjects, Teachers, Students, Assignments) for your institution.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {navModules.map((mod) => (
                  <Link
                    key={mod.name}
                    href={mod.route}
                    className="p-4 rounded-xl bg-[#172033] hover:bg-[#1c273e] border border-slate-800/80 flex items-center justify-between transition-all group shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${mod.accentBg} shrink-0`}>
                        {mod.icon}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                          {mod.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {mod.step}
                        </div>
                      </div>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-slate-500 group-hover:text-slate-200 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Lower Section: Recent Activity & System Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Recent Activity */}
              <div className="lg:col-span-6 bg-[#121929] border border-slate-800/80 rounded-2xl p-5 shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded-xl">
                        <ClockIcon className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        Recent Activity
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between p-3 rounded-xl bg-[#172033] border border-slate-800/80">
                      <div className="flex items-start gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-1.5 shrink-0 animate-pulse"></div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            Completed Official Sessions Summary
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {overview?.closedSessions ?? 0} official session(s) recorded in database
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full shrink-0">
                        Completed
                      </span>
                    </div>

                    <div className="flex items-start justify-between p-3 rounded-xl bg-[#172033] border border-slate-800/80">
                      <div className="flex items-start gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-400 mt-1.5 shrink-0"></div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            Institution Faculty & Enrolled Profiles
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {overview?.totalTeachers ?? 0} faculty & {overview?.totalStudents ?? 0} active students
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold px-2.5 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full shrink-0">
                        Active
                      </span>
                    </div>

                    <div className="flex items-start justify-between p-3 rounded-xl bg-[#172033] border border-slate-800/80">
                      <div className="flex items-start gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-400 mt-1.5 shrink-0"></div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            Overall Attendance Rate Calculated
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Weighted rate: {overview?.institutionAverageAttendancePercentage ?? 0}%
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold px-2.5 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full shrink-0">
                        Report
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 text-center">
                  <Link
                    href="/admin/attendance"
                    className="text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
                  >
                    <span>View All Activity Reports</span>
                    <ChevronRightIcon className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Right Column: System Alerts */}
              <div className="lg:col-span-6 bg-[#121929] border border-slate-800/80 rounded-2xl p-5 shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-xl">
                        <BellIcon className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        System Alerts
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {/* Attendance Health Alert */}
                    <div className="flex items-start justify-between p-3 rounded-xl bg-[#172033] border border-slate-800/80">
                      <div className="flex items-start gap-3">
                        {isHealthy ? (
                          <CheckCircleIcon className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        ) : (
                          <AlertCircleIcon className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <div className="text-xs font-bold text-white">
                            {isHealthy ? "Healthy Institution Attendance Rate" : "Low Attendance Alert Detected"}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {isHealthy
                              ? `Current average attendance rate is ${attendancePct}% — meeting target standards.`
                              : `Current average attendance rate is ${attendancePct}% — requires faculty review.`}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 border ${
                          isHealthy
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {isHealthy ? "Healthy" : "Warning"}
                      </span>
                    </div>

                    {/* Active Sessions Status Alert */}
                    <div className="flex items-start justify-between p-3 rounded-xl bg-[#172033] border border-slate-800/80">
                      <div className="flex items-start gap-3">
                        <InfoIcon className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-white">
                            {(overview?.activeSessions ?? 0) === 0 ? "No Active Live Sessions" : `${overview?.activeSessions} Live Session(s) Active`}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {(overview?.activeSessions ?? 0) === 0
                              ? "No class attendance sessions are currently accepting QR scans."
                              : "Faculty live QR attendance sessions actively running."}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full shrink-0">
                        Status
                      </span>
                    </div>

                    {/* Operational Health Alert */}
                    <div className="flex items-start justify-between p-3 rounded-xl bg-[#172033] border border-slate-800/80">
                      <div className="flex items-start gap-3">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-white">
                            All Core Systems Operational
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Authentication, database, and QR verification services running smoothly.
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full shrink-0">
                        Operational
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 text-center">
                  <Link
                    href="/admin/attendance"
                    className="text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
                  >
                    <span>View All System Alerts</span>
                    <ChevronRightIcon className="w-4 h-4" />
                  </Link>
                </div>
              </div>
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
