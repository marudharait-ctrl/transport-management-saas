"use client";

import { useActionState } from "react";
import { Save, Smartphone } from "lucide-react";
import { saveWhatsAppSettings, type WhatsAppSettingsState } from "@/app/actions/whatsapp-settings";

const initialState: WhatsAppSettingsState = {};

type WhatsAppSettingsFormProps = {
  defaultSenderNumber: string;
  defaultOpenclawAccountId: string;
  defaultBaileysSessionName: string;
  defaultNotes: string;
};

export function WhatsAppSettingsForm({
  defaultSenderNumber,
  defaultOpenclawAccountId,
  defaultBaileysSessionName,
  defaultNotes
}: WhatsAppSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(saveWhatsAppSettings, initialState);

  return (
    <form className="stack-form" action={formAction}>
      <input name="provider" type="hidden" value="BAILEYS" />
      <input name="openclawAccountId" type="hidden" value={defaultOpenclawAccountId} />
      <input name="baileysSessionName" type="hidden" value={defaultBaileysSessionName} />

      <label>
        New WhatsApp sender number
        <input
          name="senderNumber"
          defaultValue={defaultSenderNumber}
          placeholder="+919602702231"
          inputMode="tel"
          required
        />
      </label>

      <label>
        Notes
        <textarea
          name="notes"
          defaultValue={defaultNotes}
          rows={4}
          placeholder="Example: use this number after QR pairing and test delivery."
        />
      </label>

      <div className="settings-callout">
        <Smartphone size={18} aria-hidden="true" />
        <span>
          First save the new WhatsApp number, then generate QR, send a test, confirm receipt, and only then switch the
          active sending provider below.
        </span>
      </div>

      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}

      <button className="button primary" type="submit" disabled={isPending}>
        <Save size={16} aria-hidden="true" />
        {isPending ? "Saving..." : "Save WhatsApp settings"}
      </button>
    </form>
  );
}
