"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { sendBaileysTextMessage } from "@/lib/baileys-session";
import { normalizeIndianMobile } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export type WhatsAppSettingsState = {
  error?: string;
  success?: string;
};

export type WhatsAppTestState = {
  error?: string;
  success?: string;
};

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function normalizeOptionalIndianNumber(value: string) {
  if (!value) {
    return null;
  }

  const normalized = normalizeIndianMobile(value);
  if (!/^\+91\d{10}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

export async function saveWhatsAppSettings(
  _state: WhatsAppSettingsState,
  formData: FormData
): Promise<WhatsAppSettingsState> {
  const admin = await requireAdmin();
  const provider = clean(formData.get("provider"));
  const senderNumber = normalizeOptionalIndianNumber(clean(formData.get("senderNumber")));
  const openclawAccountId = clean(formData.get("openclawAccountId")) || null;
  const baileysSessionName = clean(formData.get("baileysSessionName")) || null;
  const notes = clean(formData.get("notes")) || null;

  if (!["OPENCLAW", "BAILEYS"].includes(provider)) {
    return { error: "Choose OpenClaw or the configured WhatsApp number as the provider." };
  }

  if (!senderNumber) {
    return { error: "Enter a valid Indian WhatsApp sender number. Example: 9602702231 or +919602702231." };
  }

  if (provider === "OPENCLAW" && !openclawAccountId) {
    return { error: "OpenClaw setup is missing. Please contact support." };
  }

  if (provider === "BAILEYS" && !baileysSessionName) {
    return { error: "WhatsApp setup is missing. Please contact support." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.companyWhatsAppSetting.upsert({
      where: { companyId: admin.companyId },
      update: {
        provider,
        senderNumber,
        openclawAccountId,
        baileysSessionName,
        baileysEnabled: provider === "BAILEYS",
        notes
      },
      create: {
        companyId: admin.companyId,
        provider,
        activeProvider: "OPENCLAW",
        senderNumber,
        openclawAccountId,
        baileysSessionName,
        baileysEnabled: provider === "BAILEYS",
        notes
      }
    });

    await tx.auditEvent.create({
      data: {
        companyId: admin.companyId,
        actorType: "company_user",
        actorName: admin.name,
        action: "whatsapp_settings.updated",
        details: {
          provider,
          senderNumber,
          openclawAccountId,
          baileysSessionName,
          note: "Configuration saved only. Message delivery code remains unchanged until explicit switch-over."
        }
      }
    });
  });

  revalidatePath("/");
  revalidatePath("/admin/whatsapp");
  return { success: "WhatsApp settings saved. Existing notifications are still using the current OpenClaw sender path." };
}

export async function sendWhatsAppTestMessage(
  _state: WhatsAppTestState,
  formData: FormData
): Promise<WhatsAppTestState> {
  const admin = await requireAdmin();
  const recipientNumber = normalizeOptionalIndianNumber(clean(formData.get("testRecipientNumber")));

  if (!recipientNumber) {
    return { error: "Enter a valid Indian WhatsApp number for the test recipient." };
  }

  const setting = await prisma.companyWhatsAppSetting.findUnique({
    where: { companyId: admin.companyId }
  });

  if (!setting?.baileysSessionName || !setting.senderNumber) {
    return { error: "Save the WhatsApp sender number before sending a test." };
  }

  const testMessage = [
    "Marudhara TMS WhatsApp test message.",
    `Sender configured: ${setting.senderNumber}`,
    `Sent by: ${admin.name}`,
    `Time: ${new Date().toLocaleString("en-IN")}`
  ].join("\n");

  try {
    const result = await sendBaileysTextMessage(setting.baileysSessionName, recipientNumber, testMessage);
    await prisma.companyWhatsAppSetting.update({
      where: { companyId: admin.companyId },
      data: {
        testRecipientNumber: recipientNumber,
        lastTestSentAt: new Date(),
        lastTestStatus: "SENT",
        lastTestError: null,
        notes: setting.notes
      }
    });

    await prisma.auditEvent.create({
      data: {
        companyId: admin.companyId,
        actorType: "company_user",
        actorName: admin.name,
        action: "whatsapp_settings.test_sent",
        details: {
          provider: "BAILEYS",
          senderNumber: setting.senderNumber,
          recipientNumber,
          baileysSessionName: setting.baileysSessionName,
          result: {
            messageId: result?.key?.id,
            remoteJid: result?.key?.remoteJid,
            status: "accepted"
          }
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.companyWhatsAppSetting.update({
      where: { companyId: admin.companyId },
      data: {
        testRecipientNumber: recipientNumber,
        lastTestSentAt: new Date(),
        lastTestStatus: "FAILED",
        lastTestError: message
      }
    });

    revalidatePath("/admin/whatsapp");
    return { error: message };
  }

  revalidatePath("/admin/whatsapp");
  return { success: `Test message sent to ${recipientNumber}. Confirm it after you receive it on WhatsApp.` };
}

export async function confirmWhatsAppTest(formData: FormData) {
  const admin = await requireAdmin();
  const setting = await prisma.companyWhatsAppSetting.findUnique({
    where: { companyId: admin.companyId }
  });

  if (!setting || setting.lastTestStatus !== "SENT") {
    return;
  }

  await prisma.companyWhatsAppSetting.update({
    where: { companyId: admin.companyId },
    data: {
      baileysConfirmedAt: new Date(),
      baileysConfirmedByName: admin.name
    }
  });

  await prisma.auditEvent.create({
    data: {
      companyId: admin.companyId,
      actorType: "company_user",
      actorName: admin.name,
      action: "whatsapp_settings.test_confirmed",
      details: {
        provider: "BAILEYS",
        senderNumber: setting.senderNumber,
        testRecipientNumber: setting.testRecipientNumber,
        baileysSessionName: setting.baileysSessionName
      }
    }
  });

  revalidatePath("/admin/whatsapp");
}

export async function setActiveWhatsAppProvider(formData: FormData) {
  const admin = await requireAdmin();
  const activeProvider = clean(formData.get("activeProvider"));

  if (!["OPENCLAW", "BAILEYS"].includes(activeProvider)) {
    return;
  }

  const setting = await prisma.companyWhatsAppSetting.findUnique({
    where: { companyId: admin.companyId }
  });

  if (!setting) {
    return;
  }

  if (activeProvider === "BAILEYS" && !setting.baileysConfirmedAt) {
    return;
  }

  await prisma.companyWhatsAppSetting.update({
    where: { companyId: admin.companyId },
    data: { activeProvider }
  });

  await prisma.auditEvent.create({
    data: {
      companyId: admin.companyId,
      actorType: "company_user",
      actorName: admin.name,
      action: "whatsapp_settings.active_provider_changed",
      details: {
        activeProvider,
        senderNumber: setting.senderNumber,
        baileysSessionName: setting.baileysSessionName
      }
    }
  });

  revalidatePath("/admin/whatsapp");
}
