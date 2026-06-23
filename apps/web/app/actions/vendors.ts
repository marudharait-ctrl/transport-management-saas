"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { isTenDigitIndianMobileInput, normalizeIndianMobile } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { buildQuoteRequestMessage } from "@/lib/quote-message";
import { formatRouteLabel, formatTransporterRoute, parseRouteStops } from "@/lib/route-stops";
import { vendorQuoteUrl } from "@/lib/vendor-links";

export type VendorFormState = {
  error?: string;
  success?: string;
};

export type VendorImportState = {
  error?: string;
  success?: string;
  details?: string[];
};

function cleanCell(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeHeader(value: unknown) {
  return cleanCell(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const vendorHeaderAliases = {
  name: ["vendorname", "vendor", "transporter", "transportername", "name"],
  gstin: ["gstin", "gst", "gstno", "gstnumber"],
  whatsappNumber: ["whatsappnumber", "whatsapp", "mobileno", "mobile", "phone", "phonenumber", "userid", "user"]
} as const;

function valueFor(row: Record<string, unknown>, aliases: readonly string[]) {
  for (const alias of aliases) {
    const value = row[alias];
    if (value !== undefined && cleanCell(value)) {
      return cleanCell(value);
    }
  }

  return "";
}

function normalizeVendorImportRow(rawRow: Record<string, unknown>) {
  const normalizedRow = Object.fromEntries(
    Object.entries(rawRow).map(([key, value]) => [normalizeHeader(key), value])
  );

  return {
    name: valueFor(normalizedRow, vendorHeaderAliases.name),
    gstin: valueFor(normalizedRow, vendorHeaderAliases.gstin).toUpperCase(),
    whatsappNumber: valueFor(normalizedRow, vendorHeaderAliases.whatsappNumber)
  };
}

async function prepareOpenRequestInvites(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  input: {
    companyId: string;
    transporterId: string;
    createdByName: string;
  }
) {
  const openRequests = await tx.transportRequest.findMany({
    where: {
      companyId: input.companyId,
      status: { in: ["OPEN", "QUOTED"] },
      quoteRequests: {
        none: { transporterId: input.transporterId }
      }
    },
    include: {
      company: true,
      requestedBy: true
    }
  });

  for (const request of openRequests) {
    const accessToken = randomUUID();
    const routeStops = parseRouteStops(request.routeStops, request.pickupCity, request.dropCity);
    const message = buildQuoteRequestMessage({
      companyName: request.company.name,
      requestNumber: request.requestNumber,
      requestDate: request.createdAt,
      requestedByName: request.requestedBy.name,
      title: request.title,
      loadType: request.loadType,
      status: request.status,
      pickupCity: request.pickupCity,
      pickupState: request.pickupState,
      pickupPincode: request.pickupPincode,
      dropCity: request.dropCity,
      dropState: request.dropState,
      dropPincode: request.dropPincode,
      routeLabel: formatRouteLabel(routeStops),
      routeSummary: formatTransporterRoute(routeStops),
      material: request.material,
      quantity: request.quantity,
      truckRequirement: request.truckRequirement,
      pickupDate: request.pickupDate,
      targetDeliveryDate: request.targetDeliveryDate,
      notes: request.notes,
      quoteUrl: vendorQuoteUrl(accessToken)
    });

    await tx.quoteRequest.create({
      data: {
        companyId: input.companyId,
        requestId: request.id,
        transporterId: input.transporterId,
        accessToken,
        channel: "WHATSAPP",
        status: "READY",
        message
      }
    });
  }

  if (openRequests.length > 0) {
    await tx.auditEvent.create({
      data: {
        companyId: input.companyId,
        actorType: "company_user",
        actorName: input.createdByName,
        action: "quote_notification.backfilled_for_vendor",
        details: {
          transporterId: input.transporterId,
          requestCount: openRequests.length
        }
      }
    });
  }
}

export async function createVendor(_state: VendorFormState, formData: FormData): Promise<VendorFormState> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const rawPrimaryPhone = String(formData.get("primaryPhone") ?? "");
  const primaryPhone = normalizeIndianMobile(rawPrimaryPhone);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const baseCity = String(formData.get("baseCity") ?? "").trim() || "Jodhpur";
  const baseState = String(formData.get("baseState") ?? "").trim() || "Rajasthan";
  const password = String(formData.get("password") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name || !primaryPhone) {
    return { error: "Vendor name and WhatsApp number are required." };
  }

  if (!isTenDigitIndianMobileInput(rawPrimaryPhone)) {
    return { error: "Enter only the 10 digit mobile number. The system will add +91 automatically." };
  }

  if (password.length < 6) {
    return { error: "Vendor login password must be at least 6 characters." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const transporter = await tx.transporter.upsert({
        where: { primaryPhone },
        update: {
          name,
          email: email || null,
          gstin: String(formData.get("gstin") ?? "").trim().toUpperCase() || null,
          baseCity,
          baseState
        },
        create: {
          name,
          primaryPhone,
          email: email || null,
          gstin: String(formData.get("gstin") ?? "").trim().toUpperCase() || null,
          baseCity,
          baseState
        }
      });

      const existingVendorUser = await tx.vendorUser.findFirst({
        where: {
          transporterId: transporter.id,
          OR: [{ phone: primaryPhone }, ...(email ? [{ email }] : [])]
        }
      });

      if (existingVendorUser) {
        await tx.vendorUser.update({
          where: { id: existingVendorUser.id },
          data: {
            name,
            email: email || null,
            phone: primaryPhone,
            passwordHash: hashPassword(password),
            isActive: true
          }
        });
      } else {
        await tx.vendorUser.create({
          data: {
            transporterId: transporter.id,
            name,
            email: email || null,
            phone: primaryPhone,
            passwordHash: hashPassword(password)
          }
        });
      }

      await tx.companyTransporter.upsert({
        where: {
          companyId_transporterId: {
            companyId: admin.companyId,
            transporterId: transporter.id
          }
        },
        update: {
          displayName: name,
          notes: notes || null,
          isBlacklisted: false,
          blacklistedAt: null,
          blacklistedByName: null
        },
        create: {
          companyId: admin.companyId,
          transporterId: transporter.id,
          displayName: name,
          trustRating: 3,
          notes: notes || null
        }
      });

      await prepareOpenRequestInvites(tx, {
        companyId: admin.companyId,
        transporterId: transporter.id,
        createdByName: admin.name
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
            baseCity,
            vendorLogin: true
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
  revalidatePath("/vendor");
  return { success: "Vendor added with login access." };
}

export async function importVendors(
  _state: VendorImportState,
  formData: FormData
): Promise<VendorImportState> {
  const admin = await requireAdmin();
  const file = formData.get("file");
  const defaultPassword = String(formData.get("defaultPassword") ?? "");
  const baseCity = String(formData.get("baseCity") ?? "").trim() || "Jodhpur";
  const baseState = String(formData.get("baseState") ?? "").trim() || "Rajasthan";

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Upload an Excel or CSV file." };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: "File is too large. Please upload a file under 5 MB." };
  }

  if (defaultPassword.length < 6) {
    return { error: "Default password must be at least 6 characters." };
  }

  let rows: Record<string, unknown>[];

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return { error: "The file has no sheets." };
    }

    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName], {
      defval: "",
      raw: false
    });
  } catch {
    return { error: "Could not read the file. Please upload .xlsx, .xls, or .csv." };
  }

  if (rows.length === 0) {
    return { error: "No vendor rows found in the file." };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const details: string[] = [];
  const passwordHash = hashPassword(defaultPassword);

  for (const [index, rawRow] of rows.entries()) {
    const rowNumber = index + 2;
    const row = normalizeVendorImportRow(rawRow);

    if (!row.name && !row.gstin && !row.whatsappNumber) {
      skipped += 1;
      continue;
    }

    if (!row.name || !row.gstin || !row.whatsappNumber) {
      skipped += 1;
      details.push(`Row ${rowNumber}: vendor name, GSTIN, and WhatsApp number are required.`);
      continue;
    }

    if (!isTenDigitIndianMobileInput(row.whatsappNumber)) {
      skipped += 1;
      details.push(`Row ${rowNumber}: WhatsApp number must be 10 digits. +91 is added automatically.`);
      continue;
    }

    const primaryPhone = normalizeIndianMobile(row.whatsappNumber);
    const existing = await prisma.companyTransporter.findFirst({
      where: {
        companyId: admin.companyId,
        transporter: { primaryPhone }
      },
      select: { id: true }
    });

    await prisma.$transaction(async (tx) => {
      const transporter = await tx.transporter.upsert({
        where: { primaryPhone },
        update: {
          name: row.name,
          gstin: row.gstin,
          baseCity,
          baseState
        },
        create: {
          name: row.name,
          primaryPhone,
          gstin: row.gstin,
          baseCity,
          baseState
        }
      });

      const vendorUser = await tx.vendorUser.findFirst({
        where: {
          transporterId: transporter.id,
          phone: primaryPhone
        },
        select: { id: true }
      });

      if (vendorUser) {
        await tx.vendorUser.update({
          where: { id: vendorUser.id },
          data: {
            name: row.name,
            phone: primaryPhone,
            passwordHash,
            isActive: true
          }
        });
      } else {
        await tx.vendorUser.create({
          data: {
            transporterId: transporter.id,
            name: row.name,
            phone: primaryPhone,
            passwordHash
          }
        });
      }

      await tx.companyTransporter.upsert({
        where: {
          companyId_transporterId: {
            companyId: admin.companyId,
            transporterId: transporter.id
          }
        },
        update: {
          displayName: row.name,
          isBlacklisted: false,
          blacklistedAt: null,
          blacklistedByName: null
        },
        create: {
          companyId: admin.companyId,
          transporterId: transporter.id,
          displayName: row.name,
          trustRating: 3
        }
      });

      await prepareOpenRequestInvites(tx, {
        companyId: admin.companyId,
        transporterId: transporter.id,
        createdByName: admin.name
      });
    });

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  await prisma.auditEvent.create({
    data: {
      companyId: admin.companyId,
      actorType: "company_user",
      actorName: admin.name,
      action: "vendor.bulk_imported",
      details: {
        fileName: file.name,
        created,
        updated,
        skipped
      }
    }
  });

  revalidatePath("/");
  revalidatePath("/admin/vendors");
  revalidatePath("/requests/new");
  revalidatePath("/vendor");

  const parts = [`${created} created`, `${updated} updated`];
  if (skipped > 0) {
    parts.push(`${skipped} skipped`);
  }

  return {
    success: `Bulk vendor import complete: ${parts.join(", ")}.`,
    details: details.slice(0, 8)
  };
}

export async function resetVendorPassword(formData: FormData) {
  const admin = await requireAdmin();
  const companyTransporterId = String(formData.get("companyTransporterId") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!companyTransporterId || password.length < 6) {
    return;
  }

  const companyTransporter = await prisma.companyTransporter.findFirst({
    where: {
      id: companyTransporterId,
      companyId: admin.companyId
    },
    include: { transporter: true }
  });

  if (!companyTransporter) {
    return;
  }

  const transporter = companyTransporter.transporter;
  const existingVendorUser = await prisma.vendorUser.findFirst({
    where: { transporterId: transporter.id }
  });

  await prisma.$transaction(async (tx) => {
    if (existingVendorUser) {
      await tx.vendorUser.update({
        where: { id: existingVendorUser.id },
        data: {
          name: transporter.name,
          email: transporter.email,
          phone: transporter.primaryPhone,
          passwordHash: hashPassword(password),
          isActive: true
        }
      });
    } else {
      await tx.vendorUser.create({
        data: {
          transporterId: transporter.id,
          name: transporter.name,
          email: transporter.email,
          phone: transporter.primaryPhone,
          passwordHash: hashPassword(password)
        }
      });
    }

    await tx.auditEvent.create({
      data: {
        companyId: admin.companyId,
        actorType: "company_user",
        actorName: admin.name,
        action: "vendor_login.password_reset",
        details: {
          transporter: transporter.name,
          primaryPhone: transporter.primaryPhone
        }
      }
    });
  });

  revalidatePath("/admin/vendors");
}

export async function toggleVendorBlacklist(formData: FormData) {
  const admin = await requireAdmin();
  const companyTransporterId = String(formData.get("companyTransporterId") ?? "");
  const nextValue = String(formData.get("nextValue") ?? "") === "true";

  const companyTransporter = await prisma.companyTransporter.findFirst({
    where: {
      id: companyTransporterId,
      companyId: admin.companyId
    },
    include: { transporter: true }
  });

  if (!companyTransporter) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.companyTransporter.update({
      where: { id: companyTransporter.id },
      data: {
        isBlacklisted: nextValue,
        blacklistedAt: nextValue ? new Date() : null,
        blacklistedByName: nextValue ? admin.name : null
      }
    });

    if (nextValue) {
      await tx.quoteRequest.updateMany({
        where: {
          companyId: admin.companyId,
          transporterId: companyTransporter.transporterId,
          request: { status: { in: ["OPEN", "QUOTED"] } },
          status: { in: ["READY", "SENT", "DELIVERED", "QUESTION"] }
        },
        data: {
          status: "BLACKLISTED",
          failedAt: new Date(),
          lastError: "Vendor blacklisted by admin"
        }
      });
    }

    await tx.auditEvent.create({
      data: {
        companyId: admin.companyId,
        actorType: "company_user",
        actorName: admin.name,
        action: nextValue ? "vendor.blacklisted" : "vendor.blacklist_removed",
        details: {
          transporter: companyTransporter.transporter.name,
          primaryPhone: companyTransporter.transporter.primaryPhone
        }
      }
    });
  });

  revalidatePath("/");
  revalidatePath("/admin/vendors");
  revalidatePath("/requests/new");
  revalidatePath("/quotes");
}

export async function deleteVendor(formData: FormData) {
  const admin = await requireAdmin();
  const companyTransporterId = String(formData.get("companyTransporterId") ?? "");

  const companyTransporter = await prisma.companyTransporter.findFirst({
    where: {
      id: companyTransporterId,
      companyId: admin.companyId
    },
    include: { transporter: true }
  });

  if (!companyTransporter) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.quoteRequest.updateMany({
      where: {
        companyId: admin.companyId,
        transporterId: companyTransporter.transporterId,
        request: { status: { in: ["OPEN", "QUOTED"] } },
        status: { in: ["READY", "SENT", "DELIVERED", "QUESTION"] }
      },
      data: {
        status: "REMOVED",
        failedAt: new Date(),
        lastError: "Vendor removed from company directory"
      }
    });

    await tx.companyTransporter.delete({
      where: { id: companyTransporter.id }
    });

    await tx.auditEvent.create({
      data: {
        companyId: admin.companyId,
        actorType: "company_user",
        actorName: admin.name,
        action: "vendor.deleted_from_directory",
        details: {
          transporter: companyTransporter.transporter.name,
          primaryPhone: companyTransporter.transporter.primaryPhone
        }
      }
    });
  });

  revalidatePath("/");
  revalidatePath("/admin/vendors");
  revalidatePath("/requests/new");
  revalidatePath("/quotes");
}
