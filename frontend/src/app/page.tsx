"use client";
import Link from "next/link";
import { Logo, Button, Shell } from "@/lib/ui";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <Logo size="md" />
        <Link href="/login">
          <Button variant="secondary" size="sm">Log in</Button>
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          Emergency-ready in minutes
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-4 max-w-md">
          One scan.<br />
          <span className="text-red-500">Instant help.</span>
        </h1>

        <p className="text-gray-500 text-lg max-w-sm mb-10">
          Stick a SafeScan QR on your belongings. Anyone who finds you in an emergency can reach your contacts instantly — no app needed.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <Link href="/login" className="flex-1">
            <Button size="lg" className="w-full">Get started</Button>
          </Link>
          <Link href="/login" className="flex-1">
            <Button size="lg" variant="secondary" className="w-full">Log in</Button>
          </Link>
        </div>
      </main>

      {/* Feature strip */}
      <section className="border-t border-gray-100 bg-gray-50 px-6 py-10">
        <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: "🔒", title: "No app needed", desc: "Works from any phone camera, no install required." },
            { icon: "⚡", title: "Instant contact", desc: "WebRTC call connects scanner to your contact in seconds." },
            { icon: "🛡️", title: "Phone numbers hidden", desc: "Contacts' numbers are encrypted and never shown to scanners." },
          ].map((f) => (
            <div key={f.title} className="flex flex-col items-center gap-2">
              <span className="text-3xl">{f.icon}</span>
              <h3 className="font-bold text-gray-900">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-100">
        © {new Date().getFullYear()} SafeScan. All rights reserved.
      </footer>
    </div>
  );
}