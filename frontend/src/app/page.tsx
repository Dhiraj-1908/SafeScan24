"use client";
import Link from "next/link";
import { Logo, Button } from "@/lib/ui";

const STEPS = [
  {
    n: "1",
    color: "#FF3B30",
    title: "Stick the QR",
    body: "Peel and stick a SafeScan sticker on your bag, bike, helmet, or pet tag.",
  },
  {
    n: "2",
    color: "#FF9500",
    title: "Register in 30 seconds",
    body: "Scan your sticker, enter your name and phone number. Done — QR is yours.",
  },
  {
    n: "3",
    color: "#34C759",
    title: "Add emergency contacts",
    body: "Add family or friends. If someone scans your QR, they can call your contacts instantly — without ever seeing your number or theirs.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen min-h-dvh bg-white flex flex-col">

      <nav className="flex items-center justify-between px-6 py-4 pt-[max(16px,calc(env(safe-area-inset-top)+12px))]">
        <Logo size="md" />
        <Link href="/login">
          <Button variant="ghost" size="sm" className="text-[#636366] font-medium">
            Log in
          </Button>
        </Link>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#FF3B30] mb-8 animate-fade-up">
          Emergency QR · India
        </p>

        <h1
          className="text-[46px] sm:text-[58px] font-bold leading-[1.05] tracking-[-0.03em] text-[#1C1C1E] mb-6 animate-fade-up"
          style={{ animationDelay: "60ms" }}
        >
          One scan.<br />
          <span className="text-[#FF3B30]">Instant&nbsp;help.</span>
        </h1>

        <p
          className="text-[17px] text-[#8E8E93] leading-relaxed max-w-[280px] mb-12 animate-fade-up"
          style={{ animationDelay: "120ms" }}
        >
          Stick a QR on your bag, bike, or pet. Anyone who finds you in an emergency reaches your contacts immediately.
        </p>

        <div
          className="flex flex-col gap-3 w-full max-w-[260px] animate-fade-up"
          style={{ animationDelay: "180ms" }}
        >
          <Link href="/login">
            <Button size="lg" fullWidth>Get started</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="secondary" fullWidth>Log in</Button>
          </Link>
        </div>

        <p
          className="text-[12px] text-[#C7C7CC] mt-7 animate-fade-up"
          style={{ animationDelay: "240ms" }}
        >
          Free · No app required · Works on any phone
        </p>
      </main>

      <section className="border-t border-[#F2F2F7] px-6 py-14">
        <div className="max-w-sm mx-auto flex flex-col gap-10">
          <Pillar label="Privacy" headline="Numbers stay hidden" body="Your contacts' phone numbers are never revealed to the person scanning." accent="#007AFF" />
          <Pillar label="Speed" headline="Connected in seconds" body="No app to download. No account to create. Scan, enter a number, get connected." accent="#FF9500" />
          <Pillar label="Safety" headline="Always on, always ready" body="Your QR works 24/7. If your bag gets lost or you're in an accident, help is one scan away." accent="#34C759" />
        </div>
      </section>

      <section className="border-t border-[#F2F2F7] px-6 py-14">
        <div className="max-w-sm mx-auto">

          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#AEAEB2] mb-10 text-center">
            How it works
          </p>

          <div className="flex flex-col">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex gap-5">

                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0 z-10"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.n}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-px flex-1 my-1 bg-[#E5E5EA]" />
                  )}
                </div>

                <div className={i < STEPS.length - 1 ? "pb-8 pt-0.5 flex-1" : "pt-0.5 flex-1"}>
                  <p className="font-semibold text-[17px] text-[#1C1C1E] tracking-tight leading-snug">
                    {s.title}
                  </p>
                  <p className="text-[14px] text-[#8E8E93] mt-1.5 leading-relaxed">
                    {s.body}
                  </p>
                </div>

              </div>
            ))}
          </div>

          <div className="mt-8 bg-[#EDFAF1] border border-[#A8E6BC] rounded-2xl px-5 py-5 text-center">
            <p className="text-[17px] font-bold text-[#1A7A3C] leading-snug">
              That's it. You're protected. ✅
            </p>
            <p className="text-[13px] text-[#2D8A4E] mt-2 leading-relaxed">
              Anyone who scans your sticker can reach you or your contacts (in case of emergency) instantly — no app, no delay, no panic.
            </p>
          </div>

        </div>
      </section>

      <footer className="border-t border-[#F2F2F7] px-6 py-6 pb-[max(24px,env(safe-area-inset-bottom))] text-center">
        <p className="text-[12px] text-[#C7C7CC]">
          {`© ${new Date().getFullYear()} SafeScan24 · Made in India`}
        </p>
      </footer>

    </div>
  );
}

function Pillar({ label, headline, body, accent }: { label: string; headline: string; body: string; accent: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-2" style={{ color: accent }}>
        {label}
      </p>
      <p className="text-[20px] font-semibold tracking-tight text-[#1C1C1E] leading-snug mb-2">
        {headline}
      </p>
      <p className="text-[14px] text-[#8E8E93] leading-relaxed">{body}</p>
    </div>
  );
}