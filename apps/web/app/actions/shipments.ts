"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import type { Prisma, ShipmentStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ShipmentTx = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function safeFileName(value: string, fallback: string) {
  const parsed = path.parse(value);
  const base = parsed.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || fallback;
  const ext = parsed.ext.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 12);
  return `${base}${ext}`;
}

async function saveAdminUpload(shipmentId: string, value: FormDataEntryValue | null, folder: "weight-slips") {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
  if (!allowedTypes.has(value.type) || value.size > 15 * 1024 * 1024) {
    return null;
  }

  const uploadDir = path.join(/* turbopackIgnore: true */ process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });
  const fileName = `${shipmentId}-${Date.now()}-${safeFileName(value.name, "weight-slip")}`;
  await writeFile(path.join(uploadDir, fileName), Buffer.from(await value.arrayBuffer()));
  return `/uploads/${folder}/${fileName}`;
}

async function getAdminShipment(shipmentId: string) {
  const admin = await requireAdmin();
  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, companyId: admin.companyId },
    include: {
      request: { include: { company: true } },
      transporter: true,
      loadingPoints: { orderBy: { pointIndex: "asc" } },
      deliveryStops: { orderBy: { stopIndex: "asc" } }
    }
  });

  return { admin, shipment };
}

async function createShipmentEvent(
  tx: ShipmentTx,
  shipment: {
    companyId: string;
    requestId: string;
    id: string;
    transporterId: string;
    transporter: { name: string };
  },
  actorType: string,
  actorName: string,
  action: string,
  title: string,
  body: string,
  details: Prisma.InputJsonValue
) {
  const vendorNotificationActions = new Set([
    "shipment.driver_details_approved",
    "shipment.loading_started",
    "shipment.in_transit",
    "shipment.invoice_verified",
    "shipment.payment_processed",
    "shipment.payment_completed"
  ]);
  const notificationRows: Prisma.NotificationCreateManyInput[] = [
    {
      companyId: shipment.companyId,
      requestId: shipment.requestId,
      shipmentId: shipment.id,
      recipientType: "ADMIN",
      title,
      body,
      action
    }
  ];

  if (vendorNotificationActions.has(action)) {
    notificationRows.push({
      companyId: shipment.companyId,
      requestId: shipment.requestId,
      shipmentId: shipment.id,
      transporterId: shipment.transporterId,
      recipientType: "VENDOR",
      title,
      body,
      action
    });
  }

  await tx.auditEvent.create({
    data: {
      companyId: shipment.companyId,
      requestId: shipment.requestId,
      actorType,
      actorName,
      action,
      details
    }
  });

  await tx.notification.createMany({ data: notificationRows });
}

async function notifyVendorByWhatsApp(shipmentId: string, title: string, body: string) {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: { request: { include: { company: true } }, transporter: true }
  });

  if (!shipment?.transporter.primaryPhone) {
    return;
  }

  const message = [
    `${title} - ${shipment.request.company.name}`,
    "",
    `RFQ: ${shipment.request.requestNumber}`,
    `Shipment: ${shipment.request.title}`,
    body
  ].join("\n");

  try {
    const { sendWhatsAppMessage } = await import("@/lib/openclaw-whatsapp");
    const cliResult = await sendWhatsAppMessage(shipment.transporter.primaryPhone, message);
    await prisma.auditEvent.create({
      data: {
        companyId: shipment.companyId,
        requestId: shipment.requestId,
        actorType: "system",
        actorName: "Garud WhatsApp Sender",
        action: "shipment.whatsapp_sent",
        details: { shipmentId, title, primaryPhone: shipment.transporter.primaryPhone, cliResult }
      }
    });
  } catch (error) {
    await prisma.auditEvent.create({
      data: {
        companyId: shipment.companyId,
        requestId: shipment.requestId,
        actorType: "system",
        actorName: "Garud WhatsApp Sender",
        action: "shipment.whatsapp_failed",
        details: {
          shipmentId,
          title,
          primaryPhone: shipment.transporter.primaryPhone,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    });
  }
}

function revalidateShipmentPaths(shipmentId: string, requestId?: string) {
  revalidatePath("/");
  revalidatePath("/requests");
  revalidatePath("/quotes");
  revalidatePath("/shipments");
  revalidatePath(`/vendor/order/${shipmentId}`);
  if (requestId) {
    revalidatePath(`/quotes/${requestId}`);
  }
}

export async function approveDriverDetails(formData: FormData) {
  const shipmentId = field(formData, "shipmentId");
  const { admin, shipment } = await getAdminShipment(shipmentId);

  if (!shipment || !["DRIVER_DETAILS_SUBMITTED", "ADMIN_APPROVAL_REQUIRED"].includes(shipment.status)) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id: shipment.id },
      data: {
        status: "DRIVER_DETAILS_APPROVED",
        driverDetailsApprovedAt: new Date(),
        driverDetailsApprovedByName: admin.name
      }
    });

    await createShipmentEvent(
      tx,
      shipment,
      "company_user",
      admin.name,
      "shipment.driver_details_approved",
      "Driver details approved",
      `${shipment.transporter.name} driver and truck documents were approved.`,
      { transporter: shipment.transporter.name }
    );
  });

  await notifyVendorByWhatsApp(shipment.id, "Driver details approved", "Admin approved the driver and vehicle documents.");
  revalidateShipmentPaths(shipment.id, shipment.requestId);
}

