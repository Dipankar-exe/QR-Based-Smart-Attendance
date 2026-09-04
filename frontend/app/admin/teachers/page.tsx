"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState, EmptyState } from "@/components/ui/ErrorState";
import { AlertCircleIcon, XIcon } from "@/components/ui/icons";
import { apiFetch } from "@/lib/api";

interface TeacherItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  teacherProfile?: {
    id: string;
    employeeId: string;
    department: { id: string; name: string; code: string };
  };
}

interface DepartmentItem { id: string; name: string; code: string }

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tchRes, deptRes] = await Promise.all([
        apiFetch<TeacherItem[]>("/admin/teachers"),
        apiFetch<DepartmentItem[]>("/admin/departments"),
      ]);
      if (tchRes.data) setTeachers(tchRes.data);
      if (deptRes.data) {
        setDepartments(deptRes.data);
        if (deptRes.data.length > 0) setDepartmentId(deptRes.data[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load teachers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await apiFetch("/admin/teachers", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          employeeId: employeeId.trim(),
          departmentId,
        }),
      });
      setName("");
      setEmail("");
      setPassword("");
      setEmployeeId("");
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || "Failed to create teacher account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTeacherStatus = async (teacherId: string, currentStatus: boolean) => {
    try {
      await apiFetch(`/admin/teachers/${teacherId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to update status.");
    }
  };

  return (
    <DashboardLayout allowedRoles={["ADMIN"]}>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Teachers Management
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage faculty member accounts and active statuses.
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold">
            + Add Teacher Account
          </Button>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : isLoading ? (
          <CardSkeleton />
        ) : teachers.length === 0 ? (
          <EmptyState title="No teacher accounts found" message="Click Add Teacher Account to create faculty access." />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3">Employee ID</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">{t.teacherProfile?.employeeId || "—"}</td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{t.name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{t.email}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{t.teacherProfile?.department?.name || "—"}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${t.isActive ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-red-100 text-red-800 border-red-200"}`}>
                        {t.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => toggleTeacherStatus(t.id, t.isActive)} className="text-xs">
                        {t.isActive ? "Deactivate" : "Activate"}
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
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add Teacher Account</h3>

            {formError && (
              <div className="p-3 mb-4 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
                <AlertCircleIcon className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTeacher} className="space-y-4">
              <Input label="Teacher Full Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Dr. Alan Turing" />
              <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="teacher@example.com" />
              <Input label="Initial Password (min 8 chars)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              <Input label="Employee ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required placeholder="e.g. EMP101" />
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white" required>
                  {departments.map((d) => (<option key={d.id} value={d.id}>{d.name} ({d.code})</option>))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-emerald-500 text-slate-950 font-semibold">Create Account</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
