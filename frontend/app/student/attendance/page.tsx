"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState, EmptyState } from "@/components/ui/ErrorState";
import { CheckCircleIcon, BookOpenIcon } from "@/components/ui/icons";
import { apiFetch } from "@/lib/api";

interface AttendanceRecordItem {
  id: string;
  status: string;
  markedAt: string;
  verificationMethod: string;
  session: {
    id: string;
    startTime: string;
    endTime?: string | null;
    subject: { id: string; name: string; code: string };
    academicClass: { id: string; name: string; section: string };
  };
}

export default function StudentAttendanceHistoryPage() {
  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<AttendanceRecordItem[]>("/student/attendance");
      if (res.data) {
        setRecords(res.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load attendance history.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <DashboardLayout allowedRoles={["STUDENT"]}>
      <div className="space-y-8 max-w-5xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Attendance History
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete record of your verified class attendance entries.
          </p>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={fetchHistory} />
        ) : isLoading ? (
          <CardSkeleton />
        ) : records.length === 0 ? (
          <EmptyState
            title="No attendance records"
            message="You have not marked attendance in any session yet."
            icon={<BookOpenIcon />}
          />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3">Subject</th>
                    <th className="px-6 py-3">Class</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-center">Verification Method</th>
                    <th className="px-6 py-3 text-right">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {rec.session.subject.name}
                        <div className="text-xs text-slate-400 font-normal">
                          {rec.session.subject.code}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {rec.session.academicClass.name} (Sec {rec.session.academicClass.section})
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-slate-600 dark:text-slate-300">
                        {rec.verificationMethod === "TEACHER_MANUAL"
                          ? "Teacher Manual"
                          : "QR + Geofence"}
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-slate-500 dark:text-slate-400">
                        {new Date(rec.markedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