export async function startLoading(formData: FormData) {
  const shipmentId = field(formData, "shipmentId");
  const { admin, shipment } = await getAdminShipment(shipmentId);

  if (!shipment || shipment.status !== "DRIVER_DETAILS_APPROVED") {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id: shipment.id },
      data: { status: "LOADING_IN_PROCESS", loadingStartedAt: new Date() }
    });

    await createShipmentEvent(
      tx,
      shipment,
      "company_user",
      admin.name,
      "shipment.loading_started",
      "Loading started",
      `${shipment.transporter.name} shipment loading has started.`,
      { transporter: shipment.transporter.name }
    );
  });

  await notifyVendorByWhatsApp(shipment.id, "Loading started", "Loading has started for this shipment.");
  revalidateShipmentPaths(shipment.id, shipment.requestId);
}

export async function addLoadingPoint(formData: FormData) {
  const shipmentId = field(formData, "shipmentId");
  const city = field(formData, "city");
  const pincode = field(formData, "pincode");
  const address = field(formData, "address");
  const label = field(formData, "label");
  const { admin, shipment } = await getAdminShipment(shipmentId);

  if (!shipment || !["DRIVER_DETAILS_APPROVED", "LOADING_IN_PROCESS", "LOADING_POINT_COMPLETED"].includes(shipment.status) || !city) {
    return;
  }

  const nextIndex = Math.max(0, ...shipment.loadingPoints.map((point) => point.pointIndex)) + 1;

  await prisma.$transaction(async (tx) => {
    await tx.shipmentLoadingPoint.updateMany({
      where: { shipmentId: shipment.id },
      data: { isFinal: false }
    });

    await tx.shipmentLoadingPoint.create({
      data: {
        shipmentId: shipment.id,
        pointIndex: nextIndex,
        label: label || `Loading Point ${nextIndex}`,
        city,
        pincode: pincode || null,
        address: address || null,
        isFinal: true
      }
    });

    await createShipmentEvent(
      tx,
      shipment,
      "company_user",
      admin.name,
      "shipment.loading_point_added",
      "Loading point added",
      `${label || `Loading Point ${nextIndex}`} was added to the shipment loading plan.`,
      { transporter: shipment.transporter.name, pointIndex: nextIndex, city, pincode, address }
    );
  });

  revalidateShipmentPaths(shipment.id, shipment.requestId);
}

