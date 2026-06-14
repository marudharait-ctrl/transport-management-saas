"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const pickupState = required(formData, "pickupState");
  const dropCity = required(formData, "dropCity");
  const dropState = required(formData, "dropState");
  const material = required(formData, "material");
  const quantity = required(formData, "quantity");
  const truckRequirement = required(formData, "truckRequirement");
  const pickupDate = parseDate(required(formData, "pickupDate"));
  const targetDeliveryDateValue = required(formData, "targetDeliveryDate");
  const targetDeliveryDate = targetDeliveryDateValue ? parseDate(targetDeliveryDateValue) : null;
  const notes = required(formData, "notes");

  const validLoadTypes = ["FULL_TRUCK", "PARTIAL_LOAD", "SIZE_SPECIFIC", "MULTI_LEG"];

  if (
    !title ||
    !validLoadTypes.includes(loadType) ||
    !pickupCity ||
    !pickupState ||
    !dropCity ||
    !dropState ||
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

  const requestCount = await prisma.transportRequest.count({
    where: { companyId: user.companyId }
  });
  const requestNumber = `MP-TR-2026-${String(requestCount + 1).padStart(4, "0")}`;

  const request = await prisma.transportRequest.create({
    data: {
      companyId: user.companyId,
      requestedById: user.id,
      requestNumber,
      title,
      loadType: loadType as "FULL_TRUCK" | "PARTIAL_LOAD" | "SIZE_SPECIFIC" | "MULTI_LEG",
      status: "OPEN",
      pickupCity,
      pickupState,
      dropCity,
      dropState,
      material,
      quantity,
      truckRequirement,
      pickupDate,
      targetDeliveryDate,
      notes: notes || null,
      aiSummary: "Manual web request created. AI intake and transporter matching can enrich this next."
    }
  });

  await prisma.auditEvent.create({
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
        route: `${pickupCity} to ${dropCity}`
      }
    }
  });

  redirect("/");
}
