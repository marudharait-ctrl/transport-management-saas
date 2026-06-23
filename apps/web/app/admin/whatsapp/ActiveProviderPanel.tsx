import { RadioTower, Smartphone } from "lucide-react";
import { setActiveWhatsAppProvider } from "@/app/actions/whatsapp-settings";

type ActiveProviderPanelProps = {
  activeProvider: string;
  isBaileysConfirmed: boolean;
  senderNumber: string;
};

export function ActiveProviderPanel({
  activeProvider,
  isBaileysConfirmed,
  senderNumber
}: ActiveProviderPanelProps) {
  const providerLabel = activeProvider === "BAILEYS" ? "WHATSAPP NUMBER" : "OPENCLAW";

  return (
    <div className="active-provider-panel">
      <div className="panel-title">
        <h2>Active sending provider</h2>
        <span className={`status ${activeProvider === "BAILEYS" ? "quoted" : "approved"}`}>{providerLabel}</span>
      </div>

      <form className="provider-switch-form" action={setActiveWhatsAppProvider}>
        <label className="provider-choice">
          <input name="activeProvider" type="radio" value="OPENCLAW" defaultChecked={activeProvider !== "BAILEYS"} />
          <span className="option-icon">
            <RadioTower size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>Use OpenClaw</strong>
            <small>Current WhatsApp gateway</small>
          </span>
        </label>

        <label className={`provider-choice ${isBaileysConfirmed ? "" : "disabled-choice"}`}>
          <input
            name="activeProvider"
            type="radio"
            value="BAILEYS"
            defaultChecked={activeProvider === "BAILEYS"}
            disabled={!isBaileysConfirmed}
          />
          <span className="option-icon">
            <Smartphone size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>Use configured WhatsApp number</strong>
            <small>{isBaileysConfirmed ? senderNumber : "Send and confirm a test message first"}</small>
          </span>
        </label>

        <button className="button primary" type="submit">
          Save active provider
        </button>
      </form>

      <p className="muted">
        This selection is stored separately from QR pairing and testing. The RFQ sender can be wired to this active
        provider after explicit cutover approval.
      </p>
    </div>
  );
}
