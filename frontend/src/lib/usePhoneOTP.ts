"use client";
import React from "react";
import { signInWithPhoneNumber, ConfirmationResult, RecaptchaVerifier } from "firebase/auth";
import { auth } from "./firebase";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export function usePhoneOTP(_recaptchaContainerId: string) {
  const [confirmation, setConfirmation] = React.useState<ConfirmationResult | null>(null);
  const [sending, setSending]     = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [error, setError]         = React.useState("");
  const [countdown, setCountdown] = React.useState(0);

  React.useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      try {
        window.recaptchaVerifier?.clear();
        window.recaptchaVerifier = undefined;
      } catch {}
    };
  }, []);

  async function sendOTP(phone: string): Promise<boolean> {
    setError("");
    setSending(true);

    // Clear old verifier
    try {
      window.recaptchaVerifier?.clear();
      window.recaptchaVerifier = undefined;
    } catch {}

    // Create a fresh detached container
    const container = document.createElement("div");
    document.body.appendChild(container);

    try {
      const verifier = new RecaptchaVerifier(auth, container, {
        size: "invisible",
        callback: () => {
          // reCAPTCHA solved — clean up the container
          try { container.remove(); } catch {}
        },
      });

      window.recaptchaVerifier = verifier;

      const result = await signInWithPhoneNumber(auth, phone, verifier);
      setConfirmation(result);
      setCountdown(90);
      return true;

    } catch (e: any) {
      console.error("sendOTP error:", e);
      setError(e.message ?? "Failed to send OTP");

      // Clean up on error
      try {
        window.recaptchaVerifier?.clear();
        window.recaptchaVerifier = undefined;
      } catch {}
      try { container.remove(); } catch {}

      return false;

    } finally {
      setSending(false);
    }
  }

  async function verifyOTP(otp: string): Promise<string | null> {
    if (!confirmation) return null;
    setError("");
    setVerifying(true);
    try {
      const result  = await confirmation.confirm(otp);
      const idToken = await result.user.getIdToken();
      return idToken;
    } catch (e: any) {
      setError("Invalid code. Please try again.");
      return null;
    } finally {
      setVerifying(false);
    }
  }

  return {
    sendOTP, verifyOTP,
    sending, verifying,
    error, setError,
    otpSent: !!confirmation,
    countdown,
    canResend: countdown === 0 && !!confirmation,
  };
}