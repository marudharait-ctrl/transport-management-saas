"use server";

import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildQuoteRequestMessage } from "@/lib/quote-message";

const execFileAsync = promisify(execFile);

function parseJsonOutput(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return { raw: value };
  }
}

function openclawInvocation(args: string[]) {
  if (process.env.OPENCLAW_CLI_PATH) {
    return {
      command: process.env.OPENCLAW_CLI_PATH,
      args
    };
  }

  if (process.platform === "win32") {
    return {
      command: "node",
      args: [path.join(process.env.APPDATA ?? "", "npm", "node_modules", "openclaw", "openclaw.mjs"), ...args]
    };
  }

  return {
    command: "openclaw",
    args
  };
}

export async function sendQuoteRequest(formData: FormData) {
  const user = await requireUser();
  const quoteRequestId = String(formData.get("quoteRequestId") ?? "");

  if (!quoteRequestId) {
    return;
  }

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

  if (!quoteRequest || quoteRequest.status === "SENT") {
    return;
  }

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
    material: quoteRequest.request.material,
    quantity: quoteRequest.request.quantity,
    truckRequirement: quoteRequest.request.truckRequirement,
    pickupDate: quoteRequest.request.pickupDate,
    targetDeliveryDate: quoteRequest.request.targetDeliveryDate,
    notes: quoteRequest.request.notes
  });

  try {
    const invocation = openclawInvocation([
        "message",
        "send",
        "--channel",
        "whatsapp",
        "--target",
        quoteRequest.transporter.primaryPhone,
        "--message",
        message,
        "--json"
      ]);
    const { stdout } = await execFileAsync(
      invocation.command,
      invocation.args,
      {
        timeout: 30000,
        windowsHide: true,
        maxBuffer: 1024 * 1024
      }
    );

    await prisma.$transaction([
      prisma.quoteRequest.update({
        where: { id: quoteRequest.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
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
            cliResult: stdout ? parseJsonOutput(stdout) : null
          }
        }
      })
    ]);
  } catch (error) {
    await prisma.$transaction([
      prisma.quoteRequest.update({
        where: { id: quoteRequest.id },
        data: { status: "FAILED" }
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
            error: error instanceof Error ? error.message : String(error)
          }
        }
      })
    ]);
  }

  revalidatePath("/");
}
