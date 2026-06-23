"use client";

import { useActionState } from "react";
import { importConsignees, type ConsigneeImportState } from "@/app/actions/consignees";

const initialState: ConsigneeImportState = {};

export function BulkConsigneeUploadForm() {
  const [state, formAction, isPending] = useActionState(importConsignees, initialState);

  return (
    <form className="stack-form" action={formAction}>
      <label>
        Excel or CSV file
        <input name="file" type="file" accept=".xlsx,.xls,.csv" required />
      </label>
      <div className="upload-help">
        <strong>Accepted columns</strong>
        <p className="muted">
          Party name, short name, address line 1, address line 2, address line 3, city, PIN code, state,
          contact person, mobile, email, GSTIN.
        </p>
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
        {isPending ? "Uploading..." : "Upload consignees"}
      </button>
    </form>
  );
}
