"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildQuoteRequestMessage } from "@/lib/quote-message";
import { formatRouteLabel, formatTransporterRoute, parseRouteStops } from "@/lib/route-stops";
import { vendorQuoteUrl } from "@/lib/vendor-links";

export async function sendQuoteRequest(formData: FormData) {
  const user = await requireUser();
  const quoteRequestId = String(formData.get("quoteRequestId") ?? "");

  if (!quoteRequestId) {
    return;
  }

  await sendQuoteRequestNotification(quoteRequestId, user);

  revalidatePath("/");
  revalidatePath("/requests");
}

export async function sendQuoteRequestNotification(
  quoteRequestId: string,
  user: Awaited<ReturnType<typeof requireUser>>
) {
  const quoteRequest = await prisma.quoteRequest.findFirst({
    where: {
      id: quoteRequestId,
      companyId: user.companyId
    },
    include: {
      transporter: true,
      request: {
        include: {
          company: true,
          requestedBy: true
        }
      }
    }
  });

  if (!quoteRequest) {
    return;
  }

  const routeStops = parseRouteStops(
    quoteRequest.request.routeStops,
    quoteRequest.request.pickupCity,
    quoteRequest.request.dropCity
  );

  const message = buildQuoteRequestMessage({
    companyName: quoteRequest.request.company.name,
    requestNumber: quoteRequest.request.requestNumber,
    requestDate: quoteRequest.request.createdAt,
    requestedByName: quoteRequest.request.requestedBy.name,
    title: quoteRequest.request.title,
    loadType: quoteRequest.request.loadType,
    status: quoteRequest.request.status,
    pickupCity: quoteRequest.request.pickupCity,
    pickupState: quoteRequest.request.pickupState,
    pickupPincode: quoteRequest.request.pickupPincode,
    dropCity: quoteRequest.request.dropCity,
    dropState: quoteRequest.request.dropState,
    dropPincode: quoteRequest.request.dropPincode,
    routeLabel: formatRouteLabel(routeStops),
    routeSummary: formatTransporterRoute(routeStops),
    material: quoteRequest.request.material,
    quantity: quoteRequest.request.quantity,
    truckRequirement: quoteRequest.request.truckRequirement,
    pickupDate: quoteRequest.request.pickupDate,
    targetDeliveryDate: quoteRequest.request.targetDeliveryDate,
    notes: quoteRequest.request.notes,
    quoteUrl: vendorQuoteUrl(quoteRequest.accessToken)
  });

  await prisma.auditEvent.create({
    data: {
      companyId: user.companyId,
      requestId: quoteRequest.requestId,
      actorType: "company_user",
      actorName: user.name,
      action: "quote_broadcast.attempted",
      details: {
        channel: "whatsapp",
        transporter: quoteRequest.transporter.name,
        primaryPhone: quoteRequest.transporter.primaryPhone,
        previousStatus: quoteRequest.status
      }
    }
  });

  try {
    const { sendWhatsAppMessage } = await import("@/lib/openclaw-whatsapp");
    const cliResult = await sendWhatsAppMessage(quoteRequest.transporter.primaryPhone, message);
    const deliveredAt = new Date();

    await prisma.$transaction([
      prisma.quoteRequest.update({
        where: { id: quoteRequest.id },
        data: {
          status: "DELIVERED",
          sentAt: deliveredAt,
          deliveredAt,
          failedAt: null,
          lastError: null,
          message
        }
      }),
      prisma.auditEvent.create({
        data: {
          companyId: user.companyId,
          requestId: quoteRequest.requestId,
          actorType: "company_user",
          actorName: user.name,
          action: "quote_broadcast.sent",
          details: {
            channel: "whatsapp",
            transporter: quoteRequest.transporter.name,
            primaryPhone: quoteRequest.transporter.primaryPhone,
            previousStatus: quoteRequest.status,
            cliResult
          }
        }
      }),
      prisma.auditEvent.create({
        data: {
          companyId: user.companyId,
          requestId: quoteRequest.requestId,
          actorType: "system",
          actorName: "Garud WhatsApp Sender",
          action: "quote_broadcast.delivered",
          details: {
            channel: "whatsapp",
            transporter: quoteRequest.transporter.name,
            primaryPhone: quoteRequest.transporter.primaryPhone,
            deliveredAt: deliveredAt.toISOString()
          }
        }
      })
    ]);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    await prisma.$transaction([
      prisma.quoteRequest.update({
        where: { id: quoteRequest.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          lastError: messageText
        }
      }),
      prisma.auditEvent.create({
        data: {
          companyId: user.companyId,
          requestId: quoteRequest.requestId,
          actorType: "system",
          actorName: "Garud WhatsApp Sender",
          action: "quote_broadcast.failed",
          details: {
            channel: "whatsapp",
            transporter: quoteRequest.transporter.name,
            primaryPhone: quoteRequest.transporter.primaryPhone,
            error: messageText
          }
        }
      })
    ]);
  }
}
