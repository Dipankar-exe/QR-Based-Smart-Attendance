"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState, EmptyState } from "@/components/ui/ErrorState";
import { AlertCircleIcon, XIcon, BookOpenIcon } from "@/components/ui/icons";
import { apiFetch } from "@/lib/api";

interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  _count?: { students: number; teachers: number; classes: number; subjects: number };
}

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchDepartments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<DepartmentItem[]>("/admin/departments");
      if (res.data) setDepartments(res.data);
    } catch (err: any) {
      setError(err.message || "Failed to load departments.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiFetch("/admin/departments", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), code: code.trim().toUpperCase() }),
      });
      setName("");
      setCode("");
      setIsModalOpen(false);
      fetchDepartments();
    } catch (err: any) {
      setFormError(err.message || "Failed to create department.");
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
              Departments Management
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage academic departments within the institution.
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold">
            + Add Department
          </Button>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={fetchDepartments} />
        ) : isLoading ? (
          <CardSkeleton />
        ) : departments.length === 0 ? (
          <EmptyState title="No departments found" message="Click Add Department to create the first academic department." />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Department Name</th>
                  <th className="px-6 py-3 text-center">Classes</th>
                  <th className="px-6 py-3 text-center">Subjects</th>
                  <th className="px-6 py-3 text-center">Teachers</th>
                  <th className="px-6 py-3 text-center">Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {departments.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                      {d.code}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {d.name}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-300">
                      {d._count?.classes ?? 0}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-300">
                      {d._count?.subjects ?? 0}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-300">
                      {d._count?.teachers ?? 0}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-300">
                      {d._count?.students ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-md w-full p-6 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <XIcon />
            </button>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add Department</h3>

            {formError && (
              <div className="p-3 mb-4 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
                <AlertCircleIcon className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateDepartment} className="space-y-4">
              <Input label="Department Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Computer Science & Engineering" />
              <Input label="Department Code" value={code} onChange={(e) => setCode(e.target.value)} required placeholder="e.g. CSE" />
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-emerald-500 text-slate-950 font-semibold">Save Department</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
