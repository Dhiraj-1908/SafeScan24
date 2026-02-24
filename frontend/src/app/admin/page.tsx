"use client";
import React from "react";
import { Button, Input, Alert, Card, Logo, Shell } from "@/lib/ui";
import { bulkGenerateQR } from "@/lib/api";
import QRCode from "qrcode";
import JSZip from "jszip";

export default function AdminPage() {
  const [secret, setSecret]   = React.useState("");
  const [authed, setAuthed]   = React.useState(false);
  const [count, setCount]     = React.useState("10");
  const [loading, setLoading] = React.useState(false);
  const [error, setError]     = React.useState("");
  const [slugs, setSlugs]     = React.useState<string[]>([]);
  const [origin, setOrigin]   = React.useState("");
  const [showAll, setShowAll] = React.useState(false);

  React.useEffect(() => { setOrigin(window.location.origin); }, []);

  async function handleGenerate() {
    setError("");
    setLoading(true);
    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
      const res = await fetch(`${BASE}/api/admin/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Secret": secret,
        },
        body: JSON.stringify({ count: parseInt(count, 10) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? err.message ?? "Generation failed");
      }
      const result: { slugs: string[] } = await res.json();
      setSlugs(result.slugs);
      await downloadZip(result.slugs);
    } catch (e: any) {
      setError(e.message ?? "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function downloadZip(slugList: string[]) {
    const zip = new JSZip();
    for (const slug of slugList) {
      const url = `${origin}/q/${slug}`;
      const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2 });
      const base64 = dataUrl.split(",")[1];
      zip.file(`${slug}.png`, base64, { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `safescan-qr-codes.zip`;
    a.click();
  }

  async function downloadSingle(slug: string) {
    const url = `${origin}/q/${slug}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${slug}.png`;
    a.click();
  }

  const visibleSlugs = showAll ? slugs : slugs.slice(0, 12);

  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <Shell>
        <div className="mb-10 animate-fade-up">
          <Logo size="lg" />
          <h1 className="text-[28px] font-bold tracking-tight text-[#1C1C1E] mt-6">
            Admin
          </h1>
          <p className="text-[15px] text-[#8E8E93] mt-1">Enter your admin secret to continue</p>
        </div>

        <div className="flex flex-col gap-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <Input
            label="Admin secret"
            type="password"
            autoFocus
            placeholder="••••••••••••"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setAuthed(true)}
          />
          <Button size="lg" fullWidth onClick={() => setAuthed(true)} disabled={!secret.trim()}>
            Continue
          </Button>
        </div>
      </Shell>
    );
  }

  // ── Main admin ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen min-h-dvh bg-[#F9F9FB]">
      <div className="max-w-lg mx-auto px-5 pt-[max(48px,calc(env(safe-area-inset-top)+24px))] pb-16">

        <div className="mb-10">
          <Logo size="md" />
          <h1 className="text-[28px] font-bold tracking-tight text-[#1C1C1E] mt-6">
            Generate QR codes
          </h1>
          <p className="text-[14px] text-[#8E8E93] mt-1">
            Each code encodes <span className="font-mono text-[#3A3A3C]">{origin}/q/&#123;slug&#125;</span>
          </p>
        </div>

        <Card className="mb-5">
          <div className="flex flex-col gap-4">
            <Input
              label="Number of codes"
              type="number"
              inputMode="numeric"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              hint="1 – 200"
            />
            {error && <Alert>{error}</Alert>}
            <Button
              onClick={handleGenerate}
              loading={loading}
              size="lg"
              fullWidth
            >
              {loading ? "Generating…" : "Generate & download ZIP"}
            </Button>
          </div>
        </Card>

        {/* Generated slugs grid */}
        {slugs.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#AEAEB2] mb-4">
              {slugs.length} codes generated
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {visibleSlugs.map((slug) => (
                <button
                  key={slug}
                  onClick={() => downloadSingle(slug)}
                  className="bg-white border border-[#E5E5EA] rounded-xl px-3 py-3 text-center group hover:border-[#FF3B30]/30 active:bg-[#FFF0EF] transition-colors"
                >
                  <p className="font-mono text-[12px] font-semibold text-[#1C1C1E]">
                    #{slug}
                  </p>
                  <p className="text-[10px] text-[#AEAEB2] mt-0.5 group-hover:text-[#FF3B30] transition-colors">
                    Download
                  </p>
                </button>
              ))}
            </div>

            {slugs.length > 12 && (
              <button
                onClick={() => setShowAll((s) => !s)}
                className="text-[13px] text-[#8E8E93] font-medium min-h-[44px] w-full text-center active:text-[#3A3A3C] transition-colors"
              >
                {showAll ? "Show less" : `Show all ${slugs.length} codes`}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}