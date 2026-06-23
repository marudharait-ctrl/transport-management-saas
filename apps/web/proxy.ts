import { NextResponse, type NextRequest } from "next/server";

const protectedWeightSlipPrefix = "/uploads/weight-slips/";

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function isValidAdminSession(cookieValue?: string) {
  const secret = process.env.AUTH_SECRET;
  if (!cookieValue || !secret) {
    return false;
  }

  const [encoded, signature] = cookieValue.split(".");
  if (!encoded || !signature) {
    return false;
  }

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded)));
  if (expected !== signature) {
    return false;
  }

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded))) as { expiresAt?: number };
    return !payload.expiresAt || Date.now() <= payload.expiresAt;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith(protectedWeightSlipPrefix)) {
    return NextResponse.next();
  }

  const allowed = await isValidAdminSession(request.cookies.get("tms_session")?.value);
  if (allowed) {
    return NextResponse.next();
  }

  return new NextResponse("Weight slips are admin-only documents.", { status: 403 });
}

export const config = {
  matcher: ["/uploads/weight-slips/:path*"]
};
