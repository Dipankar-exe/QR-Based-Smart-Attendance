"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState, EmptyState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";

interface AdminSessionItem {
  id: string;
  status: string;
  startTime: string;
  endTime?: string | null;
  teacher: { id: string; employeeId: string; name: string; email: string };
  academicClass: { id: string; name: string; semester: number; section: string; department: { name: string } };
  subject: { id: string; name: string; code: string };
  totalStudents: number;
  presentCount: number;
  attendancePercentage: number;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminAttendanceSessionsPage() {
  const [sessions, setSessions] = useState<AdminSessionItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<AdminSessionItem[]>(`/admin/attendance/sessions?page=${page}&limit=10`);
      if (res.data) setSessions(res.data);
      if (res.pagination) setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || "Failed to load session logs.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions(1);
  }, [fetchSessions]);

  return (
    <DashboardLayout allowedRoles={["ADMIN"]}>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Institution Attendance Sessions
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            System-wide attendance session records and completion reports.
          </p>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={() => fetchSessions(pagination.page)} />
        ) : isLoading ? (
          <CardSkeleton />
        ) : sessions.length === 0 ? (
          <EmptyState title="No attendance sessions" message="No sessions have been conducted in the institution yet." />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3">Subject</th>
                  <th className="px-6 py-3">Class</th>
                  <th className="px-6 py-3">Teacher</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-center">Present / Total</th>
                  <th className="px-6 py-3 text-right">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {s.subject.name}
                      <div className="text-xs text-slate-400 font-normal">{s.subject.code}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {s.academicClass.name} (Sec {s.academicClass.section})
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {s.teacher.name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${s.status === "CLOSED" ? "bg-slate-100 text-slate-800 border-slate-300" : s.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-red-100 text-red-800 border-red-200"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-slate-700 dark:text-slate-300">
                      {s.presentCount} / {s.totalStudents}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                      {s.attendancePercentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Control */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total sessions)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchSessions(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchSessions(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
