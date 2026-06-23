"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRouteLabel, parseRouteStops, sourceUnitOptions } from "@/lib/route-stops";
import { vendorOrderUrl } from "@/lib/vendor-links";

const formatMoney = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const formatDate = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata"
});

function buildQuoteApprovedMessage({
  companyName,
  requestNumber,
  title,
  route,
  amount,
  pickupDate,
  orderUrl
}: {
  companyName: string;
  requestNumber: string;
  title: string;
  route: string;
  amount: string;
  pickupDate: string;
  orderUrl: string;
}) {
  return [
    `Quote approved - ${companyName}`,
    "",
    `Request: ${requestNumber}`,
    `Load: ${title}`,
    `Route: ${route}`,
    `Approved amount: ${amount}`,
    `Pickup date: ${pickupDate}`,
    "",
    "Please open the order link and update truck, driver, pickup, and invoice details:",
    orderUrl
  ].join("\n");
}

export async function approveQuote(formData: FormData) {
  const user = await requireUser();
  const quoteId = String(formData.get("quoteId") ?? "");

  const quote = await prisma.quote.findFirst({
    where: {
      id: quoteId,
      companyId: user.companyId
    },
    include: {
      request: true,
      transporter: true
    }
  });

  if (!quote) {
    return;
  }

  const routeStops = parseRouteStops(quote.request.routeStops, quote.request.pickupCity, quote.request.dropCity);
  const sourceUnitNames = new Set<string>(sourceUnitOptions.map((unit) => unit.name));
  const firstDeliveryIndex = routeStops.findIndex((stop, index) => index > 0 && !sourceUnitNames.has(stop.consigneeName ?? ""));
  const loadingRouteStops = routeStops.slice(0, firstDeliveryIndex === -1 ? 1 : Math.max(1, firstDeliveryIndex));
  const deliveryRouteStops = routeStops.slice(loadingRouteStops.length);
  const loadingStops = loadingRouteStops.map((stop, index) => ({
    pointIndex: index + 1,
    label: stop.consigneeName ?? `Loading Point ${index + 1}`,
    city: stop.city,
    pincode: stop.pincode ?? null,
    address: stop.address || null,
    isFinal: index === loadingRouteStops.length - 1
  }));
  const deliveryStops = deliveryRouteStops.map((stop, index) => ({
    stopIndex: index + 1,
    consigneeName: stop.consigneeName ?? null,
    city: stop.city,
    pincode: stop.pincode ?? null,
    address: stop.address || null
  }));

  const approval = await prisma.$transaction(async (tx) => {
    const rejectedQuotes = await tx.quote.findMany({
      where: {
        requestId: quote.requestId,
        id: { not: quote.id },
        status: { not: "REJECTED" }
      },
      include: { transporter: true }
    });

    await tx.quote.updateMany({
      where: {
        requestId: quote.requestId,
        id: { not: quote.id }
      },
      data: { status: "REJECTED" }
    });

    await tx.quote.update({
      where: { id: quote.id },
      data: { status: "APPROVED" }
    });

    await tx.transportRequest.update({
      where: { id: quote.requestId },
      data: {
        status: "APPROVED",
        approvedById: user.id
      }
    });

    const shipment = await tx.shipment.upsert({
      where: { requestId: quote.requestId },
      create: {
        companyId: user.companyId,
        requestId: quote.requestId,
        transporterId: quote.transporterId,
        status: "ORDER_CONFIRMED"
      },
      update: {
        transporterId: quote.transporterId,
        status: "ORDER_CONFIRMED"
      }
    });

    const approvedQuoteRequest = await tx.quoteRequest.findUnique({
      where: {
        requestId_transporterId: {
          requestId: quote.requestId,
          transporterId: quote.transporterId
        }
      },
      select: { accessToken: true }
    });

    await tx.shipmentDeliveryStop.deleteMany({
      where: { shipmentId: shipment.id }
    });
    await tx.shipmentLoadingPoint.deleteMany({
      where: { shipmentId: shipment.id }
    });

    await tx.shipmentLoadingPoint.createMany({
      data: (loadingStops.length > 0
        ? loadingStops
        : [
            {
              pointIndex: 1,
              label: "Loading Point 1",
              city: quote.request.pickupCity,
              pincode: quote.request.pickupPincode,
              address: null,
              isFinal: true
            }
          ]
      ).map((stop) => ({
        shipmentId: shipment.id,
        ...stop
      }))
    });

    if (deliveryStops.length > 0) {
      await tx.shipmentDeliveryStop.createMany({
        data: deliveryStops.map((stop) => ({
          shipmentId: shipment.id,
          ...stop
        }))
      });
    }

    await tx.auditEvent.create({
      data: {
        companyId: user.companyId,
        requestId: quote.requestId,
        actorType: "company_user",
        actorName: user.name,
        action: "quote.approved_order_confirmed",
        details: {
          transporter: quote.transporter.name,
          amountPaise: quote.amountPaise,
          orderConfirmation: "prepared"
        }
      }
    });

    const notificationRows: Prisma.NotificationCreateManyInput[] = [
        {
          companyId: user.companyId,
          requestId: quote.requestId,
          shipmentId: shipment.id,
          recipientType: "ADMIN",
          title: "Shipment created",
          body: `${quote.transporter.name} shipment was created after bid approval.`,
          action: "shipment.created"
        },
        {
          companyId: user.companyId,
          requestId: quote.requestId,
          shipmentId: shipment.id,
          transporterId: quote.transporterId,
          recipientType: "VENDOR",
          title: "Quote approved",
          body: "Your bid was approved and shipment workflow has started.",
          action: "quote.approved"
        }
      ];

    notificationRows.push(
      ...rejectedQuotes.map((rejectedQuote): Prisma.NotificationCreateManyInput => ({
          companyId: user.companyId,
          requestId: quote.requestId,
          transporterId: rejectedQuote.transporterId,
          recipientType: "VENDOR",
          title: "Quote not selected",
          body: `Your quote for Request No. ${quote.request.requestNumber} was not selected for this shipment. Thank you for participating.`,
          action: "quote.rejected"
        }))
    );

    await tx.notification.createMany({ data: notificationRows });

    return { shipmentId: shipment.id, accessToken: approvedQuoteRequest?.accessToken, rejectedQuotes };
  });

  const approvalMessage = buildQuoteApprovedMessage({
    companyName: user.company.name,
    requestNumber: quote.request.requestNumber,
    title: quote.request.title,
    route: formatRouteLabel(routeStops),
    amount: formatMoney.format(quote.amountPaise / 100),
    pickupDate: formatDate.format(quote.request.pickupDate),
    orderUrl: vendorOrderUrl(approval.accessToken ?? approval.shipmentId)
  });

  try {
    const { sendWhatsAppMessage } = await import("@/lib/openclaw-whatsapp");
    const cliResult = await sendWhatsAppMessage(quote.transporter.primaryPhone, approvalMessage);

    await prisma.auditEvent.create({
      data: {
        companyId: user.companyId,
        requestId: quote.requestId,
        actorType: "system",
        actorName: "Garud WhatsApp Sender",
        action: "quote_approval.whatsapp_sent",
        details: {
          channel: "whatsapp",
          transporter: quote.transporter.name,
          primaryPhone: quote.transporter.primaryPhone,
          shipmentId: approval.shipmentId,
          cliResult
        }
      }
    });
  } catch (error) {
    await prisma.auditEvent.create({
      data: {
        companyId: user.companyId,
        requestId: quote.requestId,
        actorType: "system",
        actorName: "Garud WhatsApp Sender",
        action: "quote_approval.whatsapp_failed",
        details: {
          channel: "whatsapp",
          transporter: quote.transporter.name,
          primaryPhone: quote.transporter.primaryPhone,
          shipmentId: approval.shipmentId,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    });
  }

  const rejectionMessage = `Your quote for Request No. ${quote.request.requestNumber} was not selected for this shipment. Thank you for participating.`;
  for (const rejectedQuote of approval.rejectedQuotes) {
    try {
      const { sendWhatsAppMessage } = await import("@/lib/openclaw-whatsapp");
      const cliResult = await sendWhatsAppMessage(rejectedQuote.transporter.primaryPhone, rejectionMessage);
      await prisma.auditEvent.create({
        data: {
          companyId: user.companyId,
          requestId: quote.requestId,
          actorType: "system",
          actorName: "Garud WhatsApp Sender",
          action: "quote_rejection.whatsapp_sent",
          details: {
            channel: "whatsapp",
            transporter: rejectedQuote.transporter.name,
            primaryPhone: rejectedQuote.transporter.primaryPhone,
            cliResult
          }
        }
      });
    } catch (error) {
      await prisma.auditEvent.create({
        data: {
          companyId: user.companyId,
          requestId: quote.requestId,
          actorType: "system",
          actorName: "Garud WhatsApp Sender",
          action: "quote_rejection.whatsapp_failed",
          details: {
            channel: "whatsapp",
            transporter: rejectedQuote.transporter.name,
            primaryPhone: rejectedQuote.transporter.primaryPhone,
            error: error instanceof Error ? error.message : String(error)
          }
        }
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quote.requestId}`);
  revalidatePath("/requests");
  revalidatePath("/shipments");
}
