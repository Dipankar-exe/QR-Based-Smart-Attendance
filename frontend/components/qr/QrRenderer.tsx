"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { QRCodeSVG } from "qrcode.react";
import { apiFetch } from "@/lib/api";

interface QrRendererProps {
  sessionId: string;
  onSessionEnded?: () => void;
}

interface QrData {
  payload: string;
  expiresAt: string;
  rotationSeconds: number;
}

export function QrRenderer({ sessionId }: QrRendererProps) {
  const [qrData, setQrData] = useState<QrData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchQrPayload = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const res = await apiFetch<QrData>(
        `/teacher/attendance-sessions/${sessionId}/qr`
      );

      if (res.data) {
        setQrData(res.data);
        setError(null);

        const expiresAtMs = new Date(res.data.expiresAt).getTime();
        const now = Date.now();

        const diff = Math.max(0, expiresAtMs - now);

        setRemainingMs(diff);

        // Schedule next QR fetch when current rotation expires
        if (fetchTimerRef.current) {
          clearTimeout(fetchTimerRef.current);
        }

        fetchTimerRef.current = setTimeout(() => {
          fetchQrPayload();
        }, diff);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load secure QR payload.");

      // Retry after 3 seconds if temporary network error
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current);
      }

      fetchTimerRef.current = setTimeout(() => {
        fetchQrPayload();
      }, 3000);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [sessionId]);

  // Refresh QR immediately when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchQrPayload();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [fetchQrPayload]);

  // Initial QR fetch + countdown
  useEffect(() => {
    fetchQrPayload();

    countdownIntervalRef.current = setInterval(() => {
      setRemainingMs((prev) => Math.max(0, prev - 100));
    }, 100);

    return () => {
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current);
      }

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [fetchQrPayload]);

  const rotationTotalMs = (qrData?.rotationSeconds || 15) * 1000;

  const progressPercent = Math.min(
    100,
    Math.max(0, (remainingMs / rotationTotalMs) * 100)
  );

  const remainingSeconds = Math.ceil(remainingMs / 1000);

  return (
    <div className="flex flex-col justify-between p-5 bg-[#121929] border border-slate-800/80 rounded-2xl shadow-lg w-full">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
        <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span>LIVE DYNAMIC QR CODE</span>
        </div>

        {/* Visual Auto-Rotate Toggle Switch */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400">Auto Rotate</span>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 cursor-pointer ${
              autoRotate ? "bg-emerald-500 justify-end" : "bg-slate-700 justify-start"
            }`}
            title="Auto rotation toggle"
          >
            <div className="w-4 h-4 rounded-full bg-slate-950 shadow-xs" />
          </button>
        </div>
      </div>

      {/* Large High-Contrast QR Container */}
      <div className="relative w-full max-w-[340px] aspect-square mx-auto flex items-center justify-center bg-white rounded-2xl border border-emerald-500/30 p-5 mb-4 shadow-[0_0_30px_rgba(16,185,129,0.15)] overflow-hidden group">
        {isLoading || isRefreshing ? (
          <div className="flex flex-col items-center gap-2.5">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-slate-600">
              Refreshing secure QR...
            </span>
          </div>
        ) : error ? (
          <div className="text-center p-4 text-xs text-rose-600 font-semibold">
            <p className="font-bold mb-1 text-sm">QR Refresh Error</p>
            <p className="text-slate-600">{error}</p>
          </div>
        ) : qrData && remainingMs > 0 ? (
          <QRCodeSVG
            value={qrData.payload}
            size={280}
            level="L"
            marginSize={2}
            bgColor="#ffffff"
            fgColor="#000000"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-center text-xs text-amber-600 font-bold flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span>Rotating QR Payload...</span>
          </div>
        )}
      </div>

      {/* Rotation Countdown Progress Bar */}
      <div className="w-full space-y-1.5 pt-1">
        <div className="flex justify-between text-xs text-slate-400 font-semibold">
          <span>Auto Rotation</span>
          <span className="font-mono text-emerald-400 font-bold">{remainingSeconds}s</span>
        </div>

        <div className="w-full bg-[#182236] h-2.5 rounded-full overflow-hidden border border-slate-800/80">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-100 linear shadow-[0_0_10px_rgba(16,185,129,0.4)]"
            style={{
              width: `${progressPercent}%`,
            }}
          />
        </div>
      </div>

      {/* Information Helper Subtext */}
      <p className="text-[11px] text-slate-400 mt-4 text-center leading-relaxed">
        QR code rotates automatically every {qrData?.rotationSeconds || 15} seconds.
        <br className="hidden sm:inline" />
        Students must scan from classroom display.
      </p>
    </div>
  );
}