"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeIndianMobile } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export type VendorPortalState = {
  error?: string;
  success?: string;
};

function required(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function parseDateTime(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseMoneyPaise(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  return Math.round(Number(normalized) * 100);
}

function safeFileName(value: string, fallback: string) {
  const parsed = path.parse(value);
  const base = parsed.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || fallback;
  const ext = parsed.ext.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 12);
  return `${base}${ext}`;
}

async function saveShipmentUpload(
  shipmentId: string,
  value: FormDataEntryValue | null,
  folder: "invoices" | "weight-slips" | "driver-licenses" | "vehicle-rc" | "truck-images" | "pods" | "bilties",
  label: "Invoice" | "Weight slip" | "Driver license" | "Vehicle RC" | "Truck image" | "GRN/POD" | "Bilty"
) {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
  if (!allowedTypes.has(value.type)) {
    throw new Error(`${label} upload must be a PDF, JPG, PNG, or WebP file.`);
  }

  const maxUploadMegabytes = 15;
  const maxUploadBytes = maxUploadMegabytes * 1024 * 1024;
  if (value.size > maxUploadBytes) {
    throw new Error(`${label} upload must be ${maxUploadMegabytes} MB or smaller.`);
  }

  const uploadDir = path.join(/* turbopackIgnore: true */ process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });

  const fileName = `${shipmentId}-${Date.now()}-${safeFileName(value.name, label.toLowerCase().replace(" ", "-"))}`;
  await writeFile(path.join(uploadDir, fileName), Buffer.from(await value.arrayBuffer()));
  return `/uploads/${folder}/${fileName}`;
}

async function getOwnedQuoteRequest(quoteRequestId: string, vendorPath: string) {
  const quoteRequest = await prisma.quoteRequest.findFirst({
    where: {
      id: quoteRequestId,
      accessToken: vendorPath.split("/").at(-1) ?? ""
    },
    include: {
      request: { include: { company: true } },
      transporter: true
    }
  });

  if (!quoteRequest) {
    return null;
  }

  return { quoteRequest };
}

export async function askQuoteQuestion(_state: VendorPortalState, formData: FormData): Promise<VendorPortalState> {
  const quoteRequestId = required(formData, "quoteRequestId");
  const question = required(formData, "question");
  const token = required(formData, "token");
  const vendorPath = `/vendor/quote/${token}`;

  if (!question) {
    return { error: "Please enter your question." };
  }

  const context = await getOwnedQuoteRequest(quoteRequestId, vendorPath);
  if (!context) {
    return { error: "Quote request was not found for this vendor." };
  }

  const companyTransporter = await prisma.companyTransporter.findUnique({
    where: {
      companyId_transporterId: {
        companyId: context.quoteRequest.companyId,
        transporterId: context.quoteRequest.transporterId
      }
    },
    select: { isBlacklisted: true }
  });

  if (companyTransporter?.isBlacklisted) {
    return { error: "This vendor is currently blacklisted and cannot submit quotes." };
  }

  const quoteCount = await prisma.quote.count({
    where: {
      requestId: context.quoteRequest.requestId,
      transporterId: context.quoteRequest.transporterId
    }
  });

  if (quoteCount >= 2) {
    return { error: "Only 2 quotes can be submitted for this shipment." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.quoteRequest.update({
      where: { id: quoteRequestId },
      data: {
        status: "QUESTION",
        question,
        questionAt: new Date()
      }
    });

    await tx.auditEvent.create({
      data: {
        companyId: context.quoteRequest.companyId,
        requestId: context.quoteRequest.requestId,
        actorType: "vendor_user",
        actorName: context.quoteRequest.transporter.name,
        action: "quote_request.question_asked",
        details: {
          transporter: context.quoteRequest.transporter.name,
          question
        }
      }
    });

    await tx.notification.create({
      data: {
        companyId: context.quoteRequest.companyId,
        requestId: context.quoteRequest.requestId,
        recipientType: "ADMIN",
        title: "Bid submitted",
        body: `${context.quoteRequest.transporter.name} submitted a bid.`,
        action: "quote.submitted"
      }
    });
  });

  revalidatePath(vendorPath);
  revalidatePath("/");
  return { success: "Question sent to the company team." };
}

