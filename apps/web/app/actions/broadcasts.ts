"use server";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "openclaw.cmd", ...args]
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
      request: true
    }
  });

  if (!quoteRequest || quoteRequest.status === "SENT") {
    return;
  }

  try {
    const invocation = openclawInvocation([
        "message",
        "send",
        "--channel",
        "whatsapp",
        "--target",
        quoteRequest.transporter.primaryPhone,
        "--message",
        quoteRequest.message,
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
          sentAt: new Date()
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
