"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState, EmptyState } from "@/components/ui/ErrorState";
import { AlertCircleIcon, XIcon } from "@/components/ui/icons";
import { apiFetch } from "@/lib/api";

interface SubjectItem {
  id: string;
  name: string;
  code: string;
  semester: number;
  department: { id: string; name: string; code: string };
  _count?: { teacherAssignments: number; sessions: number };
}

interface DepartmentItem { id: string; name: string; code: string }

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [semester, setSemester] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [subRes, deptRes] = await Promise.all([
        apiFetch<SubjectItem[]>("/admin/subjects"),
        apiFetch<DepartmentItem[]>("/admin/departments"),
      ]);
      if (subRes.data) setSubjects(subRes.data);
      if (deptRes.data) {
        setDepartments(deptRes.data);
        if (deptRes.data.length > 0) setDepartmentId(deptRes.data[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load subjects.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiFetch("/admin/subjects", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          departmentId,
          semester: Number(semester),
        }),
      });
      setName("");
      setCode("");
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || "Failed to create subject.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={["ADMIN"]}>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Subjects Management
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage academic subjects and curriculum courses.
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold">
            + Add Subject
          </Button>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : isLoading ? (
          <CardSkeleton />
        ) : subjects.length === 0 ? (
          <EmptyState title="No subjects found" message="Click Add Subject to create your first course." />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3">Subject Code</th>
                  <th className="px-6 py-3">Subject Name</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3 text-center">Semester</th>
                  <th className="px-6 py-3 text-center">Assignments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {subjects.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">{s.code}</td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{s.name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{s.department.name} ({s.department.code})</td>
                    <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-300">{s.semester}</td>
                    <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-300">{s._count?.teacherAssignments ?? 0}</td>
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
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add Subject</h3>

            {formError && (
              <div className="p-3 mb-4 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
                <AlertCircleIcon className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <Input label="Subject Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Database Management Systems" />
              <Input label="Subject Code" value={code} onChange={(e) => setCode(e.target.value)} required placeholder="e.g. CS501" />
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white" required>
                  {departments.map((d) => (<option key={d.id} value={d.id}>{d.name} ({d.code})</option>))}
                </select>
              </div>
              <Input label="Semester (1-12)" type="number" min={1} max={12} value={semester} onChange={(e) => setSemester(Number(e.target.value))} required />
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-emerald-500 text-slate-950 font-semibold">Save Subject</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
