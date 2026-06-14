"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildQuoteRequestMessage } from "@/lib/quote-message";

export type RequestFormState = {
  error?: string;
};

function required(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function parseDate(value: string) {
  const date = new Date(`${value}T09:00:00.000+05:30`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createTransportRequest(_state: RequestFormState, formData: FormData): Promise<RequestFormState> {
  const user = await requireUser();
  const title = required(formData, "title");
  const loadType = required(formData, "loadType");
  const pickupCity = required(formData, "pickupCity");
  const pickupPincode = required(formData, "pickupPincode");
  const dropCity = required(formData, "dropCity");
  const dropPincode = required(formData, "dropPincode");
  const material = required(formData, "material");
  const quantity = required(formData, "quantity");
  const truckRequirement = required(formData, "truckRequirement");
  const pickupDate = parseDate(required(formData, "pickupDate"));
  const targetDeliveryDateValue = required(formData, "targetDeliveryDate");
  const targetDeliveryDate = targetDeliveryDateValue ? parseDate(targetDeliveryDateValue) : null;
  const notes = required(formData, "notes");
  const transporterIds = formData
    .getAll("transporterIds")
    .map((value) => String(value))
    .filter(Boolean);

  const validLoadTypes = ["FULL_TRUCK", "PARTIAL_LOAD", "SIZE_SPECIFIC", "MULTI_LEG"];

  if (
    !title ||
    !validLoadTypes.includes(loadType) ||
    !pickupCity ||
    !pickupPincode ||
    !dropCity ||
    !dropPincode ||
    !material ||
    !quantity ||
    !truckRequirement ||
    !pickupDate
  ) {
    return { error: "Please fill all required request fields." };
  }

  if (targetDeliveryDateValue && !targetDeliveryDate) {
    return { error: "Target delivery date is invalid." };
  }

  const pincodePattern = /^\d{6}$/;

  if (!pincodePattern.test(pickupPincode) || !pincodePattern.test(dropPincode)) {
    return { error: "Please enter valid 6 digit pickup and drop pincodes." };
  }

  const companyTransporters = await prisma.companyTransporter.findMany({
    where: {
      companyId: user.companyId,
      transporterId: { in: transporterIds }
    },
    include: { transporter: true }
  });
  const validTransporterIds = new Set(companyTransporters.map((item) => item.transporterId));

  if (transporterIds.some((id) => !validTransporterIds.has(id))) {
    return { error: "One selected transporter is not available for this company." };
  }

  const requestCount = await prisma.transportRequest.count({
    where: { companyId: user.companyId }
  });
  const requestNumber = `MP-TR-2026-${String(requestCount + 1).padStart(4, "0")}`;

  const quoteMessage = buildQuoteRequestMessage({
    companyName: user.company.name,
    requestNumber,
    title,
    loadType,
    pickupCity,
    pickupPincode,
    dropCity,
    dropPincode,
    material,
    quantity,
    truckRequirement,
    pickupDate: required(formData, "pickupDate"),
    targetDeliveryDate: targetDeliveryDateValue || null,
    notes: notes || null
  });

  await prisma.$transaction(async (tx) => {
    const request = await tx.transportRequest.create({
      data: {
        companyId: user.companyId,
        requestedById: user.id,
        requestNumber,
        title,
        loadType: loadType as "FULL_TRUCK" | "PARTIAL_LOAD" | "SIZE_SPECIFIC" | "MULTI_LEG",
        status: "OPEN",
        pickupCity,
        pickupState: "TBD",
        pickupPincode,
        dropCity,
        dropState: "TBD",
        dropPincode,
        material,
        quantity,
        truckRequirement,
        pickupDate,
        targetDeliveryDate,
        notes: notes || null,
        aiSummary:
          transporterIds.length > 0
            ? `Manual web request created with ${transporterIds.length} transporter broadcast target(s) prepared.`
            : "Manual web request created. Transporter broadcast can be prepared next."
      }
    });

    if (companyTransporters.length > 0) {
      await tx.quoteRequest.createMany({
        data: companyTransporters.map((item) => ({
          companyId: user.companyId,
          requestId: request.id,
          transporterId: item.transporterId,
          channel: "WHATSAPP",
          status: "READY",
          message: quoteMessage
        }))
      });
    }

    await tx.auditEvent.create({
      data: {
        companyId: user.companyId,
        requestId: request.id,
        actorType: "company_user",
        actorName: user.name,
        action: "transport_request.created",
        details: {
          channel: "web",
          requestNumber,
          loadType,
          route: `${pickupCity} to ${dropCity}`,
          pickupPincode,
          dropPincode
        }
      }
    });

    if (companyTransporters.length > 0) {
      await tx.auditEvent.create({
        data: {
          companyId: user.companyId,
          requestId: request.id,
          actorType: "company_user",
          actorName: user.name,
          action: "quote_broadcast.prepared",
          details: {
            channel: "whatsapp",
            transporterCount: companyTransporters.length,
            transporters: companyTransporters.map((item) => item.transporter.name)
          }
        }
      });
    }
  });

  redirect("/");
}
