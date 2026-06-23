"use client";

import { useActionState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import {
  confirmWhatsAppTest,
  sendWhatsAppTestMessage,
  type WhatsAppTestState
} from "@/app/actions/whatsapp-settings";

const initialState: WhatsAppTestState = {};

type WhatsAppTestPanelProps = {
  defaultRecipientNumber: string;
  lastTestStatus?: string | null;
  lastTestError?: string | null;
  lastTestSentAt?: string | null;
  confirmedAt?: string | null;
  confirmedByName?: string | null;
};

export function WhatsAppTestPanel({
  defaultRecipientNumber,
  lastTestStatus,
  lastTestError,
  lastTestSentAt,
  confirmedAt,
  confirmedByName
}: WhatsAppTestPanelProps) {
  const [state, formAction, isPending] = useActionState(sendWhatsAppTestMessage, initialState);
  const canConfirm = lastTestStatus === "SENT" && !confirmedAt;

  return (
    <div className="test-panel">
      <div className="panel-title">
        <h2>
          <Send size={18} aria-hidden="true" />
          Validate with test message
        </h2>
        <span className={`status ${confirmedAt ? "approved" : lastTestStatus === "FAILED" ? "rejected" : "quoted"}`}>
          {confirmedAt ? "CONFIRMED" : lastTestStatus ?? "NOT TESTED"}
        </span>
      </div>

      <form className="inline-grid-form test-message-form" action={formAction}>
        <label>
          Send test to
          <input name="testRecipientNumber" defaultValue={defaultRecipientNumber} placeholder="+919602702231" />
        </label>
        <button className="button primary" type="submit" disabled={isPending}>
          <Send size={16} aria-hidden="true" />
          {isPending ? "Sending..." : "Send test"}
        </button>
      </form>

      {canConfirm ? (
        <form action={confirmWhatsAppTest}>
          <button className="button" type="submit">
            <CheckCircle2 size={16} aria-hidden="true" />
            I received the test message
          </button>
        </form>
      ) : null}

      {lastTestSentAt ? <p className="muted">Last test: {lastTestSentAt}</p> : null}
      {confirmedAt ? (
        <p className="form-success">
          Test confirmed by {confirmedByName ?? "admin"} at {confirmedAt}.
        </p>
      ) : null}
      {lastTestError ? <p className="form-error">{lastTestError}</p> : null}
      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}
    </div>
  );
}
