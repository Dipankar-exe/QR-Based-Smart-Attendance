"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState, EmptyState } from "@/components/ui/ErrorState";
import { AlertCircleIcon, XIcon } from "@/components/ui/icons";
import { apiFetch } from "@/lib/api";

interface AssignmentItem {
  id: string;
  createdAt: string;
  teacher: {
    id: string;
    employeeId: string;
    user: { id: string; name: string; email: string };
  };
  academicClass: { id: string; name: string; semester: number; section: string };
  subject: { id: string; name: string; code: string; semester: number };
}

interface TeacherItem { id: string; name: string; teacherProfile?: { id: string; employeeId: string; departmentId: string } }
interface ClassItem { id: string; name: string; departmentId: string; semester: number; section: string }
interface SubjectItem { id: string; name: string; code: string; departmentId: string; semester: number }

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teacherId, setTeacherId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [asgRes, tchRes, clsRes, subRes] = await Promise.all([
        apiFetch<AssignmentItem[]>("/admin/assignments"),
        apiFetch<TeacherItem[]>("/admin/teachers"),
        apiFetch<ClassItem[]>("/admin/classes"),
        apiFetch<SubjectItem[]>("/admin/subjects"),
      ]);
      if (asgRes.data) setAssignments(asgRes.data);
      if (tchRes.data) {
        setTeachers(tchRes.data);
        if (tchRes.data.length > 0 && tchRes.data[0].teacherProfile) {
          setTeacherId(tchRes.data[0].teacherProfile.id);
        }
      }
      if (clsRes.data) setClasses(clsRes.data);
      if (subRes.data) setSubjects(subRes.data);
    } catch (err: any) {
      setError(err.message || "Failed to load assignments.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedTeacher = teachers.find(t => t.teacherProfile?.id === teacherId);
  const teacherDeptId = selectedTeacher?.teacherProfile?.departmentId;

  const compatibleClasses = classes.filter(c => c.departmentId === teacherDeptId);
  const selectedClass = classes.find(c => c.id === classId);

  const compatibleSubjects = subjects.filter(
    s => s.departmentId === teacherDeptId && (selectedClass ? s.semester === selectedClass.semester : true)
  );

  useEffect(() => {
    if (compatibleClasses.length > 0) setClassId(compatibleClasses[0].id);
    else setClassId("");
  }, [teacherId]);

  useEffect(() => {
    if (compatibleSubjects.length > 0) setSubjectId(compatibleSubjects[0].id);
    else setSubjectId("");
  }, [classId]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!teacherId || !classId || !subjectId) {
      setFormError("Please select a compatible teacher, class, and subject.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/admin/assignments", {
        method: "POST",
        body: JSON.stringify({ teacherId, classId, subjectId }),
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || "Failed to create assignment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this teaching assignment?")) return;
    try {
      await apiFetch(`/admin/assignments/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to delete assignment.");
    }
  };

  return (
    <DashboardLayout allowedRoles={["ADMIN"]}>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Teaching Assignments
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Assign faculty members to specific academic classes and subjects.
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold">
            + Assign Course
          </Button>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : isLoading ? (
          <CardSkeleton />
        ) : assignments.length === 0 ? (
          <EmptyState title="No teaching assignments" message="Click Assign Course to map teachers to classes and subjects." />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3">Teacher</th>
                  <th className="px-6 py-3">Class</th>
                  <th className="px-6 py-3">Subject</th>
                  <th className="px-6 py-3 text-center">Semester</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {a.teacher.user.name} ({a.teacher.employeeId})
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {a.academicClass.name} (Sec {a.academicClass.section})
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {a.subject.name} ({a.subject.code})
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-300">
                      Sem {a.subject.semester}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => handleDeleteAssignment(a.id)} className="text-xs text-red-600 border-red-300">
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-md w-full p-6 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <XIcon />
            </button>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Assign Course</h3>

            {formError && (
              <div className="p-3 mb-4 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
                <AlertCircleIcon className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Teacher</label>
                <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white" required>
                  {teachers.map((t) => t.teacherProfile && (<option key={t.teacherProfile.id} value={t.teacherProfile.id}>{t.name} ({t.teacherProfile.employeeId})</option>))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Academic Class (Same Dept)</label>
                <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white" required disabled={compatibleClasses.length === 0}>
                  {compatibleClasses.map((c) => (<option key={c.id} value={c.id}>{c.name} (Sec {c.section}) — Sem {c.semester}</option>))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject (Same Dept & Semester)</label>
                <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white" required disabled={compatibleSubjects.length === 0}>
                  {compatibleSubjects.map((s) => (<option key={s.id} value={s.id}>{s.name} ({s.code}) — Sem {s.semester}</option>))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-emerald-500 text-slate-950 font-semibold">Confirm Assignment</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
