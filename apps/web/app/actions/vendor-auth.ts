"use server";

import { redirect } from "next/navigation";
import { clearVendorSession, setVendorSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isTenDigitIndianMobileInput, normalizeIndianMobile } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export type VendorLoginState = {
  error?: string;
};

export type VendorSignupState = {
  error?: string;
};

function normalizeLoginId(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().toLowerCase();
  return raw.includes("@") ? raw : normalizeIndianMobile(raw);
}

export async function vendorLogin(_state: VendorLoginState, formData: FormData): Promise<VendorLoginState> {
  const loginId = normalizeLoginId(formData.get("loginId"));
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "/vendor");
  const remember = formData.get("remember") === "on";

  if (!loginId || !password) {
    return { error: "WhatsApp/email and password are required." };
  }

  const vendorUser = await prisma.vendorUser.findFirst({
    where: {
      isActive: true,
      OR: [
        { email: loginId },
        { phone: loginId },
        { phone: loginId.replace(/\s+/g, "") }
      ]
    }
  });

  if (!vendorUser || !verifyPassword(password, vendorUser.passwordHash)) {
    return { error: "Invalid vendor login." };
  }

  await prisma.vendorUser.update({
    where: { id: vendorUser.id },
    data: { lastLoginAt: new Date() }
  });
  await setVendorSession(vendorUser.id, remember);

  redirect(nextPath.startsWith("/vendor") ? nextPath : "/vendor");
}

export async function vendorSignup(_state: VendorSignupState, formData: FormData): Promise<VendorSignupState> {
  const name = String(formData.get("name") ?? "").trim();
  const rawPrimaryPhone = String(formData.get("primaryPhone") ?? "");
  const primaryPhone = normalizeIndianMobile(rawPrimaryPhone);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const baseCity = String(formData.get("baseCity") ?? "").trim() || "Jodhpur";
  const baseState = String(formData.get("baseState") ?? "").trim() || "Rajasthan";
  const password = String(formData.get("password") ?? "");

  if (!name || !primaryPhone) {
    return { error: "Vendor name and WhatsApp number are required." };
  }

  if (!isTenDigitIndianMobileInput(rawPrimaryPhone)) {
    return { error: "Enter only the 10 digit mobile number. The system will add +91 automatically." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const company = await prisma.company.findFirst({ orderBy: { createdAt: "asc" } });
  if (!company) {
    return { error: "Company setup is missing. Please contact the operations team." };
  }

  const existingVendorUser = await prisma.vendorUser.findFirst({
    where: {
      OR: [{ phone: primaryPhone }, ...(email ? [{ email }] : [])]
    }
  });

  if (existingVendorUser) {
    return { error: "This vendor login already exists. Please sign in or ask admin to reset the password." };
  }

  let vendorUserId = "";
  try {
    await prisma.$transaction(async (tx) => {
      const transporter = await tx.transporter.upsert({
        where: { primaryPhone },
        update: {
          name,
          email: email || null,
          baseCity,
          baseState
        },
        create: {
          name,
          primaryPhone,
          email: email || null,
          baseCity,
          baseState
        }
      });

      const vendorUser = await tx.vendorUser.create({
        data: {
          transporterId: transporter.id,
          name,
          email: email || null,
          phone: primaryPhone,
          passwordHash: hashPassword(password)
        }
      });

      vendorUserId = vendorUser.id;

      await tx.companyTransporter.upsert({
        where: {
          companyId_transporterId: {
            companyId: company.id,
            transporterId: transporter.id
          }
        },
        update: {
          displayName: name
        },
        create: {
          companyId: company.id,
          transporterId: transporter.id,
          displayName: name,
          trustRating: 3
        }
      });

      await tx.auditEvent.create({
        data: {
          companyId: company.id,
          actorType: "vendor_user",
          actorName: name,
          action: "vendor.self_registered",
          details: {
            transporter: name,
            primaryPhone,
            baseCity
          }
        }
      });
    });
  } catch {
    return { error: "Could not create vendor account. Please check the details and try again." };
  }

  await setVendorSession(vendorUserId, true);
  redirect("/vendor");
}

export async function vendorLogout() {
  await clearVendorSession();
  redirect("/vendor/login");
}
