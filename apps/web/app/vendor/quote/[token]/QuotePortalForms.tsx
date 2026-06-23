"use client";

import { useActionState } from "react";
import { askQuoteQuestion, submitFinalQuote, type VendorPortalState } from "@/app/actions/vendor-portal";
import { HelpCircle, Send } from "lucide-react";

const initialState: VendorPortalState = {};

export function QuoteQuestionForm({ quoteRequestId, token }: { quoteRequestId: string; token: string }) {
  const [state, formAction, isPending] = useActionState(askQuoteQuestion, initialState);

  return (
    <form className="stack-form vendor-subform" action={formAction}>
      <input name="quoteRequestId" type="hidden" value={quoteRequestId} />
      <input name="token" type="hidden" value={token} />
      <label>
        Ask a question
        <textarea name="question" rows={3} placeholder="Ask about loading time, material, route, or payment terms" required />
      </label>
      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}
      <button className="button" type="submit" disabled={isPending}>
        <HelpCircle size={16} aria-hidden="true" />
        {isPending ? "Sending..." : "Send question"}
      </button>
    </form>
  );
}

export function FinalQuoteForm({ quoteRequestId, token }: { quoteRequestId: string; token: string }) {
  const [state, formAction, isPending] = useActionState(submitFinalQuote, initialState);

  return (
    <form className="stack-form vendor-subform" action={formAction}>
      <input name="quoteRequestId" type="hidden" value={quoteRequestId} />
      <input name="token" type="hidden" value={token} />
      <label>
        Quote price
        <input name="amount" inputMode="decimal" placeholder="48500" required />
      </label>
      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}
      <div className="form-actions vendor-actions">
        <button className="button primary" type="submit" disabled={isPending}>
          <Send size={16} aria-hidden="true" />
          {isPending ? "Submitting..." : "Submit final quote"}
        </button>
      </div>
    </form>
  );
}
