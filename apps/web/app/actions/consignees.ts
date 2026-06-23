"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ConsigneeFormState = {
  error?: string;
  success?: string;
};

export type ConsigneeImportState = {
  error?: string;
  success?: string;
  details?: string[];
};

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function cleanCell(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeHeader(value: unknown) {
  return cleanCell(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const headerAliases = {
  name: ["name", "partyname", "consignee", "consigneename", "customer", "customername", "destinationparty"],
  shortName: ["shortname", "alias", "displayname"],
  addressLine1: ["addressline1", "address1", "address", "factory", "warehouse"],
  addressLine2: ["addressline2", "address2", "area", "road"],
  addressLine3: ["addressline3", "address3", "district", "landmark"],
  city: ["city", "destinationcity", "place", "location"],
  pincode: ["pincode", "pin", "postalcode", "zipcode"],
  state: ["state", "destinationstate"],
  contactPerson: ["contactperson", "contactname", "person", "contact"],
  mobile: ["mobile", "mobileno", "mobilephone", "phone", "phoneno", "contactnumber"],
  email: ["email", "emailid"],
  gstin: ["gstin", "gst", "gstno", "gstnumber"]
} as const;

type ConsigneeImportRow = {
  name: string;
  shortName: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  city: string;
  pincode: string;
  state: string;
  contactPerson: string;
  mobile: string;
  email: string;
  gstin: string;
};

function valueFor(row: Record<string, unknown>, aliases: readonly string[]) {
  for (const alias of aliases) {
    const value = row[alias];
    if (value !== undefined && cleanCell(value)) {
      return cleanCell(value);
    }
  }

  return "";
}

function normalizeImportRow(rawRow: Record<string, unknown>): ConsigneeImportRow {
  const normalizedRow = Object.fromEntries(
    Object.entries(rawRow).map(([key, value]) => [normalizeHeader(key), value])
  );

  return {
    name: valueFor(normalizedRow, headerAliases.name),
    shortName: valueFor(normalizedRow, headerAliases.shortName),
    addressLine1: valueFor(normalizedRow, headerAliases.addressLine1),
    addressLine2: valueFor(normalizedRow, headerAliases.addressLine2),
    addressLine3: valueFor(normalizedRow, headerAliases.addressLine3),
    city: valueFor(normalizedRow, headerAliases.city),
    pincode: valueFor(normalizedRow, headerAliases.pincode).replace(/\D/g, ""),
    state: valueFor(normalizedRow, headerAliases.state),
    contactPerson: valueFor(normalizedRow, headerAliases.contactPerson),
    mobile: valueFor(normalizedRow, headerAliases.mobile),
    email: valueFor(normalizedRow, headerAliases.email).toLowerCase(),
    gstin: valueFor(normalizedRow, headerAliases.gstin).toUpperCase()
  };
}

export async function createConsignee(_state: ConsigneeFormState, formData: FormData): Promise<ConsigneeFormState> {
  const admin = await requireAdmin();
  const name = clean(formData.get("name"));
  const shortName = clean(formData.get("shortName"));
  const addressLine1 = clean(formData.get("addressLine1"));
  const addressLine2 = clean(formData.get("addressLine2"));
  const addressLine3 = clean(formData.get("addressLine3"));
  const city = clean(formData.get("city"));
  const pincode = clean(formData.get("pincode"));
  const email = clean(formData.get("email")).toLowerCase();
  const contactPerson = clean(formData.get("contactPerson"));
  const mobile = clean(formData.get("mobile"));
  const gstin = clean(formData.get("gstin")).toUpperCase();
  const state = clean(formData.get("state"));

  if (!name || !city) {
    return { error: "Party name and city are required." };
  }

  if (pincode && !/^\d{6}$/.test(pincode)) {
    return { error: "PIN code must be 6 digits." };
  }

  try {
    await prisma.consignee.create({
      data: {
        companyId: admin.companyId,
        name,
        shortName: shortName || null,
        addressLine1: addressLine1 || null,
        addressLine2: addressLine2 || null,
        addressLine3: addressLine3 || null,
        city,
        pincode: pincode || null,
        email: email || null,
        contactPerson: contactPerson || null,
        mobile: mobile || null,
        gstin: gstin || null,
        state: state || null
      }
    });

    await prisma.auditEvent.create({
      data: {
        companyId: admin.companyId,
        actorType: "company_user",
        actorName: admin.name,
        action: "consignee.created",
        details: {
          consignee: name,
          city,
          pincode: pincode || null
        }
      }
    });
  } catch {
    return { error: "This consignee party name is already added." };
  }

  revalidatePath("/");
  revalidatePath("/admin/consignees");
  revalidatePath("/requests/new");
  return { success: "Consignee added." };
}

export async function importConsignees(
  _state: ConsigneeImportState,
  formData: FormData
): Promise<ConsigneeImportState> {
  const admin = await requireAdmin();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Upload an Excel or CSV file." };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: "File is too large. Please upload a file under 5 MB." };
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
    return { error: "No consignee rows found in the file." };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const details: string[] = [];

  for (const [index, rawRow] of rows.entries()) {
    const rowNumber = index + 2;
    const row = normalizeImportRow(rawRow);

    if (!row.name && !row.city) {
      skipped += 1;
      continue;
    }

    if (!row.name || !row.city) {
      skipped += 1;
      details.push(`Row ${rowNumber}: party name and city are required.`);
      continue;
    }

    if (row.pincode && !/^\d{6}$/.test(row.pincode)) {
      skipped += 1;
      details.push(`Row ${rowNumber}: PIN code must be 6 digits.`);
      continue;
    }

    const existing = await prisma.consignee.findUnique({
      where: {
        companyId_name: {
          companyId: admin.companyId,
          name: row.name
        }
      },
      select: { id: true }
    });

    await prisma.consignee.upsert({
      where: {
        companyId_name: {
          companyId: admin.companyId,
          name: row.name
        }
      },
      create: {
        companyId: admin.companyId,
        name: row.name,
        shortName: row.shortName || null,
        addressLine1: row.addressLine1 || null,
        addressLine2: row.addressLine2 || null,
        addressLine3: row.addressLine3 || null,
        city: row.city,
        pincode: row.pincode || null,
        email: row.email || null,
        contactPerson: row.contactPerson || null,
        mobile: row.mobile || null,
        gstin: row.gstin || null,
        state: row.state || null
      },
      update: {
        shortName: row.shortName || null,
        addressLine1: row.addressLine1 || null,
        addressLine2: row.addressLine2 || null,
        addressLine3: row.addressLine3 || null,
        city: row.city,
        pincode: row.pincode || null,
        email: row.email || null,
        contactPerson: row.contactPerson || null,
        mobile: row.mobile || null,
        gstin: row.gstin || null,
        state: row.state || null
      }
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
      action: "consignee.bulk_imported",
      details: {
        fileName: file.name,
        created,
        updated,
        skipped
      }
    }
  });

  revalidatePath("/");
  revalidatePath("/admin/consignees");
  revalidatePath("/requests/new");

  const parts = [`${created} created`, `${updated} updated`];
  if (skipped > 0) {
    parts.push(`${skipped} skipped`);
  }

  return {
    success: `Bulk upload complete: ${parts.join(", ")}.`,
    details: details.slice(0, 8)
  };
}
