import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const sessionCookieName = "tms_session";
const vendorSessionCookieName = "tms_vendor_session";
const defaultSessionAgeSeconds = 60 * 60 * 12;
const rememberedSessionAgeSeconds = 60 * 60 * 24 * 30;

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required");
  }

  return secret;
}

function sign(value: string) {
  return createHmac("sha256", authSecret()).update(value).digest("hex");
}

function encodeSession(userId: string, maxAgeSeconds: number) {
  const payload = JSON.stringify({
    userId,
    issuedAt: Date.now(),
    expiresAt: Date.now() + maxAgeSeconds * 1000
  });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function decodeSession(value?: string) {
  if (!value) {
    return null;
  }

  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expected = sign(encoded);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length || !timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      userId?: string;
      issuedAt?: number;
      expiresAt?: number;
    };

    if (!payload.userId || !payload.issuedAt) {
      return null;
    }

    const legacyMaxAgeMs = defaultSessionAgeSeconds * 1000;
    const expiresAt = payload.expiresAt ?? payload.issuedAt + legacyMaxAgeMs;
    if (Date.now() > expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

async function setSignedSession(cookieName: string, userId: string, remember = false) {
  const maxAge = remember ? rememberedSessionAgeSeconds : defaultSessionAgeSeconds;
  const cookieStore = await cookies();
  cookieStore.set(cookieName, encodeSession(userId, maxAge), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge
  });
}

async function clearSignedSession(cookieName: string) {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export async function setSession(userId: string, remember = false) {
  await setSignedSession(sessionCookieName, userId, remember);
}

export async function clearSession() {
  await clearSignedSession(sessionCookieName);
}

export async function setVendorSession(vendorUserId: string, remember = false) {
  await setSignedSession(vendorSessionCookieName, vendorUserId, remember);
}

export async function clearVendorSession() {
  await clearSignedSession(vendorSessionCookieName);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(sessionCookieName)?.value);
  if (!session) {
    return null;
  }

  return prisma.companyUser.findFirst({
    where: {
      id: session.userId,
      isActive: true
    },
    include: {
      company: true
    }
  });
}

export async function getCurrentVendorUser() {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(vendorSessionCookieName)?.value);
  if (!session) {
    return null;
  }

  return prisma.vendorUser.findFirst({
    where: {
      id: session.userId,
      isActive: true
    },
    include: {
      transporter: true
    }
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    redirect("/");
  }

  return user;
}

export async function requireVendorUser(nextPath?: string) {
  const user = await getCurrentVendorUser();
  if (!user) {
    const suffix = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/vendor/login${suffix}`);
  }

  return user;
}
