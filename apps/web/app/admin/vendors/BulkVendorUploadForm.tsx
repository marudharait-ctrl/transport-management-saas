"use client";

import { useActionState } from "react";
import { importVendors, type VendorImportState } from "@/app/actions/vendors";

const initialState: VendorImportState = {};

export function BulkVendorUploadForm() {
  const [state, formAction, isPending] = useActionState(importVendors, initialState);

  return (
    <form className="stack-form" action={formAction}>
      <label>
        Excel or CSV file
        <input name="file" type="file" accept=".xlsx,.xls,.csv" required />
      </label>
      <label>
        Default password
        <input name="defaultPassword" type="password" minLength={6} placeholder="One password for all imported vendors" required />
      </label>
      <div className="form-pair">
        <label>
          Base city
          <input name="baseCity" defaultValue="Jodhpur" required />
        </label>
        <label>
          Base state
          <input name="baseState" defaultValue="Rajasthan" required />
        </label>
      </div>
      <div className="upload-help">
        <strong>Required columns</strong>
        <p className="muted">Vendor Name, GSTIN, WhatsApp Number. WhatsApp Number becomes the vendor user ID and +91 is added automatically.</p>
      </div>
      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}
      {state.details && state.details.length > 0 ? (
        <ul className="import-details">
          {state.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
      <button className="button primary" type="submit" disabled={isPending}>
        {isPending ? "Importing..." : "Import vendors"}
      </button>
    </form>
  );
}
