"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Link2, RefreshCw, Square, Smartphone } from "lucide-react";

type BaileysStatus = {
  sessionName: string;
  status: string;
  phone?: string;
  error?: string;
  updatedAt: string;
  hasQr: boolean;
  qrDataUrl?: string | null;
};

type BaileysQrPanelProps = {
  defaultSessionName: string;
};

export function BaileysQrPanel({ defaultSessionName }: BaileysQrPanelProps) {
  const sessionName = defaultSessionName;
  const [status, setStatus] = useState<BaileysStatus | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async (currentSessionName = defaultSessionName) => {
    const response = await fetch(`/api/admin/whatsapp/baileys?sessionName=${encodeURIComponent(currentSessionName)}`, {
      cache: "no-store"
    });
    const data = (await response.json()) as BaileysStatus | { error?: string };

    if (!response.ok) {
      throw new Error("error" in data && data.error ? data.error : "Could not load WhatsApp connection status.");
    }

    setStatus(data as BaileysStatus);
  }, [defaultSessionName]);

  async function generateQr() {
    setIsLoading(true);
    setError(null);
    setQrDataUrl(null);

    try {
      const response = await fetch("/api/admin/whatsapp/baileys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionName })
      });
      const data = (await response.json()) as BaileysStatus | { error?: string; qrDataUrl?: string | null };

      if (!response.ok) {
        throw new Error("error" in data && data.error ? data.error : "Could not generate QR.");
      }

      setStatus(data as BaileysStatus);
      setQrDataUrl(data.qrDataUrl ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsLoading(false);
    }
  }

  async function stopSession() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/whatsapp/baileys?sessionName=${encodeURIComponent(sessionName)}`, {
        method: "DELETE"
      });
      const data = (await response.json()) as BaileysStatus | { error?: string };

      if (!response.ok) {
        throw new Error("error" in data && data.error ? data.error : "Could not stop session.");
      }

      setStatus(data as BaileysStatus);
      setQrDataUrl(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshStatus(defaultSessionName).catch(() => {
        setStatus(null);
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [defaultSessionName, refreshStatus]);

  useEffect(() => {
    if (!status || status.status !== "qr") {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshStatus().catch((caught) => {
        setError(caught instanceof Error ? caught.message : String(caught));
      });
    }, 4000);

    return () => window.clearInterval(timer);
  }, [refreshStatus, status]);

  return (
    <div className="baileys-panel">
      <div className="panel-title">
        <h2>
          <Link2 size={18} aria-hidden="true" />
          WhatsApp QR pairing
        </h2>
        <span className={`status ${status?.status === "connected" ? "approved" : "quoted"}`}>
          {status?.status ?? "IDLE"}
        </span>
      </div>

      <label>
        Connected phone
        <input value={status?.phone ?? "Not connected"} readOnly />
      </label>

      <div className="qr-actions">
        <button className="button primary" type="button" onClick={generateQr} disabled={isLoading}>
          <RefreshCw size={16} aria-hidden="true" />
          {isLoading ? "Working..." : "Generate QR"}
        </button>
        <button className="button" type="button" onClick={() => refreshStatus().catch((caught) => setError(String(caught)))}>
          <RefreshCw size={16} aria-hidden="true" />
          Refresh status
        </button>
        <button className="button danger" type="button" onClick={stopSession} disabled={isLoading}>
          <Square size={16} aria-hidden="true" />
          Stop session
        </button>
      </div>

      {qrDataUrl ? (
        <div className="qr-card">
          <Image src={qrDataUrl} alt="WhatsApp pairing QR code" width={280} height={280} unoptimized />
          <div className="settings-callout">
            <Smartphone size={18} aria-hidden="true" />
            <span>On the sender phone, open WhatsApp, go to Linked devices, tap Link a device, then scan this QR.</span>
          </div>
        </div>
      ) : null}

      {status?.status === "connected" ? (
        <p className="form-success">WhatsApp number connected. Live RFQ sending is still unchanged until cutover.</p>
      ) : null}
      {status?.error ? <p className="form-error">{status.error}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
