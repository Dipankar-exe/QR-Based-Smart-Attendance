"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState, EmptyState } from "@/components/ui/ErrorState";
import { AlertCircleIcon, XIcon } from "@/components/ui/icons";
import { apiFetch } from "@/lib/api";

interface StudentItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  studentProfile?: {
    id: string;
    registrationNumber: string;
    department: { id: string; name: string; code: string };
    academicClass: { id: string; name: string; semester: number; section: string };
  };
}

interface DepartmentItem { id: string; name: string; code: string }
interface ClassItem { id: string; name: string; departmentId: string; semester: number; section: string }

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [classId, setClassId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [stuRes, deptRes, clsRes] = await Promise.all([
        apiFetch<StudentItem[]>("/admin/students"),
        apiFetch<DepartmentItem[]>("/admin/departments"),
        apiFetch<ClassItem[]>("/admin/classes"),
      ]);
      if (stuRes.data) setStudents(stuRes.data);
      if (deptRes.data) {
        setDepartments(deptRes.data);
        if (deptRes.data.length > 0) setDepartmentId(deptRes.data[0].id);
      }
      if (clsRes.data) {
        setClasses(clsRes.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load students.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredClasses = classes.filter((c) => c.departmentId === departmentId);
  useEffect(() => {
    if (filteredClasses.length > 0) {
      setClassId(filteredClasses[0].id);
    } else {
      setClassId("");
    }
  }, [departmentId, classes]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!classId) {
      setFormError("Selected department has no classes. Create a class first.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/admin/students", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          registrationNumber: registrationNumber.trim(),
          departmentId,
          classId,
        }),
      });
      setName("");
      setEmail("");
      setPassword("");
      setRegistrationNumber("");
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || "Failed to create student account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStudentStatus = async (studentId: string, currentStatus: boolean) => {
    try {
      await apiFetch(`/admin/students/${studentId}/status`, {
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
              Students Management
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage student accounts and academic class enrollments.
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold">
            + Add Student Account
          </Button>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : isLoading ? (
          <CardSkeleton />
        ) : students.length === 0 ? (
          <EmptyState title="No student accounts found" message="Click Add Student Account to enroll students." />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-center">Sl. No.</th>
                  <th className="px-6 py-3">Registration No.</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Class</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {students.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-4 text-center font-mono text-slate-400 text-xs">{idx + 1}</td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">{s.studentProfile?.registrationNumber || "—"}</td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{s.name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{s.email}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{s.studentProfile?.academicClass?.name || "—"}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${s.isActive ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-red-100 text-red-800 border-red-200"}`}>
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => toggleStudentStatus(s.id, s.isActive)} className="text-xs">
                        {s.isActive ? "Deactivate" : "Activate"}
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
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add Student Account</h3>

            {formError && (
              <div className="p-3 mb-4 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
                <AlertCircleIcon className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <Input label="Student Full Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. John Doe" />
              <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="student@example.com" />
              <Input label="Initial Password (min 8 chars)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              <Input label="Registration Number" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} required placeholder="e.g. STU123456" />
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white" required>
                  {departments.map((d) => (<option key={d.id} value={d.id}>{d.name} ({d.code})</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Academic Class</label>
                <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white" required disabled={filteredClasses.length === 0}>
                  {filteredClasses.map((c) => (<option key={c.id} value={c.id}>{c.name} (Sec {c.section}) — Sem {c.semester}</option>))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-emerald-500 text-slate-950 font-semibold">Create Student</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
