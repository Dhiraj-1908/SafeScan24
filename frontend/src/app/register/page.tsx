"use client";
import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shell, Card, Logo, Button, Input, OTPInput, Alert } from "@/lib/ui";
import { usePhoneOTP } from "@/lib/usePhoneOTP";
import { exchangeToken } from "@/lib/api";

export default function RegisterPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const slug         = searchParams.get("slug") ?? undefined;

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
  } = usePhoneOTP("recaptcha-register");

  async function handleSend() {
    setApiError("");
    if (!name.trim())  { setError("Enter your name"); return; }
    if (!phone.trim()) { setError("Enter your phone number"); return; }
    await sendOTP(phone.trim());
  }

  async function handleVerify() {
    setApiError("");
    if (otp.length < 6) { setError("Enter the 6-digit code"); return; }
    const idToken = await verifyOTP(otp);
    if (!idToken) return;

    setLoading(true);
    try {
      await exchangeToken(idToken, { name: name.trim(), slug });
      router.push("/dashboard");
    } catch (e: any) {
      setApiError(e.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <div id="recaptcha-register" />

      <div className="mb-8 text-center">
        <Logo size="lg" />
        <p className="text-gray-500 text-sm mt-2">
          {slug ? "Create account to claim your QR" : "Create your account"}
        </p>
      </div>

      <Card>
        {!otpSent ? (
          <div className="flex flex-col gap-4">
            <Input
              label="Your name"
              placeholder="Dhiraj Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={error}
            />
            <Input
              label="Phone number"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              hint="Enter with country code, e.g. +91"
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
              Verify & Create Account
            </Button>

            <div className="text-center text-sm text-gray-500">
              {canResend ? (
                <button
                  onClick={() => { setOtp(""); handleSend(); }}
                  className="text-red-500 font-medium hover:underline"
                >
                  Resend code
                </button>
              ) : (
                <span>Resend in {countdown}s</span>
              )}
            </div>

            <button
              onClick={() => { setOtp(""); setError(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 text-center"
            >
              ← Change details
            </button>
          </div>
        )}
      </Card>

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{" "}
        <a href="/login" className="text-red-500 font-medium hover:underline">
          Log in
        </a>
      </p>
    </Shell>
  );
}