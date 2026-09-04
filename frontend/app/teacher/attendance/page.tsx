"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState, EmptyState } from "@/components/ui/ErrorState";
import { QrCodeIcon, BookOpenIcon, AlertCircleIcon } from "@/components/ui/icons";
import { apiFetch } from "@/lib/api";
import { TeacherAssignment, TeacherSessionSummary } from "@/types";

export default function StartAttendancePage() {
  const router = useRouter();

  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [activeSession, setActiveSession] = useState<TeacherSessionSummary | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [assignRes, sessRes] = await Promise.all([
        apiFetch<TeacherAssignment[]>("/teacher/assignments"),
        apiFetch<TeacherSessionSummary[]>("/teacher/attendance-sessions?status=ACTIVE"),
      ]);

      if (assignRes.data) {
        setAssignments(assignRes.data);
        if (assignRes.data.length > 0) {
          setSelectedAssignmentId(assignRes.data[0].id);
        }
      }

      if (sessRes.data && sessRes.data.length > 0) {
        setActiveSession(sessRes.data[0]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load teaching assignments.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedAssignmentId) {
      setError("Please select a teaching assignment.");
      return;
    }

    setIsStarting(true);
    try {
      const res = await apiFetch<TeacherSessionSummary>("/teacher/attendance-sessions", {
        method: "POST",
        body: JSON.stringify({ assignmentId: selectedAssignmentId }),
      });

      if (res.data) {
        router.push(`/teacher/attendance/${res.data.id}`);
      }
    } catch (err: any) {
      if (err.status === 409) {
        setError(err.message || "You already have an active session running.");
        // Refetch active session info
        fetchData();
      } else {
        setError(err.message || "Failed to start attendance session.");
      }
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={["TEACHER"]}>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Start Attendance Session
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Select one of your assigned courses to launch a live dynamic QR attendance session.
          </p>
        </div>

        {activeSession && (
          <div className="p-6 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full animate-ping shrink-0"></div>
              <div>
                <div className="font-bold text-base">
                  Active Attendance Session Currently Running
                </div>
                <div className="text-xs text-emerald-400 mt-0.5">
                  {activeSession.subject.name} ({activeSession.subject.code}) — Class {activeSession.academicClass.name}
                </div>
              </div>
            </div>
            <Button
              onClick={() => router.push(`/teacher/attendance/${activeSession.id}`)}
              className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold shrink-0"
            >
              Open Active Session
            </Button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-sm flex items-start gap-3">
            <AlertCircleIcon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <CardSkeleton />
        ) : assignments.length === 0 ? (
          <EmptyState
            title="No teaching assignments"
            message="You must be assigned to at least one class and subject before starting an attendance session."
          />
        ) : (
          <form onSubmit={handleStartSession} className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Select Teaching Assignment
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {assignments.map((asg) => {
                  const isSelected = selectedAssignmentId === asg.id;
                  return (
                    <div
                      key={asg.id}
                      onClick={() => setSelectedAssignmentId(asg.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20"
                          : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
                          <BookOpenIcon className={isSelected ? "text-emerald-500" : "text-slate-400"} />
                          {asg.subject.name}
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono rounded">
                          {asg.subject.code}
                        </span>
                      </div>

                      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                        <div>Class: <span className="font-medium text-slate-700 dark:text-slate-300">{asg.academicClass.name} (Sec {asg.academicClass.section})</span></div>
                        <div>Semester: <span className="font-medium text-slate-700 dark:text-slate-300">{asg.academicClass.semester}</span></div>
                        <div>Department: <span className="font-medium text-slate-700 dark:text-slate-300">{asg.teacher.department.name}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <Button
                type="submit"
                size="lg"
                className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold gap-2"
                isLoading={isStarting}
                disabled={!selectedAssignmentId || !!activeSession}
              >
                <QrCodeIcon className="w-5 h-5" />
                Launch Live QR Session
              </Button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
