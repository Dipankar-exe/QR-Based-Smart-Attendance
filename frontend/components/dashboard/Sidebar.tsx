import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@/types";
import {
  DashboardIcon,
  UsersIcon,
  TeacherIcon,
  BookOpenIcon,
  QrCodeIcon,
  XIcon,
  ChevronsLeftIcon,
} from "../ui/icons";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const getNavItems = (role: Role | null): NavItem[] => {
  if (role === "ADMIN") {
    return [
      { label: "Overview", href: "/admin", icon: <DashboardIcon /> },
      { label: "Departments", href: "/admin/departments", icon: <BookOpenIcon /> },
      { label: "Classes", href: "/admin/classes", icon: <BookOpenIcon /> },
      { label: "Subjects", href: "/admin/subjects", icon: <BookOpenIcon /> },
      { label: "Teachers", href: "/admin/teachers", icon: <TeacherIcon /> },
      { label: "Students", href: "/admin/students", icon: <UsersIcon /> },
      { label: "Assignments", href: "/admin/assignments", icon: <BookOpenIcon /> },
      { label: "Attendance Reports", href: "/admin/attendance", icon: <QrCodeIcon /> },
    ];
  }

  if (role === "TEACHER") {
    return [
      { label: "Dashboard", href: "/teacher", icon: <DashboardIcon /> },
      { label: "Start Attendance", href: "/teacher/attendance", icon: <QrCodeIcon /> },
    ];
  }

  if (role === "STUDENT") {
    return [
      { label: "Dashboard", href: "/student", icon: <DashboardIcon /> },
      { label: "Scan Attendance", href: "/student/scan", icon: <QrCodeIcon /> },
      { label: "Attendance History", href: "/student/attendance", icon: <BookOpenIcon /> },
    ];
  }

  return [];
};

interface SidebarProps {
  role: Role | null;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ role, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const navItems = getNavItems(role);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#0c101a] text-white border-r border-slate-800/80 flex flex-col justify-between transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:z-auto shrink-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex-1 overflow-y-auto">
          {/* Top Logo Header */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-slate-800/60">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl flex items-center justify-center font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:bg-emerald-500/30 transition-colors">
                QR
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-white leading-tight">
                  Smart Attendance
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  QR Based System
                </span>
              </div>
            </Link>
            <button
              onClick={onClose}
              className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              aria-label="Close sidebar"
            >
              <XIcon />
            </button>
          </div>

          {/* Navigation Section */}
          <div className="p-4 space-y-6">
            <div>
              <div className="px-3 pb-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                {role === "STUDENT" ? "STUDENT NAVIGATION" : `${role} NAVIGATION`}
              </div>
              <div className="space-y-1.5">
                {navItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/admin" &&
                      item.href !== "/teacher" &&
                      item.href !== "/student" &&
                      pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onClose()}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? "bg-[#12252a] text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.12)] font-semibold"
                          : "text-slate-400 hover:bg-[#131a2b] hover:text-slate-200"
                      }`}
                    >
                      <span
                        className={
                          isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"
                        }
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Motivational Sidebar Card for Student */}
            {role === "STUDENT" && (
              <div className="mt-8 mx-1 p-4 rounded-2xl bg-gradient-to-b from-[#111a2e] to-[#0c1322] border border-slate-800/80 relative overflow-hidden shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-emerald-400 font-bold text-sm">Keep it up! 🚀</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed font-normal">
                  Your consistency today builds your success tomorrow.
                </p>
                {/* Bar chart & line growth illustration */}
                <div className="pt-2 relative h-16 w-full flex items-end justify-between px-2 gap-1.5">
                  <div className="w-1/4 bg-emerald-500/20 rounded-t-sm h-5"></div>
                  <div className="w-1/4 bg-emerald-500/40 rounded-t-sm h-8"></div>
                  <div className="w-1/4 bg-emerald-500/60 rounded-t-sm h-11"></div>
                  <div className="w-1/4 bg-emerald-500 rounded-t-sm h-14 shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
                  <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" viewBox="0 0 100 50">
                    <path
                      d="M 10 40 Q 35 30, 60 18 T 90 5"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle cx="90" cy="5" r="3.5" fill="#10b981" className="animate-pulse" />
                  </svg>
                </div>
              </div>
            )}

            {/* Teaching Impact Sidebar Card for Teacher */}
            {role === "TEACHER" && (
              <div className="mt-8 mx-1 p-4 rounded-2xl bg-gradient-to-b from-[#111a2e] to-[#0c1322] border border-slate-800/80 relative overflow-hidden shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-emerald-400 font-bold text-sm">Teaching Impact 📚</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed font-normal">
                  Every session helps students stay on track.
                </p>
                {/* Academic platform SVG illustration */}
                <div className="pt-1 flex items-center justify-center h-16 w-full relative">
                  <svg className="w-20 h-16 text-purple-400" viewBox="0 0 100 80" fill="none">
                    <path d="M50 15 L85 30 L50 45 L15 30 Z" fill="url(#gradTeacher)" stroke="#8b5cf6" strokeWidth="1.5" />
                    <path d="M25 35.5 V52 C25 58 75 58 75 52 V35.5" stroke="#10b981" strokeWidth="2" fill="none" />
                    <path d="M85 30 V50" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="85" cy="52" r="3" fill="#f59e0b" />
                    <defs>
                      <linearGradient id="gradTeacher" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            )}

            {/* Smart Insights Sidebar Card for Admin */}
            {role === "ADMIN" && (
              <div className="mt-8 mx-1 p-4 rounded-2xl bg-gradient-to-b from-[#111a2e] to-[#0c1322] border border-slate-800/80 relative overflow-hidden shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-emerald-400 font-bold text-sm">Smart Insights ✨</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed font-normal">
                  Monitor, analyze and improve attendance across your institution.
                </p>
                {/* Abstract Analytics Illustration */}
                <div className="pt-2 relative h-16 w-full flex items-end justify-between px-2 gap-1.5">
                  <div className="w-1/4 bg-emerald-500/20 rounded-t-sm h-6"></div>
                  <div className="w-1/4 bg-emerald-500/30 rounded-t-sm h-10"></div>
                  <div className="w-1/4 bg-emerald-500/50 rounded-t-sm h-8"></div>
                  <div className="w-1/4 bg-emerald-500 rounded-t-sm h-14 shadow-[0_0_12px_rgba(16,185,129,0.4)]"></div>
                  <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" viewBox="0 0 100 50">
                    <path
                      d="M 10 35 Q 35 15, 60 28 T 90 8"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle cx="90" cy="8" r="3.5" fill="#10b981" className="animate-pulse" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/60 flex items-center justify-between text-slate-500 text-[11px]">
          <span>© 2026 Smart Attendance<br />All rights reserved.</span>
          <button
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors"
            title="Collapse sidebar"
          >
            <ChevronsLeftIcon className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
}