export async function submitFinalQuote(_state: VendorPortalState, formData: FormData): Promise<VendorPortalState> {
  const quoteRequestId = required(formData, "quoteRequestId");
  const token = required(formData, "token");
  const amountPaise = parseMoneyPaise(required(formData, "amount"));
  const vendorPath = `/vendor/quote/${token}`;

  if (!amountPaise || amountPaise <= 0) {
    return { error: "Please enter the quote price." };
  }

  const context = await getOwnedQuoteRequest(quoteRequestId, vendorPath);
  if (!context) {
    return { error: "Quote request was not found for this vendor." };
  }

  await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.create({
      data: {
        companyId: context.quoteRequest.companyId,
        requestId: context.quoteRequest.requestId,
        transporterId: context.quoteRequest.transporterId,
        amountPaise,
        truckType: null,
        availabilityDate: null,
        estimatedTransitDays: null,
        paymentTerms: null,
        receivedVia: "vendor_portal",
        notes: null
      }
    });

    await tx.quoteRequest.update({
      where: { id: quoteRequestId },
      data: {
        status: "FINAL_QUOTE",
        finalQuoteId: quote.id
      }
    });

    await tx.transportRequest.update({
      where: { id: context.quoteRequest.requestId },
      data: { status: "QUOTED" }
    });

    await tx.auditEvent.create({
      data: {
        companyId: context.quoteRequest.companyId,
        requestId: context.quoteRequest.requestId,
        actorType: "vendor_user",
        actorName: context.quoteRequest.transporter.name,
        action: "quote.final_submitted",
        details: {
          transporter: context.quoteRequest.transporter.name,
          amountPaise
        }
      }
    });
  });

  revalidatePath(vendorPath);
  revalidatePath("/");
  revalidatePath("/quotes");
  revalidatePath("/requests");
  return { success: "Final quote submitted." };
}

