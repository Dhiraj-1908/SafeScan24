"use client";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { Shell, Logo, Button, Input, OTPInput } from "@/lib/ui";
import { usePhoneOTP } from "@/lib/usePhoneOTP";
import { checkPhone, exchangeToken, saveSlug } from "@/lib/api";

type Tab   = "new" | "existing";
type Stage = "form" | "otp";

function PhoneInput({
  value,
  onChange,
  onEnter,
  error,
  autoFocus,
}: {
  value: string;
  onChange: (val: string) => void;
  onEnter?: () => void;
  error?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-[#3A3A3C] select-none">
        Phone number
      </label>
      <div
        className={[
          "flex items-center rounded-xl border bg-white overflow-hidden transition duration-150",
          "focus-within:ring-2 focus-within:ring-[#FF3B30]/20",
          error
            ? "border-[#FF3B30]"
            : "border-[#E5E5EA] focus-within:border-[#C7C7CC]",
        ].join(" ")}
      >
        <div className="flex items-center gap-1.5 pl-4 pr-3 border-r border-[#E5E5EA] shrink-0 select-none h-[52px]">
          <span className="text-[15px]">🇮🇳</span>
          <span className="text-[17px] font-medium text-[#3A3A3C]">+91</span>
        </div>
        <input
          type="tel"
          inputMode="numeric"
          autoFocus={autoFocus}
          autoComplete="tel-national"
          placeholder="98765 43210"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          className="flex-1 px-4 py-3.5 text-[17px] text-[#1C1C1E] bg-transparent focus:outline-none placeholder:text-[#AEAEB2] min-h-[52px]"
        />
      </div>
      {error && <p className="text-[12px] text-[#FF3B30] mt-0.5">{error}</p>}
    </div>
  );
}

export default function ClaimPage() {
  const { slug } = useParams<{ slug: string }>();
  const router   = useRouter();

  const [tab, setTab]           = React.useState<Tab>("new");
  const [stage, setStage]       = React.useState<Stage>("form");
  const [name, setName]         = React.useState("");
  const [digits, setDigits]     = React.useState("");
  const [otp, setOtp]           = React.useState("");
  const [error, setError]       = React.useState("");
  const [infoMsg, setInfoMsg]   = React.useState("");
  const [checking, setChecking] = React.useState(false);
  const [loading, setLoading]   = React.useState(false);

  const {
    sendOTP, verifyOTP,
    sending, verifying,
    error: hookError, setError: setHookError,
    countdown, canResend,
  } = usePhoneOTP("recaptcha-claim");

  React.useEffect(() => {
    if (hookError) setError(hookError);
  }, [hookError]);

  function clearMessages() { setError(""); setHookError(""); setInfoMsg(""); }

  const fullPhone = `+91${digits}`;

  function switchTab(t: Tab) {
    setTab(t); setStage("form");
    setName(""); setDigits(""); setOtp("");
    clearMessages();
  }

  // ── Continue: check phone FIRST, then decide whether to send OTP ──────────
  async function handleContinue() {
    clearMessages();

    if (tab === "new" && !name.trim()) { setError("Enter your name"); return; }
    if (digits.length !== 10) { setError("Enter your 10-digit mobile number"); return; }

    // 1. DB check — no OTP yet
    setChecking(true);
    let exists: boolean;
    try {
      const res = await checkPhone(fullPhone);
      exists = res.exists;
    } catch {
      setError("Could not verify phone. Please try again.");
      setChecking(false);
      return;
    }
    setChecking(false);

    if (tab === "new") {
      if (exists) {
        // Already registered — switch tab, keep phone, show nudge
        setTab("existing");
        setName("");
        setInfoMsg("This number is already registered. Just verify your number to continue.");
        return; // no OTP sent
      }
      // New phone — send OTP, then register on verify
      const ok = await sendOTP(fullPhone);
      if (ok) setStage("otp");

    } else {
      // "Already registered" tab
      if (!exists) {
        // Not in DB — switch tab, keep phone, show nudge
        setTab("new");
        setInfoMsg("We couldn't find this number. Please register as a new user.");
        return; // no OTP sent
      }
      // Exists — send OTP to verify identity
      const ok = await sendOTP(fullPhone);
      if (ok) setStage("otp");
    }
  }

  // ── OTP verified → call firebase-verify → dashboard ──────────────────────
  async function handleVerify(otpValue = otp) {
    clearMessages();
    if (otpValue.length < 6) { setError("Enter the 6-digit code"); return; }

    const idToken = await verifyOTP(otpValue);
    if (!idToken) return;

    setLoading(true);
    try {
      await exchangeToken(idToken, {
        slug,
        name: tab === "new" ? name.trim() : undefined,
      });
      saveSlug(slug);
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message ?? "Failed to claim QR. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(val: string) {
    setOtp(val);
    if (val.length === 6) handleVerify(val);
  }

  async function handleResend() {
    setOtp("");
    clearMessages();
    const ok = await sendOTP(fullPhone);
    if (ok) setStage("otp");
  }

  return (
    <Shell center={false} className="pt-[max(56px,calc(env(safe-area-inset-top)+32px))]">
      <div id="recaptcha-claim" />

      {/* Header */}
      <div className="mb-10 animate-fade-up">
        <Logo size="md" />
        <h1 className="text-[28px] font-bold tracking-tight text-[#1C1C1E] mt-6 leading-snug">
          Claim your QR
        </h1>
        <p className="text-[15px] text-[#8E8E93] mt-1.5">
          Sticker{" "}
          <span className="font-mono text-[#3A3A3C] font-semibold tracking-wide">
            #{slug}
          </span>
        </p>
      </div>

      {/* Tab switcher */}
      {stage === "form" && (
        <div
          className="flex rounded-xl bg-[#F2F2F7] p-1 mb-8 animate-fade-up"
          style={{ animationDelay: "40ms" }}
        >
          {(["new", "existing"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={[
                "flex-1 text-[13px] font-semibold py-2 rounded-lg transition-all min-h-[40px]",
                tab === t
                  ? "bg-white text-[#1C1C1E] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                  : "text-[#8E8E93] active:text-[#3A3A3C]",
              ].join(" ")}
            >
              {t === "new" ? "New user" : "Already registered"}
            </button>
          ))}
        </div>
      )}

      {/* Info nudge banner */}
      {infoMsg && stage === "form" && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-[#FFF9E6] border border-[#FFD60A]/40 animate-fade-up">
          <p className="text-[13px] text-[#7D5200] font-medium">{infoMsg}</p>
        </div>
      )}

      {/* ── Form stage ── */}
      {stage === "form" && (
        <div className="flex flex-col gap-5 animate-fade-up" style={{ animationDelay: "80ms" }}>
          {tab === "new" && (
            <Input
              label="Your name"
              placeholder="Dhiraj Kumar"
              autoFocus
              autoComplete="name"
              value={name}
              onChange={(e) => { setName(e.target.value); clearMessages(); }}
            />
          )}
          <PhoneInput
            value={digits}
            onChange={(v) => { setDigits(v); clearMessages(); }}
            onEnter={handleContinue}
            error={error}
            autoFocus={tab === "existing"}
          />
          <Button
            onClick={handleContinue}
            loading={checking || sending}
            size="lg"
            fullWidth
          >
            Continue
          </Button>
        </div>
      )}

      {/* ── OTP stage ── */}
      {stage === "otp" && (
        <div className="flex flex-col gap-6 animate-fade-up">
          <div className="mb-2">
            <p className="text-[28px] font-bold tracking-tight text-[#1C1C1E] leading-snug">
              Enter code
            </p>
            <p className="text-[15px] text-[#8E8E93] mt-1.5">
              Sent to +91 {digits}
            </p>
          </div>

          <OTPInput
            value={otp}
            onChange={handleOtpChange}
            error={error}
            disabled={verifying || loading}
          />

          <Button
            onClick={() => handleVerify()}
            loading={verifying || loading}
            size="lg"
            fullWidth
            disabled={otp.length < 6}
          >
            {tab === "new" ? "Create account & claim" : "Verify & claim"}
          </Button>

          <div className="text-center">
            {canResend ? (
              <button
                onClick={handleResend}
                disabled={sending}
                className="text-[15px] text-[#FF3B30] font-medium min-h-[44px] px-3"
              >
                {sending ? "Sending…" : "Resend code"}
              </button>
            ) : (
              <p className="text-[14px] text-[#AEAEB2]">
                Resend in{" "}
                <span className="font-semibold text-[#636366] tabular-nums">{countdown}s</span>
              </p>
            )}
          </div>

          <button
            onClick={() => { setStage("form"); setOtp(""); clearMessages(); }}
            className="text-[13px] text-[#AEAEB2] text-center min-h-[44px] active:text-[#636366] transition-colors"
          >
            ← Change details
          </button>
        </div>
      )}
    </Shell>
  );
}