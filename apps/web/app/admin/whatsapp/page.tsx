import Link from "next/link";
import { CheckCircle2, MessageCircle, ShieldAlert } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActiveProviderPanel } from "./ActiveProviderPanel";
import { BaileysQrPanel } from "./BaileysQrPanel";
import { WhatsAppTestPanel } from "./WhatsAppTestPanel";
import { WhatsAppSettingsForm } from "./WhatsAppSettingsForm";

export const dynamic = "force-dynamic";

export default async function WhatsAppSettingsPage() {
  const admin = await requireAdmin();
  const setting = await prisma.companyWhatsAppSetting.findUnique({
    where: { companyId: admin.companyId }
  });

  const activeProvider = setting?.activeProvider ?? "OPENCLAW";
  const senderNumber = setting?.senderNumber ?? process.env.WHATSAPP_CONFIGURED_SENDER ?? "+919602702231";
  const openclawAccountId = setting?.openclawAccountId ?? process.env.OPENCLAW_WHATSAPP_ACCOUNT ?? "saasdev";
  const baileysSessionName = setting?.baileysSessionName ?? "marudhara-main";
  const isBaileysConfirmed = Boolean(setting?.baileysConfirmedAt);

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <span className="eyebrow">Admin settings</span>
            <h1>WhatsApp Delivery</h1>
            <p>Configure the sender number and choose the future notification provider.</p>
          </div>
          <div className="actions">
            <Link className="button" href="/">
              Dashboard
            </Link>
          </div>
        </header>

        <div className="grid">
          <section className="panel">
            <div className="panel-title">
              <h2>
                <MessageCircle size={18} aria-hidden="true" />
                Configure new WhatsApp number
              </h2>
              <span className="status quoted">SETUP</span>
            </div>
            <WhatsAppSettingsForm
              defaultSenderNumber={senderNumber}
              defaultOpenclawAccountId={openclawAccountId}
              defaultBaileysSessionName={baileysSessionName}
              defaultNotes={setting?.notes ?? ""}
            />
          </section>

          <aside className="panel">
            <h2>Current behavior</h2>
            <div className="settings-status-list">
              <div className="settings-status-row">
                <CheckCircle2 size={18} aria-hidden="true" />
                <span>
                  <strong>Live sender path</strong>
                  <small>RFQ notifications still call the existing OpenClaw helper.</small>
                </span>
              </div>
              <div className="settings-status-row">
                <MessageCircle size={18} aria-hidden="true" />
                <span>
                  <strong>Configured WhatsApp number</strong>
                  <small>Configure, scan QR, test, and confirm before using it for live sending.</small>
                </span>
              </div>
              <div className="settings-status-row warning-row">
                <ShieldAlert size={18} aria-hidden="true" />
                <span>
                  <strong>No immediate cutover</strong>
                  <small>Saving a new WhatsApp number does not replace OpenClaw delivery yet.</small>
                </span>
              </div>
            </div>
          </aside>
        </div>

        <section className="panel settings-wide-panel">
          <BaileysQrPanel defaultSessionName={baileysSessionName} />
        </section>

        <section className="panel settings-wide-panel">
          <WhatsAppTestPanel
            defaultRecipientNumber={setting?.testRecipientNumber ?? senderNumber}
            lastTestStatus={setting?.lastTestStatus}
            lastTestError={setting?.lastTestError}
            lastTestSentAt={setting?.lastTestSentAt?.toLocaleString("en-IN") ?? null}
            confirmedAt={setting?.baileysConfirmedAt?.toLocaleString("en-IN") ?? null}
            confirmedByName={setting?.baileysConfirmedByName}
          />
        </section>

        <section className="panel settings-wide-panel">
          <ActiveProviderPanel
            activeProvider={activeProvider}
            isBaileysConfirmed={isBaileysConfirmed}
            senderNumber={senderNumber}
          />
        </section>
      </div>
    </main>
  );
}
