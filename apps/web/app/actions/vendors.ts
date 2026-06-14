"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type VendorFormState = {
  error?: string;
  success?: string;
};

function normalizePhone(value: string) {
  const trimmed = value.trim().replaceAll(" ", "").replaceAll("-", "");

  if (trimmed.startsWith("+")) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  return trimmed;
}

export async function createVendor(_state: VendorFormState, formData: FormData): Promise<VendorFormState> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const primaryPhone = normalizePhone(String(formData.get("primaryPhone") ?? ""));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const baseCity = String(formData.get("baseCity") ?? "").trim() || "Jodhpur";
  const baseState = String(formData.get("baseState") ?? "").trim() || "Rajasthan";
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name || !primaryPhone) {
    return { error: "Vendor name and WhatsApp number are required." };
  }

  if (!/^\+[1-9]\d{7,14}$/.test(primaryPhone)) {
    return { error: "Enter WhatsApp number with country code, for example +919876543210." };
  }

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

      await tx.companyTransporter.create({
        data: {
          companyId: admin.companyId,
          transporterId: transporter.id,
          displayName: name,
          trustRating: 3,
          notes: notes || null
        }
      });

      await tx.auditEvent.create({
        data: {
          companyId: admin.companyId,
          actorType: "company_user",
          actorName: admin.name,
          action: "vendor.created",
          details: {
            transporter: name,
            primaryPhone,
            baseCity
          }
        }
      });
    });
  } catch {
    return { error: "This WhatsApp number is already added for this company." };
  }

  revalidatePath("/");
  revalidatePath("/admin/vendors");
  revalidatePath("/requests/new");
  return { success: "Vendor added." };
}
