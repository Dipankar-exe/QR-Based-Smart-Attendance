"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { CardSkeleton, StatCardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { BookOpenIcon, CheckCircleIcon, UsersIcon } from "@/components/ui/icons";
import { apiFetch } from "@/lib/api";

interface SessionReportData {
  session: {
    id: string;
    status: string;
    startTime: string;
    endTime?: string | null;
  };
  subject: { id: string; name: string; code: string };
  academicClass: { id: string; name: string; semester: number; section: string };
  statistics: {
    totalStudents: number;
    presentCount: number;
    absentCount: number;
    unmarkedCount: number;
    qrVerifiedCount: number;
    manualCount: number;
    attendancePercentage: number;
  };
  studentRows: Array<{
    studentId: string;
    registrationNumber: string;
    name: string;
    attendanceStatus: string;
    markedAt?: string | null;
    verificationMethod?: string | null;
  }>;
}

export default function TeacherSessionReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [report, setReport] = useState<SessionReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<SessionReportData>(`/teacher/attendance-sessions/${sessionId}/report`);
      if (res.data) {
        setReport(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load session report.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [sessionId]);

  return (
    <DashboardLayout allowedRoles={["TEACHER"]}>
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Attendance Session Report
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Final attendance statistics and roster breakdown.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/teacher")}
          >
            Back to Dashboard
          </Button>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={fetchReport} />
        ) : isLoading ? (
          <CardSkeleton />
        ) : report ? (
          <>
            {/* Session Info Header Banner */}
            <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Subject</span>
                <div className="font-bold text-slate-900 dark:text-white text-base">
                  {report.subject.name} ({report.subject.code})
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Academic Class</span>
                <div className="font-bold text-slate-900 dark:text-white text-base">
                  {report.academicClass.name} (Sec {report.academicClass.section})
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Status</span>
                <div>
                  <span
                    className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                      report.session.status === "CLOSED"
                        ? "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-700 dark:text-slate-200"
                        : "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300"
                    }`}
                  >
                    {report.session.status}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Start Time</span>
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  {new Date(report.session.startTime).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Enrolled Students"
                value={report.statistics.totalStudents}
                icon={<UsersIcon />}
              />
              <StatCard
                title="Present Count"
                value={report.statistics.presentCount}
                subtitle={`QR: ${report.statistics.qrVerifiedCount} | Manual: ${report.statistics.manualCount}`}
                icon={<CheckCircleIcon className="text-emerald-500" />}
              />
              <StatCard
                title="Absent Count"
                value={report.statistics.absentCount}
                subtitle="Derived unrecorded eligible students"
                icon={<BookOpenIcon className="text-red-500" />}
              />
              <StatCard
                title="Attendance Rate"
                value={`${report.statistics.attendancePercentage}%`}
                subtitle="Official percentage"
                icon={<UsersIcon className="text-blue-500" />}
              />
            </div>

            {/* Roster Breakdown Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Official Student Attendance Roster
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-center">Sl. No.</th>
                      <th className="px-6 py-3">Registration No.</th>
                      <th className="px-6 py-3">Student Name</th>
                      <th className="px-6 py-3 text-center">Final Status</th>
                      <th className="px-6 py-3 text-center">Verification Method</th>
                      <th className="px-6 py-3 text-right">Marked Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {report.studentRows.map((st, idx) => (
                      <tr key={st.studentId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-4 text-center font-mono text-slate-400 text-xs">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                          {st.registrationNumber}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                          {st.name}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                              st.attendanceStatus === "PRESENT"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
                                : "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
                            }`}
                          >
                            {st.attendanceStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-xs text-slate-600 dark:text-slate-300">
                          {st.verificationMethod === "TEACHER_MANUAL"
                            ? "Teacher Manual"
                            : st.verificationMethod === "DYNAMIC_QR_GEOFENCE"
                            ? "QR + Geofence"
                            : "—"}
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-slate-500 dark:text-slate-400">
                          {st.markedAt ? new Date(st.markedAt).toLocaleTimeString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
