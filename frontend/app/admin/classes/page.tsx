"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState, EmptyState } from "@/components/ui/ErrorState";
import { AlertCircleIcon, XIcon } from "@/components/ui/icons";
import { apiFetch } from "@/lib/api";

interface ClassItem {
  id: string;
  name: string;
  semester: number;
  section: string;
  batchYear?: number;
  department: { id: string; name: string; code: string };
  _count?: { students: number; sessions: number };
}

interface DepartmentItem { id: string; name: string; code: string }

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [semester, setSemester] = useState<number>(1);
  const [section, setSection] = useState("A");
  const [batchYear, setBatchYear] = useState<number>(new Date().getFullYear());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [clsRes, deptRes] = await Promise.all([
        apiFetch<ClassItem[]>("/admin/classes"),
        apiFetch<DepartmentItem[]>("/admin/departments"),
      ]);
      if (clsRes.data) setClasses(clsRes.data);
      if (deptRes.data) {
        setDepartments(deptRes.data);
        if (deptRes.data.length > 0) setDepartmentId(deptRes.data[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load academic classes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiFetch("/admin/classes", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          departmentId,
          semester: Number(semester),
          section: section.trim().toUpperCase(),
          batchYear: Number(batchYear),
        }),
      });
      setName("");
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || "Failed to create academic class.");
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
              Academic Classes Management
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage class sections, semesters, and department assignments.
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold">
            + Add Academic Class
          </Button>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : isLoading ? (
          <CardSkeleton />
        ) : classes.length === 0 ? (
          <EmptyState title="No classes found" message="Click Add Academic Class to create your first class." />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3">Class Name</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3 text-center">Semester</th>
                  <th className="px-6 py-3 text-center">Section</th>
                  <th className="px-6 py-3 text-center">Batch Year</th>
                  <th className="px-6 py-3 text-center">Enrolled Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {classes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{c.name}</td>
                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">{c.department.name} ({c.department.code})</td>
                    <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-300">{c.semester}</td>
                    <td className="px-6 py-4 text-center font-semibold text-slate-900 dark:text-white">{c.section}</td>
                    <td className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">{c.batchYear || "—"}</td>
                    <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-300">{c._count?.students ?? 0}</td>
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
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add Academic Class</h3>

            {formError && (
              <div className="p-3 mb-4 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
                <AlertCircleIcon className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClass} className="space-y-4">
              <Input label="Class Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Class 5A" />
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white" required>
                  {departments.map((d) => (<option key={d.id} value={d.id}>{d.name} ({d.code})</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Semester (1-12)" type="number" min={1} max={12} value={semester} onChange={(e) => setSemester(Number(e.target.value))} required />
                <Input label="Section" value={section} onChange={(e) => setSection(e.target.value)} required placeholder="e.g. A" />
              </div>
              <Input label="Batch Year" type="number" min={2000} max={2100} value={batchYear} onChange={(e) => setBatchYear(Number(e.target.value))} required />
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-emerald-500 text-slate-950 font-semibold">Save Class</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
