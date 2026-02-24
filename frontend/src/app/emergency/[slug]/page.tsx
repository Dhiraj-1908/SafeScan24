"use client";
import React from "react";
import { useParams } from "next/navigation";
import { scanQR } from "@/lib/api";
import { Button, FullPageSpinner } from "@/lib/ui";

type CallState = "idle" | "calling" | "called" | "error";

interface Contact {
  id: string;
  name: string;
  relationship: string;
  isOwner?: boolean;
}

interface QRData {
  ownerName: string;
  ownerId: string;
  contacts: Contact[];
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return raw.trim();
  if (digits.length === 10) return `+91${digits}`;
  return raw.trim();
}

export default function EmergencyPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const [qr, setQr]                   = React.useState<QRData | null>(null);
  const [pageLoading, setPageLoading] = React.useState(true);
  const [pageError, setPageError]     = React.useState("");

  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null);
  const [scannerPhone, setScannerPhone]       = React.useState("");
  const [callState, setCallState]             = React.useState<CallState>("idle");
  const [callError, setCallError]             = React.useState("");

  React.useEffect(() => {
    if (!slug) return;
    scanQR(slug)
      .then((data) => {
        if (!data || data.status !== "claimed") {
          setPageError("This QR code is not set up yet.");
          return;
        }
        setQr({
          ownerName: String(data.ownerName ?? "Unknown"),
          ownerId:   String(data.ownerId ?? ""),
          contacts:  Array.isArray(data.contacts) ? data.contacts : [],
        });
      })
      .catch(() => setPageError("Could not load this QR code."))
      .finally(() => setPageLoading(false));
  }, [slug]);

  async function handleCall() {
    const sc = selectedContact;
    if (!sc) return;
    const formatted = formatPhone(scannerPhone);
    if (!formatted || formatted.length < 10) {
      setCallError("Enter your phone number first");
      return;
    }
    setCallState("calling");
    setCallError("");
    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
      const payload = sc.isOwner
        ? { ownerId: sc.id, scannerPhone: formatted }
        : { contactId: sc.id, scannerPhone: formatted };
      const res = await fetch(`${BASE}/api/call/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(String(err.error ?? err.message ?? "Call failed"));
      }
      setCallState("called");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Call failed. Please try again.";
      setCallError(msg);
      setCallState("error");
    }
  }

  function resetCall() {
    setSelectedContact(null);
    setScannerPhone("");
    setCallState("idle");
    setCallError("");
  }

  function openCallSheet(contact: Contact) {
    setSelectedContact(contact);
    setCallState("idle");
    setCallError("");
  }

  // ── Loading ────────────────────────────────────────────────────────────
  if (pageLoading) return <FullPageSpinner label="Loading…" />;

  // ── Error ──────────────────────────────────────────────────────────────
  if (!qr) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-[40px] mb-4">⚠️</p>
        <p className="font-bold text-[17px] text-[#1C1C1E] mb-2">QR not found</p>
        <p className="text-[14px] text-[#8E8E93]">{pageError}</p>
      </div>
    );
  }

  // ── qr is guaranteed non-null from here ───────────────────────────────
  const ownerContact: Contact = {
    id:           qr.ownerId,
    name:         qr.ownerName,
    relationship: "Owner",
    isOwner:      true,
  };

  // sc is a stable non-null snapshot used inside the bottom sheet
  const sc = selectedContact;

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Emergency header ──────────────────────────────────────────── */}
      <div className="bg-[#FF3B30] px-6 pb-8 pt-[max(48px,calc(env(safe-area-inset-top)+24px))]">
        <p className="text-white/70 text-[11px] font-semibold tracking-[0.12em] uppercase mb-3">
          Emergency scan
        </p>
        <h1 className="text-white text-[32px] font-bold tracking-tight leading-snug">
          {qr.ownerName}
        </h1>
        <p className="text-white/70 text-[14px] mt-1">needs help</p>

        <button
          onClick={() => openCallSheet(ownerContact)}
          className="inline-flex items-center gap-2 mt-5 bg-white/20 text-white text-[14px] font-semibold px-4 py-2.5 rounded-full backdrop-blur-sm border border-white/30 active:bg-white/30 transition-colors"
        >
          📞 Call {qr.ownerName} directly
        </button>
      </div>

      {/* ── National emergency number ─────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-[#F2F2F7] flex items-center justify-between">
  <p className="text-[13px] text-[#8E8E93]">National emergency line</p>
  
    <a href="tel:112" className="inline-flex items-center gap-1.5 text-[#FF3B30] font-bold text-[17px] min-h-[44px]">
  📞 112
</a>
</div>

      {/* ── Contacts list ─────────────────────────────────────────────── */}
      <main className="flex-1 px-6 py-6 flex flex-col gap-3 pb-[max(32px,env(safe-area-inset-bottom))]">
        <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#AEAEB2] mb-1">
          Emergency contacts
        </p>

        {qr.contacts.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-[#AEAEB2] text-[14px]">No contacts set up yet</p>
          </div>
        )}

        {qr.contacts.map((c) => (
          <button
            key={c.id}
            onClick={() => openCallSheet(c)}
            className="w-full flex items-center justify-between bg-[#F9F9FB] border border-[#E5E5EA] rounded-2xl px-5 py-4 text-left min-h-[72px] active:bg-[#F2F2F7] transition-colors"
          >
            <div>
              <p className="font-semibold text-[17px] text-[#1C1C1E] tracking-tight">{c.name}</p>
              <p className="text-[13px] text-[#8E8E93] mt-0.5">{c.relationship}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#FF3B30] flex items-center justify-center text-white text-[18px] shrink-0">
              📞
            </div>
          </button>
        ))}
      </main>

      {/* ── Call bottom sheet ─────────────────────────────────────────── */}
      {sc !== null && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={resetCall}
          />
          <div className="relative z-10 bg-white w-full rounded-t-[28px] px-6 pt-6 pb-[max(32px,env(safe-area-inset-bottom))] animate-slide-up shadow-[0_-8px_48px_rgba(0,0,0,0.16)]">
            <div className="w-10 h-1 bg-[#E5E5EA] rounded-full mx-auto mb-6" />

            {callState === "called" ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-[#EDFAF1] flex items-center justify-center text-[32px] mx-auto mb-5">
                  ✅
                </div>
                <h3 className="font-bold text-[20px] text-[#1C1C1E] tracking-tight mb-2">
                  Call initiated
                </h3>
                <p className="text-[14px] text-[#8E8E93] leading-relaxed mb-8">
                  Answer your phone. You'll be connected to{" "}
                  <span className="font-semibold text-[#3A3A3C]">{sc.name}</span>.
                </p>
                <Button variant="secondary" fullWidth onClick={resetCall}>
                  Done
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h3 className="font-bold text-[22px] text-[#1C1C1E] tracking-tight leading-snug">
                    Call {sc.name}
                  </h3>
                  <p className="text-[13px] text-[#8E8E93] mt-1">
                    {sc.isOwner ? "Owner" : sc.relationship} · your number stays private
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-[13px] font-medium text-[#3A3A3C] mb-1.5">
                    Your phone number
                  </p>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoFocus
                    placeholder="98765 43210"
                    value={scannerPhone}
                    onChange={(e) => { setScannerPhone(e.target.value); setCallError(""); }}
                    className="w-full rounded-xl border border-[#E5E5EA] px-4 py-3.5 text-[17px] text-[#1C1C1E] bg-white focus:outline-none focus:border-[#C7C7CC] focus:ring-2 focus:ring-[#FF3B30]/20 transition min-h-[52px] placeholder:text-[#AEAEB2]"
                  />
                  {callError && (
                    <p className="text-[12px] text-[#FF3B30] mt-1.5">{callError}</p>
                  )}
                  <p className="text-[12px] text-[#AEAEB2] mt-1.5">
                    We'll call you first, then connect you — numbers stay private.
                  </p>
                </div>

                <Button
                  onClick={handleCall}
                  loading={callState === "calling"}
                  size="lg"
                  fullWidth
                >
                  {callState === "calling" ? "Connecting…" : `Call ${sc.name}`}
                </Button>

                <button
                  onClick={resetCall}
                  className="w-full text-center text-[14px] text-[#AEAEB2] mt-4 min-h-[44px] active:text-[#636366] transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}