"use client";
import React from "react";
import QRCode from "qrcode";
import JSZip from "jszip";
import { Logo } from "@/lib/ui";

const BASE   = process.env.NEXT_PUBLIC_API_URL      ?? "http://localhost:8080";
const DOMAIN = process.env.NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000";

interface GeneratedQR {
  slug:    string;
  dataUrl: string;
}

function QRPreview({ generated }: { generated: GeneratedQR[] }) {
  const [expanded, setExpanded] = React.useState(true);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header — click to expand/collapse */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
            QR Preview
          </p>
          <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
            {generated.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {expanded ? "Collapse" : "Expand"}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Grid — collapsible */}
      {expanded && (
        <div className="px-6 pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {generated.map((qr) => (
              <div
                key={qr.slug}
                className="bg-gray-50 border border-gray-100 rounded-2xl p-3 flex flex-col items-center gap-2 hover:shadow-md hover:scale-105 transition-all cursor-pointer"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href     = qr.dataUrl;
                  a.download = `${qr.slug}.png`;
                  a.click();
                }}
                title="Click to download this QR"
              >
                <img
                  src={qr.dataUrl}
                  alt={`QR ${qr.slug}`}
                  className="w-full aspect-square rounded-lg"
                />
                <p className="text-gray-700 text-xs font-mono font-bold">#{qr.slug}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4 text-center">
            Click any QR to download individually
          </p>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [secret, setSecret]         = React.useState("");
  const [authed, setAuthed]         = React.useState(false);
  const [authError, setAuthError]   = React.useState("");

  const [count, setCount]           = React.useState<number | "">(10);
  const [countError, setCountError] = React.useState("");
  const [loading, setLoading]       = React.useState(false);
  const [error, setError]           = React.useState("");
  const [progress, setProgress]     = React.useState("");
  const [generated, setGenerated]   = React.useState<GeneratedQR[]>([]);

  function handleAuth() {
    if (!secret.trim()) { setAuthError("Enter the admin secret"); return; }
    setAuthed(true);
  }

  function handleCountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === "") { setCount(""); setCountError(""); return; }
    const val = parseInt(raw);
    if (isNaN(val)) { setCount(""); setCountError("Must be a number"); return; }
    setCount(val);
    if (val < 1 || val > 200) setCountError("Must be between 1 and 200");
    else setCountError("");
  }

  async function handleGenerate() {
    const n = typeof count === "number" ? count : 0;
    if (n < 1 || n > 200) { setCountError("Must be between 1 and 200"); return; }
    setLoading(true);
    setError("");
    setGenerated([]);
    setProgress("Requesting slugs from server...");

    try {
      const res = await fetch(`${BASE}/api/admin/generate`, {
        method: "POST",
        headers: {
          "Content-Type":   "application/json",
          "X-Admin-Secret": secret,
        },
        body: JSON.stringify({ count: n }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Backend error: ${res.status}`);
      }

      const data  = await res.json();
      const slugs: string[] = data.slugs;
      if (!slugs?.length) throw new Error("No slugs returned");

      const results: GeneratedQR[] = [];
      const zip    = new JSZip();
      const folder = zip.folder("safescan-qr-codes")!;

      for (let i = 0; i < slugs.length; i++) {
        const slug = slugs[i];
        const url  = `${DOMAIN}/q/${slug}`;
        setProgress(`Generating QR ${i + 1} of ${slugs.length}...`);

        const dataUrl = await QRCode.toDataURL(url, {
          width: 400, margin: 2,
          color: { dark: "#111111", light: "#ffffff" },
        });

        results.push({ slug, dataUrl });
        folder.file(`${slug}.png`, dataUrl.split(",")[1], { base64: true });
      }

      setGenerated(results);
      setProgress("Creating ZIP...");

      const blob        = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(blob);
      const a           = document.createElement("a");
      a.href     = downloadUrl;
      a.download = `safescan-${slugs[0]}-to-${slugs[slugs.length - 1]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      setProgress("");

    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
      setProgress("");
    } finally {
      setLoading(false);
    }
  }

  // ── Auth screen ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center">
            <Logo size="lg" />
            <p className="text-gray-400 text-sm mt-2 font-mono tracking-widest uppercase">
              Admin Panel
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-3 shadow-sm">
            <p className="text-gray-700 text-sm font-medium">Enter admin secret</p>
            <input
              type="password"
              placeholder="Secret key"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-red-400 transition-colors"
            />
            {authError && <p className="text-red-500 text-xs">{authError}</p>}
            <button
              onClick={handleAuth}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              Enter
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main admin screen ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Logo size="md" />
        <span className="text-xs text-gray-400 font-mono tracking-widest uppercase">Admin Panel</span>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">

        {/* Generator card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-5">
            Generate QR Codes
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="flex-1">
              <label className="text-sm text-gray-600 mb-1.5 block">
                Number of QR codes <span className="text-gray-400">(1–200)</span>
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={count}
                onChange={handleCountChange}
                placeholder="e.g. 50"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-red-400 transition-colors"
              />
              {countError && (
                <p className="text-red-500 text-xs mt-1.5">⚠ {countError}</p>
              )}
            </div>

            <div className="sm:pt-6">
              <button
                onClick={handleGenerate}
                disabled={loading || !!countError || count === ""}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-3 text-sm transition-colors whitespace-nowrap flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Working...
                  </>
                ) : "⬇ Generate & Download ZIP"}
              </button>
            </div>
          </div>

          {progress && (
            <div className="mt-4 flex items-center gap-2 text-sm text-blue-500">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              {progress}
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              ⚠ {error}
            </div>
          )}

          {generated.length > 0 && !loading && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
              ✅ {generated.length} QR codes generated ({generated[0].slug} → {generated[generated.length - 1].slug}) — ZIP downloaded!
            </div>
          )}

          <p className="text-xs text-gray-400 mt-4 font-mono">
            Each QR encodes: {DOMAIN}/q/&#123;slug&#125;
          </p>
        </div>

        {/* QR Preview — collapsible */}
        {generated.length > 0 && <QRPreview generated={generated} />}

      </main>
    </div>
  );
}