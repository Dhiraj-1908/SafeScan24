"use client";
import React from "react";
import { useParams } from "next/navigation";
import { scanQR, QRScanResult, EmergencyContact } from "@/lib/api";
import { Logo, Button, Spinner, Alert, Card, Shell, Input } from "@/lib/ui";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type CallState = "idle" | "prompting" | "calling" | "called" | "error";

export default function EmergencyPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData]       = React.useState<QRScanResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError]     = React.useState("");

  const [activeContact, setActiveContact] = React.useState<EmergencyContact | null>(null);
  const [callState, setCallState]         = React.useState<CallState>("idle");
  const [callError, setCallError]         = React.useState("");
  const [scannerPhone, setScannerPhone]   = React.useState("");
  const [calling, setCalling]             = React.useState(false);

  React.useEffect(() => {
    scanQR(slug)
      .then(setData)
      .catch(() => setError("Could not load emergency contacts."))
      .finally(() => setLoading(false));
  }, [slug]);

  function promptCall(contact: EmergencyContact) {
    setActiveContact(contact);
    setCallState("prompting");
    setCallError("");
    setScannerPhone("");
  }

  async function confirmCall() {
    if (!activeContact || !scannerPhone.trim()) return;
    setCalling(true);
    setCallError("");
    try {
      const res = await fetch(`${BASE}/api/call/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId:    activeContact.id,
          scannerPhone: scannerPhone.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to initiate call");
      }
      setCallState("called");
    } catch (e: any) {
      setCallError(e.message ?? "Something went wrong");
      setCallState("error");
    } finally {
      setCalling(false);
    }
  }

  function resetCall() {
    setActiveContact(null);
    setCallState("idle");
    setCallError("");
    setScannerPhone("");
  }

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Spinner className="w-8 h-8 text-red-500" />
          <p className="text-sm">Loading emergency contacts...</p>
        </div>
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell>
        <div className="mb-8 text-center"><Logo size="lg" /></div>
        <Card className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-600 text-sm">{error || "Something went wrong."}</p>
        </Card>
      </Shell>
    );
  }

  const contacts = data.contacts ?? [];

  return (
    <Shell className="justify-start pt-8">
      <div className="mb-6 text-center">
        <Logo size="md" />
        <div className="mt-3 inline-flex items-center gap-1.5 bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          Emergency
        </div>
      </div>

      {/* Owner info */}
      <Card className="mb-4">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3 font-semibold">Owner</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900 text-lg">{data.ownerName ?? "Unknown"}</p>
            <p className="text-sm text-gray-500">Owner of this SafeScan</p>
          </div>
          {data.ownerPhone && (
            <a href={`tel:${data.ownerPhone}`}>
              <Button size="sm" variant="secondary">📞 Call</Button>
            </a>
          )}
        </div>
      </Card>

      {/* Phone prompt modal */}
      {callState === "prompting" && activeContact && (
        <Card className="mb-4 border-2 border-red-100">
          <p className="text-sm font-semibold text-gray-800 mb-1">
            Call {activeContact.name}
          </p>
          <p className="text-xs text-gray-400 mb-3">
            Enter your phone number. You'll receive a call first, then be connected to {activeContact.name}. Neither of you will see the other's number.
          </p>
          <Input
            placeholder="+91 your phone number"
            type="tel"
            value={scannerPhone}
            onChange={(e) => setScannerPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmCall()}
          />
          {callError && <Alert>{callError}</Alert>}
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={confirmCall}
              loading={calling}
              className="flex-1"
            >
              📞 Call now
            </Button>
            <Button size="sm" variant="ghost" onClick={resetCall}>✕</Button>
          </div>
        </Card>
      )}

      {/* Call success */}
      {callState === "called" && activeContact && (
        <Card className="mb-4 text-center border-2 border-green-100">
          <div className="text-3xl mb-2">📞</div>
          <p className="font-semibold text-gray-800">Calling you now...</p>
          <p className="text-xs text-gray-400 mt-1">
            Pick up the call on <strong>{scannerPhone}</strong> to be connected to {activeContact.name}.
          </p>
          <Button size="sm" variant="ghost" className="mt-3" onClick={resetCall}>
            Done
          </Button>
        </Card>
      )}

      {/* Contacts */}
      {contacts.length === 0 ? (
        <Card className="text-center">
          <p className="text-gray-600 text-sm mb-2">
            <strong>{data.ownerName}</strong> hasn't set up emergency contacts yet.
          </p>
          <p className="text-gray-500 text-sm">
            If this is an emergency, please call <strong>112</strong>.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold px-1">
            Emergency Contacts
          </p>
          {contacts.map((contact) => (
            <Card key={contact.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{contact.name}</p>
                  <p className="text-xs text-gray-400">{contact.relationship}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => promptCall(contact)}
                  disabled={callState === "prompting" || callState === "calling"}
                >
                  📞 Call
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-gray-400 mt-8">
        Powered by SafeScan • In an emergency always call 112
      </p>
    </Shell>
  );
}