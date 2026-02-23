"use client";
import React from "react";
import { useRouter } from "next/navigation";
import {
  getDashboard, updateUserName, DashboardData,
  sendContactOTP, verifyContactOTP, deleteContact, updateContact,
  logout, EmergencyContact,
} from "@/lib/api";
import { Logo, Button, Input, OTPInput, Alert, Card, Spinner } from "@/lib/ui";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData]       = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError]     = React.useState("");

  // Name editing
  const [editingName, setEditingName]   = React.useState(false);
  const [nameVal, setNameVal]           = React.useState("");
  const [nameSaving, setNameSaving]     = React.useState(false);

  // Add contact flow per QR slug
  const [addingFor, setAddingFor]       = React.useState<string | null>(null);
  const [contactName, setContactName]   = React.useState("");
  const [contactRel, setContactRel]     = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [contactOtp, setContactOtp]     = React.useState("");
  const [otpSent, setOtpSent]           = React.useState(false);
  const [countdown, setCountdown]       = React.useState(0);
  const [addLoading, setAddLoading]     = React.useState(false);
  const [addError, setAddError]         = React.useState("");

  // Edit contact
  const [editingContact, setEditingContact] = React.useState<EmergencyContact | null>(null);
  const [editName, setEditName]             = React.useState("");
  const [editRel, setEditRel]               = React.useState("");
  const [editSaving, setEditSaving]         = React.useState(false);

  React.useEffect(() => {
    getDashboard()
      .then((d) => { setData(d); setNameVal(d.user.name); })
      .catch(() => { router.push("/login"); })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function saveName() {
    if (!nameVal.trim() || !data) return;
    setNameSaving(true);
    try {
      await updateUserName(nameVal.trim());
      setData({ ...data, user: { ...data.user, name: nameVal.trim() } });
      setEditingName(false);
    } catch { /* ignore */ }
    finally { setNameSaving(false); }
  }

  function startAdd(slug: string , slugId: string) {
    setAddingFor(slugId);
    //setAddingFor(slug);
    setContactName(""); setContactRel("");
    setContactPhone(""); setContactOtp("");
    setOtpSent(false); setAddError("");
  }

  async function handleSendContactOTP() {
    if (!addingFor) return;
    setAddError("");
    setAddLoading(true);
    try {
      await sendContactOTP(addingFor, contactPhone, contactName, contactRel);
      setOtpSent(true);
      setCountdown(90);
    } catch (e: any) {
      setAddError(e.message ?? "Failed to send OTP");
    } finally { setAddLoading(false); }
  }

  async function handleVerifyContactOTP() {
    if (!addingFor || !data) return;
    setAddError("");
    setAddLoading(true);
    try {
      const contact = await verifyContactOTP(
        addingFor, contactPhone, contactName, contactRel, contactOtp
      );
      const updated = data.qr_codes.map((qr) =>
  qr.slugId === addingFor  // ← match by slugId
    ? { ...qr, contacts: [...qr.contacts, contact] }
    : qr
);
      setData({ ...data, qr_codes: updated });
      setAddingFor(null);
    } catch (e: any) {
      setAddError(e.message ?? "Invalid code");
    } finally { setAddLoading(false); }
  }

  async function handleDeleteContact(slug: string, contactId: string) {
    if (!data) return;
    if (!confirm("Remove this emergency contact?")) return;
    try {
      await deleteContact(contactId);
      const updated = data.qr_codes.map((qr) =>
        qr.slug === slug
          ? { ...qr, contacts: qr.contacts.filter((c) => c.id !== contactId) }
          : qr
      );
      setData({ ...data, qr_codes: updated });
    } catch { /* ignore */ }
  }

  async function handleSaveEdit() {
    if (!editingContact || !data) return;
    setEditSaving(true);
    try {
      await updateContact(editingContact.id, { name: editName, relationship: editRel });
      const updated = data.qr_codes.map((qr) => ({
        ...qr,
        contacts: qr.contacts.map((c) =>
          c.id === editingContact.id ? { ...c, name: editName, relationship: editRel } : c
        ),
      }));
      setData({ ...data, qr_codes: updated });
      setEditingContact(null);
    } catch { /* ignore */ }
    finally { setEditSaving(false); }
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner className="w-8 h-8 text-red-500" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Logo size="md" />
        <Button variant="ghost" size="sm" onClick={handleLogout}>Log out</Button>
      </nav>

      <main className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">

        {/* Profile card */}
        <Card>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3">Your Profile</p>
          {editingName ? (
            <div className="flex gap-2">
              <Input
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                className="flex-1"
              />
              <Button size="sm" onClick={saveName} loading={nameSaving}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>✕</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900 text-lg">{data.user.name}</p>
                <p className="text-sm text-gray-400">{data.user.phone}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setEditingName(true)}>Edit</Button>
            </div>
          )}
        </Card>

        {/* QR codes */}
        {data.qr_codes.map((qr) => (
          <Card key={qr.slug}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">QR Code</p>
                <p className="font-mono font-bold text-gray-900">#{qr.slug}</p>
              </div>
              
              <a href={`${window.location.origin}/q/${qr.slug}`} target="_blank" rel="noreferrer">
  <Button size="sm" variant="secondary">Test scan</Button>
</a>
            </div>

            {/* Contacts list */}
            <div className="flex flex-col gap-2 mb-4">
              {qr.contacts.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-3">
                  No emergency contacts yet. Add one below.
                </p>
              )}

              {qr.contacts.map((c) => (
                <div key={c.id}>
                  {editingContact?.id === c.id ? (
                    <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
                      <Input
                        placeholder="Name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <Input
                        placeholder="Relationship"
                        value={editRel}
                        onChange={(e) => setEditRel(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit} loading={editSaving} className="flex-1">Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingContact(null)}>✕</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.relationship}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost"
                          onClick={() => { setEditingContact(c); setEditName(c.name); setEditRel(c.relationship); }}>
                          ✏️
                        </Button>
                        <Button size="sm" variant="danger"
                          onClick={() => handleDeleteContact(qr.slug, c.id)}>
                          🗑️
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add contact */}
            {addingFor === qr.slugId ? (
              <div className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-sm font-semibold text-gray-700">Add Emergency Contact</p>
                <p className="text-xs text-gray-400">
                  An OTP will be sent to <strong>their</strong> phone. Ask them to share the code with you.
                </p>

                {!otpSent ? (
                  <>
                    <Input placeholder="Contact's name" value={contactName}
                      onChange={(e) => setContactName(e.target.value)} />
                    <Input placeholder="Relationship (e.g. Mom, Friend)"
                      value={contactRel} onChange={(e) => setContactRel(e.target.value)} />
                    <Input placeholder="+91 their phone number" type="tel"
                      value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                    {addError && <Alert>{addError}</Alert>}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSendContactOTP}
                        loading={addLoading} className="flex-1">
                        Send OTP to contact
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAddingFor(null)}>✕</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-center text-gray-500">
                      Ask <strong>{contactName}</strong> for the code they just received
                    </p>
                    <OTPInput value={contactOtp} onChange={setContactOtp} />
                    {addError && <Alert>{addError}</Alert>}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleVerifyContactOTP}
                        loading={addLoading} className="flex-1">
                        Verify & Add
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAddingFor(null)}>✕</Button>
                    </div>
                    <div className="text-center text-xs text-gray-400">
                      {countdown > 0
                        ? `Resend in ${countdown}s`
                        : <button onClick={() => { setContactOtp(""); handleSendContactOTP(); }}
                            className="text-red-500 hover:underline">Resend OTP</button>
                      }
                    </div>
                  </>
                )}
              </div>
            ) : (
              qr.contacts.length < 5 && (
                <Button variant="secondary" size="sm" className="w-full"
                  onClick={() => startAdd(qr.slug, qr.slugId)}>
                  + Add emergency contact
                </Button>
              )
            )}
          </Card>
        ))}

        {error && <Alert>{error}</Alert>}
      </main>
    </div>
  );
}