export async function uploadLoadingWeightSlip(formData: FormData) {
  const shipmentId = field(formData, "shipmentId");
  const loadingPointId = field(formData, "loadingPointId");
  const { admin, shipment } = await getAdminShipment(shipmentId);

  if (!shipment || !["LOADING_IN_PROCESS", "LOADING_POINT_COMPLETED", "FINAL_WEIGHT_SLIP_UPLOADED"].includes(shipment.status)) {
    return;
  }

  const loadingPoint = shipment.loadingPoints.find((point) => point.id === loadingPointId);
  if (!loadingPoint || loadingPoint.weightSlipUrl) {
    return;
  }

  const weightSlipUrl = await saveAdminUpload(shipment.id, formData.get("weightSlipFile"), "weight-slips");
  if (!weightSlipUrl) {
    return;
  }

  const title = loadingPoint.isFinal ? "Final weight slip uploaded" : "Weight slip uploaded";
  const nextStatus: ShipmentStatus = loadingPoint.isFinal ? "FINAL_WEIGHT_SLIP_UPLOADED" : "LOADING_POINT_COMPLETED";

  await prisma.$transaction(async (tx) => {
    await tx.shipmentLoadingPoint.update({
      where: { id: loadingPoint.id },
      data: { weightSlipUrl, uploadedAt: new Date(), completedAt: new Date() }
    });

    await tx.shipment.update({
      where: { id: shipment.id },
      data: {
        status: nextStatus,
        pickupAt: shipment.pickupAt ?? new Date(),
        materialPickedUpAt: loadingPoint.isFinal ? new Date() : shipment.materialPickedUpAt,
        weightSlipDocumentUrl: loadingPoint.isFinal ? weightSlipUrl : shipment.weightSlipDocumentUrl,
        weightSlipUploadedAt: loadingPoint.isFinal ? new Date() : shipment.weightSlipUploadedAt
      }
    });

    await createShipmentEvent(
      tx,
      shipment,
      "company_user",
      admin.name,
      loadingPoint.isFinal ? "shipment.final_weight_slip_uploaded" : "shipment.weight_slip_uploaded",
      title,
      `${loadingPoint.label ?? `Loading Point ${loadingPoint.pointIndex}`} weight slip was uploaded.`,
      {
        transporter: shipment.transporter.name,
        loadingPointId,
        pointIndex: loadingPoint.pointIndex,
        isFinal: loadingPoint.isFinal,
        weightSlipUrl
      }
    );
  });

  revalidateShipmentPaths(shipment.id, shipment.requestId);
}

export async function markShipmentInTransit(formData: FormData) {
  const shipmentId = field(formData, "shipmentId");
  const { admin, shipment } = await getAdminShipment(shipmentId);

  if (!shipment || shipment.status !== "FINAL_WEIGHT_SLIP_UPLOADED" || !shipment.weightSlipDocumentUrl) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id: shipment.id },
      data: { status: "IN_TRANSIT" }
    });

    await createShipmentEvent(
      tx,
      shipment,
      "company_user",
      admin.name,
      "shipment.in_transit",
      "Shipment moved to In Transit",
      `${shipment.transporter.name} shipment is now in transit.`,
      { transporter: shipment.transporter.name }
    );
  });

  await notifyVendorByWhatsApp(shipment.id, "Shipment moved to In Transit", "Shipment is now in transit.");
  revalidateShipmentPaths(shipment.id, shipment.requestId);
}

export async function approveDeliveryPod(formData: FormData) {
  const shipmentId = field(formData, "shipmentId");
  const deliveryStopId = field(formData, "deliveryStopId");
  const { admin, shipment } = await getAdminShipment(shipmentId);

  if (!shipment || !["POD_UPLOADED", "POD_APPROVED", "ADMIN_APPROVAL_REQUIRED"].includes(shipment.status)) {
    return;
  }

  const stop = shipment.deliveryStops.find((deliveryStop) => deliveryStop.id === deliveryStopId);
  if (!stop?.podDocumentUrl || !stop.biltyDocumentUrl || stop.podApprovedAt) {
    return;
  }

  const openPodApprovals = shipment.deliveryStops.filter((deliveryStop) => deliveryStop.podDocumentUrl && !deliveryStop.podApprovedAt).length;
  const allApprovedAfterThis = shipment.deliveryStops.every((deliveryStop) => {
    if (deliveryStop.id === deliveryStopId) {
      return true;
    }

    return Boolean(deliveryStop.podDocumentUrl && deliveryStop.biltyDocumentUrl && deliveryStop.podApprovedAt);
  });

  await prisma.$transaction(async (tx) => {
    await tx.shipmentDeliveryStop.update({
      where: { id: deliveryStopId },
      data: {
        podApprovedAt: new Date(),
        podApprovedByName: admin.name,
        completedAt: new Date()
      }
    });

    await tx.shipment.update({
      where: { id: shipment.id },
      data: {
        status: allApprovedAfterThis ? "ALL_DELIVERIES_COMPLETED" : "POD_APPROVED",
        deliveredAt: allApprovedAfterThis ? new Date() : shipment.deliveredAt
      }
    });

    await createShipmentEvent(
      tx,
      shipment,
      "company_user",
      admin.name,
      "shipment.delivery_approved",
      "Delivery approved",
      `${stop.consigneeName ?? `Delivery ${stop.stopIndex}`} Bilty and POD were approved.`,
      {
        transporter: shipment.transporter.name,
        deliveryStopId,
        consigneeName: stop.consigneeName,
        allDeliveriesCompleted: allApprovedAfterThis,
        openPodApprovals
      }
    );

    if (allApprovedAfterThis) {
      await createShipmentEvent(
        tx,
        shipment,
        "system",
        "Shipment Workflow",
        "shipment.all_deliveries_completed",
        "All deliveries completed",
        "All consignee Bilty and POD documents have been uploaded and approved.",
        { transporter: shipment.transporter.name }
      );
    }
  });

  revalidateShipmentPaths(shipment.id, shipment.requestId);
}

