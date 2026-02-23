// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id:    string;
  name:  string;
  phone: string;
}

export interface EmergencyContact {
  id:           string;
  name:         string;
  relationship: string;
  phone?:       string;
  verified?:    boolean;
  displayOrder?: number;
}

export interface QRScanResult {
  status:       "unclaimed" | "claimed" | "invalid";
  ownerName?:   string;
  ownerId?:     string;
  ownerPhone?:  string;
  ownerOnline?: boolean;
  contacts?:    EmergencyContact[];
  slugId?:      string;
}

export interface DashboardData {
  user:     User;
  qr_codes: Array<{
    slug:     string;
    slugId:   string;
    contacts: EmergencyContact[];
  }>;
}

// ─── Core ─────────────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function saveToken(token: string) {
  localStorage.setItem("token", token);
}

export function logout() {
  localStorage.removeItem("token");
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? err.message ?? "Request failed");
  }
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function firebaseVerify(
  firebaseToken: string,
  payload: { name?: string; slug?: string }
): Promise<{ token: string; user: User }> {
  const data = await request<{ token: string; user: User }>(
    "/api/auth/firebase-verify",
    {
      method: "POST",
      body: JSON.stringify({ firebase_token: firebaseToken, ...payload }),
    }
  );
  saveToken(data.token);
  return data;
}

// Keep this as alias so existing page code still works
export const exchangeToken = firebaseVerify;

// ─── QR ───────────────────────────────────────────────────────────────────────

export async function scanQR(slug: string): Promise<QRScanResult> {
  return request<QRScanResult>(`/api/qr/${slug}`);
}

// ─── Dashboard (assembled from real endpoints) ────────────────────────────────

export async function getDashboard(): Promise<DashboardData> {
  // 1. Get user
  const user = await request<User>("/api/user/me");

  // 2. Read slugs from localStorage (saved after claiming)
  const rawSlugs = localStorage.getItem("my_slugs");
  const slugList: string[] = rawSlugs ? JSON.parse(rawSlugs) : [];

  // 3. For each slug fetch QR info + contacts
  const qr_codes = await Promise.all(
    slugList.map(async (slug) => {
      try {
        const res = await scanQR(slug);
        return {
          slug,
          slugId: res.slugId ?? "",
          contacts: res.contacts ?? [],
        };
      } catch {
        return { slug, slugId: "", contacts: [] };
      }
    })
  );

  return { user, qr_codes };  // ← this was missing
}

export function saveSlug(slug: string) {
  const raw   = localStorage.getItem("my_slugs");
  const slugs = raw ? JSON.parse(raw) : [];
  if (!slugs.includes(slug)) {
    slugs.push(slug);
    localStorage.setItem("my_slugs", JSON.stringify(slugs));
  }
}

export async function updateUserName(name: string): Promise<void> {
  await request("/api/user/me", {
    method: "PUT",
    body:   JSON.stringify({ name }),
  });
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function sendContactOTP(
  slugId:       string,
  phone:        string,
  name:         string,
  relationship: string
): Promise<{ sent: boolean }> {
  return request(`/api/contacts/${slugId}/otp/send`, {
    method: "POST",
    body:   JSON.stringify({ phone, name, relationship }),
  });
}

export async function verifyContactOTP(
  slugId:       string,
  phone:        string,
  name:         string,
  relationship: string,
  otp:          string
): Promise<EmergencyContact> {
  return request<EmergencyContact>(`/api/contacts/${slugId}`, {
    method: "POST",
    body:   JSON.stringify({ phone, name, relationship, otp }),
  });
}

export async function updateContact(
  id:   string,
  data: { name?: string; relationship?: string }
): Promise<void> {
  await request(`/api/contacts/entry/${id}`, {
    method: "PUT",
    body:   JSON.stringify(data),
  });
}

export async function deleteContact(id: string): Promise<void> {
  await request(`/api/contacts/entry/${id}`, { method: "DELETE" });
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function bulkGenerateQR(
  count: number
): Promise<{ slugs: string[] }> {
  return request<{ slugs: string[] }>("/api/admin/generate", {
    method: "POST",
    body:   JSON.stringify({ count }),
  });
}