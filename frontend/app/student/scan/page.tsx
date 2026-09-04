"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { QrScanner } from "@/components/qr/QrScanner";
import { Button } from "@/components/ui/Button";
import { CheckCircleIcon, AlertCircleIcon, QrCodeIcon } from "@/components/ui/icons";
import { apiFetch } from "@/lib/api";

interface AttendanceRecordResult {
  id: string;
  status: string;
  markedAt: string;
  verificationMethod: string;
  session: {
    subject: { name: string; code: string };
    academicClass: { name: string; section: string };
  };
}

export default function StudentScanPage() {
  const router = useRouter();

  const [scannedPayload, setScannedPayload] = useState<string | null>(null);
  const [isAcquiringLocation, setIsAcquiringLocation] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [result, setResult] = useState<AttendanceRecordResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQrDecoded = async (rawPayload: string) => {
    if (isSubmitting || isAcquiringLocation || result) return;

    setScannedPayload(rawPayload);
    setError(null);
    setIsAcquiringLocation(true);

    if (!navigator.geolocation) {
      setError("Browser geolocation is not supported on your device.");
      setIsAcquiringLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setIsAcquiringLocation(false);
        setIsSubmitting(true);

        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };

        try {
          const res = await apiFetch<AttendanceRecordResult>("/student/attendance/scan", {
            method: "POST",
            body: JSON.stringify({
              payload: rawPayload,
              location: locationData,
            }),
          });

          if (res.data) {
            setResult(res.data);
          }
        } catch (err: any) {
          setError(err.message || "Failed to verify attendance.");
        } finally {
          setIsSubmitting(false);
        }
      },
      (geoErr) => {
        setIsAcquiringLocation(false);
        let msg = "Failed to acquire location coordinates.";
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          msg = "Location permission is required for physical-presence verification. Please enable GPS permission in your browser settings.";
        } else if (geoErr.code === geoErr.TIMEOUT) {
          msg = "Location request timed out. Move closer to a window or outdoors and retry.";
        }
        setError(msg);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );
  };

  const handleReset = () => {
    setScannedPayload(null);
    setIsAcquiringLocation(false);
    setIsSubmitting(false);
    setResult(null);
    setError(null);
  };

  return (
    <DashboardLayout allowedRoles={["STUDENT"]}>
      <div className="space-y-6 max-w-md mx-auto">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Scan Attendance QR
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Point your phone camera at the active classroom QR screen.
          </p>
        </div>

        {/* Success Banner */}
        {result ? (
          <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-emerald-500/50 shadow-lg text-center space-y-4">
            <div className="inline-flex p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full">
              <CheckCircleIcon className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Attendance Recorded!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Verified via Dynamic QR + Geofence
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-xs space-y-1 text-left">
              <div>Subject: <span className="font-semibold text-slate-900 dark:text-white">{result.session.subject.name} ({result.session.subject.code})</span></div>
              <div>Class: <span className="font-semibold text-slate-900 dark:text-white">{result.session.academicClass.name}</span></div>
              <div>Marked At: <span className="font-semibold text-slate-900 dark:text-white">{new Date(result.markedAt).toLocaleTimeString()}</span></div>
            </div>

            <Button
              className="w-full bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400"
              onClick={() => router.push("/student/attendance")}
            >
              View Attendance History
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-start gap-3">
                <AlertCircleIcon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p>{error}</p>
                  <Button variant="outline" size="sm" onClick={handleReset} className="text-xs py-1">
                    Try Again / Rescan
                  </Button>
                </div>
              </div>
            )}

            {(isAcquiringLocation || isSubmitting) && (
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-center text-emerald-200 text-xs space-y-2">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="font-semibold">
                  {isAcquiringLocation ? "QR Scanned. Verifying your GPS location..." : "Submitting attendance verification..."}
                </p>
              </div>
            )}

            {/* Live Camera Scanner */}
            {!scannedPayload && (
              <QrScanner
                onScanSuccess={handleQrDecoded}
                isPaused={isAcquiringLocation || isSubmitting}
              />
            )}
          </div>
        )}

        <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
          <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <QrCodeIcon className="w-4 h-4 text-emerald-500" />
            Scanner Rules & Guidance
          </div>
          <p>• Live camera scanning only. Image uploads or screenshots are rejected.</p>
          <p>• Device location must be enabled and within college classroom proximity area.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