export async function approveFinalDelivery(formData: FormData) {
  const shipmentId = field(formData, "shipmentId");
  const { admin, shipment } = await getAdminShipment(shipmentId);

  const allPodApproved = shipment?.deliveryStops.length
    ? shipment.deliveryStops.every((stop) => stop.podDocumentUrl && stop.biltyDocumentUrl && stop.podApprovedAt)
    : false;

  if (!shipment || shipment.status !== "ALL_DELIVERIES_COMPLETED" || !allPodApproved) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id: shipment.id },
      data: {
        status: "FINAL_DELIVERY_APPROVED",
        deliveryApprovedAt: new Date(),
        deliveryApprovedByName: admin.name,
        finalDeliveryApprovedAt: new Date(),
        finalDeliveryApprovedByName: admin.name
      }
    });

    await createShipmentEvent(
      tx,
      shipment,
      "company_user",
      admin.name,
      "shipment.final_delivery_approved",
      "Final delivery approved",
      "All deliveries are approved. Vendor can upload invoice now.",
      { transporter: shipment.transporter.name }
    );
  });

  revalidateShipmentPaths(shipment.id, shipment.requestId);
}

export async function advanceInvoicePaymentStatus(formData: FormData) {
  const shipmentId = field(formData, "shipmentId");
  const nextStatus = field(formData, "nextStatus");
  const { admin, shipment } = await getAdminShipment(shipmentId);

  if (!shipment) {
    return;
  }

  const allowed = {
    INVOICE_VERIFIED: shipment.status === "INVOICE_SUBMITTED",
    PAYMENT_PROCESSED: shipment.status === "INVOICE_VERIFIED",
    PAYMENT_COMPLETED: shipment.status === "PAYMENT_PROCESSED",
    ORDER_CLOSED: shipment.status === "PAYMENT_COMPLETED"
  } as const;

  if (!(nextStatus in allowed) || !allowed[nextStatus as keyof typeof allowed]) {
    return;
  }

  const statusTitle = {
    INVOICE_VERIFIED: "Invoice approved",
    PAYMENT_PROCESSED: "Payment processed",
    PAYMENT_COMPLETED: "Payment completed",
    ORDER_CLOSED: "Order closed"
  }[nextStatus as keyof typeof allowed];
  const action = {
    INVOICE_VERIFIED: "shipment.invoice_verified",
    PAYMENT_PROCESSED: "shipment.payment_processed",
    PAYMENT_COMPLETED: "shipment.payment_completed",
    ORDER_CLOSED: "shipment.order_closed"
  }[nextStatus as keyof typeof allowed];

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id: shipment.id },
      data: {
        status: nextStatus as "INVOICE_VERIFIED" | "PAYMENT_PROCESSED" | "PAYMENT_COMPLETED" | "ORDER_CLOSED",
        invoiceVerifiedAt: nextStatus === "INVOICE_VERIFIED" ? now : shipment.invoiceVerifiedAt,
        invoiceVerifiedByName: nextStatus === "INVOICE_VERIFIED" ? admin.name : shipment.invoiceVerifiedByName,
        paymentProcessedAt: nextStatus === "PAYMENT_PROCESSED" ? now : shipment.paymentProcessedAt,
        paymentCompletedAt: nextStatus === "PAYMENT_COMPLETED" ? now : shipment.paymentCompletedAt,
        closedAt: nextStatus === "ORDER_CLOSED" ? now : shipment.closedAt
      }
    });

    await createShipmentEvent(
      tx,
      shipment,
      "company_user",
      admin.name,
      action,
      statusTitle,
      `${shipment.transporter.name} shipment moved to ${nextStatus.replaceAll("_", " ")}.`,
      { transporter: shipment.transporter.name, nextStatus }
    );
  });

  if (["INVOICE_VERIFIED", "PAYMENT_PROCESSED", "PAYMENT_COMPLETED"].includes(nextStatus)) {
    await notifyVendorByWhatsApp(shipment.id, statusTitle, `Shipment status: ${nextStatus.replaceAll("_", " ")}.`);
  }
  revalidateShipmentPaths(shipment.id, shipment.requestId);
}
