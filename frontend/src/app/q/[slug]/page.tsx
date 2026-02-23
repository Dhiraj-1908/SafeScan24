import { redirect } from "next/navigation";
import { cookies } from "next/headers";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function QRRouter({ params }: Props) {
  const { slug } = await params;
  const apiUrl   = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

  const cookieStore = await cookies();
  const token       = cookieStore.get("token")?.value ?? null;

  let data: any = null;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${apiUrl}/api/qr/${slug}`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) redirect("/invalid");
    data = await res.json();
  } catch {
    redirect("/invalid");
  }

  if (!data || data.status === "invalid") {
    redirect("/invalid");
  }

  if (data.status === "unclaimed") {
    redirect(`/claim/${slug}`);
  }

  if (data.status === "claimed") {
    // Check if the JWT in cookie belongs to the owner
    if (token && data.ownerId) {
      try {
        const meRes = await fetch(`${apiUrl}/api/user/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (meRes.ok) {
          const me = await meRes.json();
          if (me.id === data.ownerId) {
            redirect("/dashboard");
          }
        }
      } catch { /* not owner */ }
    }
    redirect(`/emergency/${slug}`);
  }

  redirect("/invalid");
}