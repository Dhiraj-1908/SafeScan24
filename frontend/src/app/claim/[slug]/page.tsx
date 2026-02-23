"use client";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { Shell, Card, Logo, Button, Input, OTPInput, Alert } from "@/lib/ui";
import { usePhoneOTP } from "@/lib/usePhoneOTP";
import { exchangeToken } from "@/lib/api";

type Tab = "new" | "existing";

export default function ClaimPage() {
  const { slug } = useParams<{ slug: string }>();
  const router   = useRouter();

  const [tab, setTab]           = React.useState<Tab>("new");
  const [name, setName]         = React.useState("");
  const [phone, setPhone]       = React.useState("");
  const [otp, setOtp]           = React.useState("");
  const [apiError, setApiError] = React.useState("");
  const [loading, setLoading]   = React.useState(false);

  const {
    sendOTP, verifyOTP,
    sending, verifying,
    error, setError,
    otpSent, countdown, canResend,
  } = usePhoneOTP("recaptcha-claim");

  function switchTab(t: Tab) {
    setTab(t);
    setName(""); setPhone(""); setOtp("");
    setError(""); setApiError("");
  }

  async function handleSend() {
    setApiError("");
    if (tab === "new" && !name.trim()) { setError("Enter your name"); return; }
    if (!phone.trim()) { setError("Enter your phone number"); return; }
    await sendOTP(phone.trim());
  }

  async function handleVerify() {
    setApiError("");
    if (otp.length < 6) { setError("Enter the 6-digit code"); return; }
    const idToken = await verifyOTP(otp);
console.log("FULL TOKEN:", idToken);  // already there
    if (!idToken) return;

    setLoading(true);
    try {
      await exchangeToken(idToken, {
  slug,
  name: tab === "new" ? name.trim() : undefined,
});
// Save slug so dashboard can load it
const { saveSlug } = await import("@/lib/api");
saveSlug(slug);
router.push("/dashboard");
    } catch (e: any) {
      setApiError(e.message ?? "Failed to claim QR");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <div id="recaptcha-claim" />

      <div className="mb-8 text-center">
        <Logo size="lg" />
        <p className="text-gray-500 text-sm mt-2">Claim your SafeScan QR</p>
        <p className="text-xs text-gray-400 mt-1 font-mono bg-gray-100 px-2 py-1 rounded-lg inline-block">
          #{slug}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 mb-4">
        {(["new", "existing"] as Tab[]).map((t) => (
          <button key={t} onClick={() => switchTab(t)}
            className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all
              ${tab === t
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"}`}>
            {t === "new" ? "New user" : "Already registered"}
          </button>
        ))}
      </div>

      <Card>
        {!otpSent ? (
          <div className="flex flex-col gap-4">
            {tab === "new" && (
              <Input
                label="Your name"
                placeholder="Dhiraj Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <Input
  label="Phone number"
  type="tel"
  placeholder="+91XXXXXXXXXX"
  value={phone}
  onChange={(e) => setPhone(e.target.value)}
  onKeyDown={(e) => e.key === "Enter" && handleSend()}
  hint="Must include country code — e.g. +918076748608"
  error={error}
/>
            {apiError && <Alert>{apiError}</Alert>}
            <Button onClick={handleSend} loading={sending} size="lg" className="w-full">
              Send OTP
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Code sent to</p>
              <p className="font-semibold text-gray-900">{phone}</p>
            </div>

            <OTPInput value={otp} onChange={setOtp} error={error} />

            {apiError && <Alert>{apiError}</Alert>}

            <Button
              onClick={handleVerify}
              loading={verifying || loading}
              size="lg"
              className="w-full"
            >
              {tab === "new" ? "Create account & claim" : "Verify & claim"}
            </Button>

            <div className="text-center text-sm text-gray-500">
              {canResend ? (
                <button onClick={() => { setOtp(""); handleSend(); }}
                  className="text-red-500 font-medium hover:underline">
                  Resend code
                </button>
              ) : (
                <span>Resend in {countdown}s</span>
              )}
            </div>

            <button onClick={() => { setOtp(""); setError(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 text-center">
              ← Change details
            </button>
          </div>
        )}
      </Card>
    </Shell>
  );
}