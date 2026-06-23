"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { sendQuoteRequestNotification } from "@/app/actions/broadcasts";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildQuoteRequestMessage } from "@/lib/quote-message";
import { findSourceUnit, formatRouteLabel, formatTransporterRoute, normalizeRouteStops } from "@/lib/route-stops";
import { vendorQuoteUrl } from "@/lib/vendor-links";

export type RequestFormState = {
  error?: string;
};

function required(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function parseDate(value: string) {
  const date = value.includes("T") ? new Date(`${value}:00.000+05:30`) : new Date(`${value}T09:00:00.000+05:30`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateTime(value: string) {
  const date = new Date(`${value}:00.000+05:30`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createTransportRequest(_state: RequestFormState, formData: FormData): Promise<RequestFormState> {
  const user = await requireUser();
  const title = required(formData, "title");
  const loadType = required(formData, "loadType");
  const sourceUnitIds = formData
    .getAll("sourceUnitId")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const sourceUnits = sourceUnitIds.map((unitId) => findSourceUnit(unitId));
  const routeConsigneeIds = formData.getAll("routeConsigneeId").map((value) => String(value).trim());
  const routeStops = normalizeRouteStops(
    formData.getAll("routeCity").map((value) => String(value)),
    formData.getAll("routePincode").map((value) => String(value)),
    formData.getAll("routeAddress").map((value) => String(value)),
    formData.getAll("routeConsigneeName").map((value) => String(value)),
    formData.getAll("routeState").map((value) => String(value))
  );

  if (sourceUnits.length === 0 || sourceUnits.some((unit) => !unit)) {
    return { error: "Please select valid loading point units." };
  }

  if (new Set(sourceUnitIds).size !== sourceUnitIds.length) {
    return { error: "Each loading point should be selected only once." };
  }

  sourceUnits.forEach((sourceUnit, index) => {
    if (!sourceUnit) {
      return;
    }

    routeStops[index] = {
      city: sourceUnit.city,
      state: sourceUnit.state,
      pincode: sourceUnit.pincode,
      address: sourceUnit.address,
      consigneeName: sourceUnit.name,
      addressPhotoUrl: null
    };
  });

  const selectedConsigneeIds = routeConsigneeIds.filter(Boolean);

  if (selectedConsigneeIds.length > 0) {
    const consignees = await prisma.consignee.findMany({
      where: {
        id: { in: selectedConsigneeIds },
        companyId: user.companyId
      }
    });
    const consigneeById = new Map(consignees.map((consignee) => [consignee.id, consignee]));

    for (const [index, consigneeId] of routeConsigneeIds.entries()) {
      if (!consigneeId) {
        continue;
      }

      const consignee = consigneeById.get(consigneeId);

      if (!consignee) {
        return { error: "One selected consignee is not available for this company." };
      }

      const fullAddress = [
        consignee.addressLine1,
        consignee.addressLine2,
        consignee.addressLine3,
        consignee.city,
        consignee.pincode,
        consignee.state
      ]
        .filter(Boolean)
        .join(", ");

      routeStops[index] = {
        city: consignee.city,
        state: consignee.state,
        pincode: consignee.pincode,
        address: fullAddress,
        consigneeName: consignee.name,
        addressPhotoUrl: routeStops[index]?.addressPhotoUrl ?? null
      };
    }
  }

  const pickupCity = routeStops[0]?.city ?? "";
  const pickupState = routeStops[0]?.state ?? null;
  const pickupPincode = routeStops[0]?.pincode ?? null;
  const dropCity = routeStops.at(-1)?.city ?? "";
  const dropState = routeStops.at(-1)?.state ?? null;
  const dropPincode = routeStops.at(-1)?.pincode ?? null;
  const material = required(formData, "material");
  const quantityKg = required(formData, "quantityKg").replace(/,/g, "");
  const quantity = quantityKg ? `${quantityKg} kg` : "";
  const truckRequirement = required(formData, "truckRequirement");
  const pickupDate = parseDate(required(formData, "pickupDate"));
  const biddingDeadline = parseDateTime(required(formData, "biddingDeadline"));
  const targetDeliveryDateValue = required(formData, "targetDeliveryDate");
  const targetDeliveryDate = targetDeliveryDateValue ? parseDate(targetDeliveryDateValue) : null;
  const notes = required(formData, "notes");
  const transporterIds = formData
    .getAll("transporterIds")
    .map((value) => String(value))
    .filter(Boolean);

  const validLoadTypes = ["FULL_TRUCK", "PARTIAL_LOAD", "SIZE_SPECIFIC", "MULTI_LEG"];

  if (!title || !validLoadTypes.includes(loadType) || routeStops.length < 2 || !material || !quantity || !truckRequirement || !pickupDate || !biddingDeadline) {
    return { error: "Please fill all required request fields." };
  }

  if (routeStops.length > 10) {
    return { error: "A single truck booking can have maximum 10 route locations." };
  }

  if (routeStops.some((stop) => !stop.pincode || !/^\d{6}$/.test(stop.pincode))) {
    return { error: "Enter a 6 digit PIN code for every route location." };
  }

  if (!/^\d+(\.\d{1,3})?$/.test(quantityKg) || Number(quantityKg) <= 0) {
    return { error: "Quantity must be entered in kg." };
  }

  if (targetDeliveryDateValue && !targetDeliveryDate) {
    return { error: "Target delivery date is invalid." };
  }

  const allowedTruckRequirements = [
    "Container truck",
    "Open truck with tarpaulin",
    "32 Feet Container Truck",
    "Pickup Truck with Tarpaulin"
  ];
  if (!allowedTruckRequirements.includes(truckRequirement)) {
    return { error: "Please select a valid truck requirement." };
  }

  const companyTransporters = await prisma.companyTransporter.findMany({
    where: {
      companyId: user.companyId,
      transporterId: { in: transporterIds },
      isBlacklisted: false
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
  const quoteRequestIds: string[] = [];
  const requestId = randomUUID();

  const routeLabel = formatRouteLabel(routeStops);
  const transporterRoute = formatTransporterRoute(routeStops);

  await prisma.$transaction(async (tx) => {
    const request = await tx.transportRequest.create({
      data: {
        id: requestId,
        companyId: user.companyId,
        requestedById: user.id,
        requestNumber,
        title,
        loadType: loadType as "FULL_TRUCK" | "PARTIAL_LOAD" | "SIZE_SPECIFIC" | "MULTI_LEG",
        status: "OPEN",
        pickupCity,
        pickupState: pickupState ?? "TBD",
        pickupPincode,
        dropCity,
        dropState: dropState ?? "TBD",
        dropPincode,
        routeStops,
        material,
        quantity,
        truckRequirement,
        pickupDate,
        biddingDeadline,
        targetDeliveryDate,
        notes: notes || null,
        aiSummary:
          transporterIds.length > 0
            ? `Manual web request created with ${transporterIds.length} vendor quote notification target(s) prepared.`
            : "Manual web request created. Vendor quote notifications can be prepared next."
      }
    });

    if (companyTransporters.length > 0) {
      for (const item of companyTransporters) {
        const accessToken = randomUUID();
        const quoteMessage = buildQuoteRequestMessage({
          companyName: user.company.name,
          requestNumber,
          requestDate: request.createdAt,
          requestedByName: user.name,
          title,
          loadType,
          status: "OPEN",
          pickupCity,
          pickupState: pickupState ?? "TBD",
          pickupPincode,
          dropCity,
          dropState: dropState ?? "TBD",
          dropPincode,
          routeLabel,
          routeSummary: transporterRoute,
          material,
          quantity,
          truckRequirement,
          pickupDate: required(formData, "pickupDate"),
          biddingDeadline,
          targetDeliveryDate: targetDeliveryDateValue || null,
          notes: notes || null,
          quoteUrl: vendorQuoteUrl(accessToken)
        });

        const quoteRequest = await tx.quoteRequest.create({
          data: {
            companyId: user.companyId,
            requestId: request.id,
            transporterId: item.transporterId,
            accessToken,
            channel: "WHATSAPP",
            status: "READY",
            message: quoteMessage
          }
        });
        quoteRequestIds.push(quoteRequest.id);
      }
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
          route: routeLabel,
          routeStops
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
          action: "quote_notification.prepared",
          details: {
            channel: "vendor_link",
            transporterCount: companyTransporters.length,
            autoSend: true,
            transporters: companyTransporters.map((item) => item.transporter.name)
          }
        }
      });
    }

    await tx.notification.createMany({
      data: [
        {
          companyId: user.companyId,
          requestId: request.id,
          recipientType: "ADMIN",
          title: "RFQ created",
          body: `${requestNumber} was created for ${routeLabel}.`,
          action: "rfq.created"
        },
        ...companyTransporters.map((item) => ({
          companyId: user.companyId,
          requestId: request.id,
          transporterId: item.transporterId,
          recipientType: "VENDOR",
          title: "RFQ created",
          body: `${requestNumber} is open for quote submission.`,
          action: "rfq.created"
        }))
      ]
    });
  });

  await Promise.allSettled(quoteRequestIds.map((quoteRequestId) => sendQuoteRequestNotification(quoteRequestId, user)));

  redirect("/");
}