export async function updateVendorOrder(_state: VendorPortalState, formData: FormData): Promise<VendorPortalState> {
  const accessToken = required(formData, "accessToken");
  const nextStatus = required(formData, "status");
  const vendorPath = `/vendor/order/${accessToken}`;

  const quoteRequest = await prisma.quoteRequest.findUnique({
    where: { accessToken },
    select: { requestId: true, transporterId: true }
  });

  if (!quoteRequest) {
    return { error: "Secure order link is invalid." };
  }

  const shipment = await prisma.shipment.findFirst({
    where: {
      requestId: quoteRequest.requestId,
      transporterId: quoteRequest.transporterId
    },
    include: { request: { include: { quoteRequests: true } }, transporter: true, deliveryStops: true }
  });

  if (!shipment) {
    return { error: "Order was not found for this vendor." };
  }

  if (nextStatus) {
    return { error: "Transporter cannot directly change shipment status. Please upload the requested documents only." };
  }

  if (shipment.status === "PLANNED" || shipment.status === "ORDER_CONFIRMED") {
    const vehicleNumber = required(formData, "vehicleNumber").toUpperCase();
    const driverName = required(formData, "driverName");
    const driverPhone = normalizeIndianMobile(required(formData, "driverPhone"));

    if (!vehicleNumber || !driverName || !/^\+91\d{10}$/.test(driverPhone)) {
      return { error: "Driver name, 10 digit driver mobile, and truck number are required." };
    }

    let driverLicenseDocumentUrl: string | null = null;
    let vehicleRcDocumentUrl: string | null = null;
    let truckImageUrl: string | null = null;

    try {
      driverLicenseDocumentUrl = await saveShipmentUpload(shipment.id, formData.get("driverLicenseFile"), "driver-licenses", "Driver license");
      vehicleRcDocumentUrl = await saveShipmentUpload(shipment.id, formData.get("vehicleRcFile"), "vehicle-rc", "Vehicle RC");
      truckImageUrl = await saveShipmentUpload(shipment.id, formData.get("truckImageFile"), "truck-images", "Truck image");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Document upload failed." };
    }

    if (!driverLicenseDocumentUrl || !vehicleRcDocumentUrl || !truckImageUrl) {
      return { error: "Driver license, vehicle RC, and truck image are required." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          vehicleNumber,
          driverName,
          driverPhone,
          driverLicenseDocumentUrl,
          vehicleRcDocumentUrl,
          truckImageUrl,
          driverDetailsSubmittedAt: new Date(),
          status: "ADMIN_APPROVAL_REQUIRED"
        }
      });

      await tx.auditEvent.create({
        data: {
          companyId: shipment.companyId,
          requestId: shipment.requestId,
          actorType: "vendor_user",
          actorName: shipment.transporter.name,
          action: "shipment.driver_details_submitted",
          details: {
            transporter: shipment.transporter.name,
            vehicleNumber,
            driverName,
            driverPhone,
            driverLicenseDocumentUrl,
            vehicleRcDocumentUrl,
            truckImageUrl
          }
        }
      });

      await tx.notification.create({
        data: {
          companyId: shipment.companyId,
          requestId: shipment.requestId,
          shipmentId: shipment.id,
          recipientType: "ADMIN",
          title: "Driver details submitted",
          body: `${shipment.transporter.name} submitted driver and vehicle documents for approval.`,
          action: "shipment.driver_details_submitted"
        }
      });
    });

    revalidatePath(vendorPath);
    revalidatePath("/requests");
    revalidatePath("/shipments");
    return { success: "Driver and vehicle details submitted for admin verification." };
  }

  if (["IN_TRANSIT", "BILTY_UPLOADED", "POD_UPLOADED", "POD_APPROVED", "ADMIN_APPROVAL_REQUIRED"].includes(shipment.status)) {
    const deliveryStopId = required(formData, "deliveryStopId");
    const deliveryStop = shipment.deliveryStops.find((stop) => stop.id === deliveryStopId);

    if (!deliveryStop) {
      return { error: "Select a valid delivery stop." };
    }

    let podDocumentUrl: string | null = null;
    let biltyDocumentUrl: string | null = null;

    try {
      biltyDocumentUrl = await saveShipmentUpload(shipment.id, formData.get("biltyFile"), "bilties", "Bilty");
      podDocumentUrl = await saveShipmentUpload(shipment.id, formData.get("podFile"), "pods", "GRN/POD");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Delivery document upload failed." };
    }

    if (!biltyDocumentUrl || !podDocumentUrl) {
      return { error: "Bilty and GRN/POD uploads are both required for delivery completion." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.shipmentDeliveryStop.update({
        where: { id: deliveryStopId },
        data: {
          biltyDocumentUrl,
          biltyUploadedAt: new Date(),
          podDocumentUrl,
          podUploadedAt: new Date(),
          completedAt: null
        }
      });

      const remainingWithoutPod = await tx.shipmentDeliveryStop.count({
        where: {
          shipmentId: shipment.id,
          OR: [{ podDocumentUrl: null }, { biltyDocumentUrl: null }]
        }
      });

      await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: remainingWithoutPod === 0 ? "ADMIN_APPROVAL_REQUIRED" : "POD_UPLOADED"
        }
      });

      await tx.auditEvent.create({
        data: {
          companyId: shipment.companyId,
          requestId: shipment.requestId,
          actorType: "vendor_user",
          actorName: shipment.transporter.name,
          action: "shipment.delivery_documents_uploaded",
          details: {
            transporter: shipment.transporter.name,
            deliveryStopId,
            city: deliveryStop.city,
            consigneeName: deliveryStop.consigneeName,
            biltyDocumentUrl,
            podDocumentUrl,
            allDeliveryUploadsCompleted: remainingWithoutPod === 0
          }
        }
      });

      await tx.notification.create({
        data: {
          companyId: shipment.companyId,
          requestId: shipment.requestId,
          shipmentId: shipment.id,
          recipientType: "ADMIN",
          title: "Bilty and POD uploaded",
          body: `${deliveryStop.consigneeName ?? `Delivery ${deliveryStop.stopIndex}`} Bilty and POD were uploaded and need approval.`,
          action: "shipment.delivery_documents_uploaded"
        }
      });
    });

    revalidatePath(vendorPath);
    revalidatePath("/requests");
    revalidatePath("/shipments");
    return { success: "Delivery Bilty and POD uploaded." };
  }

  if (shipment.status === "FINAL_DELIVERY_APPROVED") {
    const invoiceNumber = required(formData, "invoiceNumber");
    const invoiceAmountPaise = parseMoneyPaise(required(formData, "invoiceAmount"));
    let uploadedInvoiceUrl: string | null = null;

    if (!invoiceNumber || !invoiceAmountPaise) {
      return { error: "Invoice number and amount are required." };
    }

    try {
      uploadedInvoiceUrl = await saveShipmentUpload(shipment.id, formData.get("invoiceFile"), "invoices", "Invoice");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Invoice upload failed." };
    }

    if (!uploadedInvoiceUrl) {
      return { error: "Invoice PDF/photo is required." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          invoiceNumber,
          invoiceAmountPaise,
          invoiceDocumentUrl: uploadedInvoiceUrl,
          invoiceSubmittedAt: new Date(),
          status: "INVOICE_SUBMITTED"
        }
      });

      await tx.auditEvent.create({
        data: {
          companyId: shipment.companyId,
          requestId: shipment.requestId,
          actorType: "vendor_user",
          actorName: shipment.transporter.name,
          action: "shipment.invoice_submitted",
          details: {
            transporter: shipment.transporter.name,
            invoiceNumber,
            invoiceAmountPaise,
            invoiceDocumentUrl: uploadedInvoiceUrl
          }
        }
      });

      await tx.notification.create({
        data: {
          companyId: shipment.companyId,
          requestId: shipment.requestId,
          shipmentId: shipment.id,
          recipientType: "ADMIN",
          title: "Invoice uploaded",
          body: `${shipment.transporter.name} uploaded invoice ${invoiceNumber}.`,
          action: "shipment.invoice_submitted"
        }
      });
    });

    revalidatePath(vendorPath);
    revalidatePath("/requests");
    revalidatePath("/shipments");
    return { success: "Invoice submitted for payment verification." };
  }

  return { error: "No vendor upload is available at this stage. Please wait for admin approval." };
}

export async function goToOrder(formData: FormData) {
  const accessToken = required(formData, "accessToken");
  redirect(`/vendor/order/${accessToken}`);
}
