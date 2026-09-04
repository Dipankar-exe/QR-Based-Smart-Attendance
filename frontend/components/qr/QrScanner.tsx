"use client";

import React, { useEffect, useRef, useState } from "react";

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onError?: (errorMessage: string) => void;
  isPaused?: boolean;
}

export function QrScanner({
  onScanSuccess,
  onError,
  isPaused = false,
}: QrScannerProps) {
  const scannerContainerId = "html5-qr-code-scanner-container";

  const html5QrCodeRef = useRef<any>(null);
  const isStartedRef = useRef(false);
  const hasDecodedRef = useRef(false);

  const onScanSuccessRef = useRef(onScanSuccess);
  const onErrorRef = useRef(onError);
  const isPausedRef = useRef(isPaused);

  const [cameraError, setCameraError] = useState<string | null>(null);

  // Keep latest callback without restarting camera
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Start scanner only once
  useEffect(() => {
    let isMounted = true;

    async function initScanner() {
      try {
        setCameraError(null);

        const { Html5Qrcode } = await import("html5-qrcode");

        if (!isMounted) return;

        const scanner = new Html5Qrcode(scannerContainerId);

        html5QrCodeRef.current = scanner;

        const config = {
          fps: 15,

          qrbox: (
            viewfinderWidth: number,
            viewfinderHeight: number
          ) => {
            const minEdge = Math.min(
              viewfinderWidth,
              viewfinderHeight
            );

            const size = Math.floor(minEdge * 0.85);

            return {
              width: size,
              height: size,
            };
          },

          aspectRatio: 1.0,
          disableFlip: false,
        };

        await scanner.start(
          // IMPORTANT:
          // html5-qrcode accepts environment as a plain string here.
          { facingMode: "environment" },

          config,

          (decodedText: string) => {
            if (
              !isStartedRef.current ||
              isPausedRef.current ||
              hasDecodedRef.current
            ) {
              return;
            }

            hasDecodedRef.current = true;

            console.log(
              "[QR] Successfully decoded:",
              decodedText
            );

            try {
              scanner.pause(true);
            } catch {
              // Ignore pause errors
            }

            onScanSuccessRef.current(decodedText);
          },

          () => {
            // Frame without QR is normal.
            // Do not show an error for every frame.
          }
        );

        if (!isMounted) {
          try {
            await scanner.stop();
          } catch {}

          return;
        }

        isStartedRef.current = true;

        console.log("[QR] Scanner started successfully");
      } catch (err: any) {
        if (!isMounted) return;

        console.error(
          "[QR] Scanner initialization failed:",
          err
        );

        const msg =
          err?.message ||
          String(err) ||
          "Failed to access camera. Please grant camera permission.";

        setCameraError(msg);

        onErrorRef.current?.(msg);
      }
    }

    initScanner();

    return () => {
      isMounted = false;
      isStartedRef.current = false;
      hasDecodedRef.current = false;

      const scanner = html5QrCodeRef.current;

      html5QrCodeRef.current = null;

      if (!scanner) return;

      try {
        if (scanner.isScanning) {
          scanner
            .stop()
            .then(() => {
              try {
                scanner.clear();
              } catch {}
            })
            .catch(() => {});
        } else {
          scanner.clear();
        }
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center">
      {cameraError ? (
        <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-xl text-red-300 text-xs text-center">
          <p className="font-semibold mb-1">
            Camera Permission Required
          </p>

          <p>{cameraError}</p>
        </div>
      ) : (
        <div className="w-full relative rounded-2xl overflow-hidden border-2 border-emerald-500/50 bg-black shadow-lg">
          <div
            id={scannerContainerId}
            className="w-full min-h-[320px]"
          />

          {isPaused && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center text-white text-xs font-semibold">
              Scanner Paused (Processing...)
            </div>
          )}
        </div>
      )}
    </div>
  );
}