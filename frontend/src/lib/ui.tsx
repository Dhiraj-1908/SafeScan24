"use client";
import React from "react";

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  children, loading, variant = "primary", size = "md", className = "", disabled, ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:   "bg-red-500 hover:bg-red-600 active:bg-red-700 text-white focus:ring-red-400",
    secondary: "bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 focus:ring-gray-300",
    danger:    "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 focus:ring-red-300",
    ghost:     "bg-transparent hover:bg-gray-100 text-gray-600 focus:ring-gray-300",
  };
  const sizes = {
    sm: "text-sm px-3 py-1.5 gap-1.5",
    md: "text-sm px-4 py-2.5 gap-2",
    lg: "text-base px-6 py-3 gap-2",
  };
  return (
    <button {...props} disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
      )}
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?:  string;
}

export function Input({ label, error, hint, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input {...props}
        className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400
          focus:outline-none focus:ring-2 transition
          ${error ? "border-red-400 focus:ring-red-300" : "border-gray-200 focus:ring-red-300 focus:border-red-400"}
          ${className}`}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

// ─── OTPInput ─────────────────────────────────────────────────────────────────

interface OTPInputProps {
  value:    string;
  onChange: (val: string) => void;
  length?:  number;
  error?:   string;
}

export function OTPInput({ value, onChange, length = 6, error }: OTPInputProps) {
  const refs   = Array.from({ length }, () => React.useRef<HTMLInputElement>(null));
  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  function handleChange(i: number, char: string) {
    const d    = char.replace(/\D/g, "").slice(-1);
    const next = digits.map((v, idx) => (idx === i ? d : v)).join("");
    onChange(next);
    if (d && i < length - 1) refs[i + 1].current?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs[i - 1].current?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(text);
    refs[Math.min(text.length, length - 1)].current?.focus();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 justify-center">
        {Array.from({ length }, (_, i) => (
          <input key={i} ref={refs[i]}
            type="text" inputMode="numeric" maxLength={1}
            value={digits[i] || ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`w-11 h-14 rounded-xl border-2 text-center text-xl font-bold text-gray-900
              focus:outline-none focus:ring-2 transition caret-transparent
              ${error ? "border-red-400 focus:ring-red-300" : "border-gray-200 focus:ring-red-400 focus:border-red-400"}`}
          />
        ))}
      </div>
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${className}`}>
      {children}
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function Shell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12 ${className}`}>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = { sm: "text-xl", md: "text-2xl", lg: "text-3xl" }[size];
  return (
    <div className={`font-black tracking-tight ${s} flex items-center gap-1`}>
      <span className="text-red-500">Safe</span>
      <span className="text-gray-900">Scan</span>
      <span className="text-red-500 text-xs align-super">●</span>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  );
}

// ─── Alert ────────────────────────────────────────────────────────────────────

export function Alert({ children, variant = "error" }: {
  children: React.ReactNode;
  variant?: "error" | "success" | "info";
}) {
  const v = {
    error:   "bg-red-50 border-red-200 text-red-700",
    success: "bg-green-50 border-green-200 text-green-700",
    info:    "bg-blue-50 border-blue-200 text-blue-700",
  }[variant];
  return <div className={`rounded-xl border px-4 py-3 text-sm ${v}`}>{children}</div>;
}