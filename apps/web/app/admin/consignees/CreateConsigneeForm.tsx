"use client";

import { useActionState } from "react";
import { createConsignee, type ConsigneeFormState } from "@/app/actions/consignees";

const initialState: ConsigneeFormState = {};

export function CreateConsigneeForm() {
  const [state, formAction, isPending] = useActionState(createConsignee, initialState);

  return (
    <form className="stack-form" action={formAction}>
      <label>
        Party name
        <input name="name" placeholder="AAIS SPICE FOODS PRIVATE LIMITED" required />
      </label>
      <label>
        Short name optional
        <input name="shortName" placeholder="AAIS SPICE F" />
      </label>
      <label>
        Address line 1
        <input name="addressLine1" placeholder="Factory, warehouse, gate" />
      </label>
      <label>
        Address line 2
        <input name="addressLine2" placeholder="Area, road, industrial estate" />
      </label>
      <label>
        Address line 3
        <input name="addressLine3" placeholder="District, landmark" />
      </label>
      <label>
        City
        <input name="city" placeholder="AURANGABAD" required />
      </label>
      <label>
        PIN code
        <input name="pincode" inputMode="numeric" pattern="[0-9]{6}" placeholder="431007" />
      </label>
      <label>
        State
        <input name="state" placeholder="Maharashtra" />
      </label>
      <label>
        Contact person optional
        <input name="contactPerson" placeholder="Dhairyasheel Wagh" />
      </label>
      <label>
        Mobile optional
        <input name="mobile" inputMode="tel" placeholder="+919876543210" />
      </label>
      <label>
        Email optional
        <input name="email" type="email" placeholder="dispatch@example.com" />
      </label>
      <label>
        GSTIN optional
        <input name="gstin" placeholder="08ABCDE1234F1Z5" />
      </label>
      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}
      <button className="button primary" type="submit" disabled={isPending}>
        {isPending ? "Adding..." : "Add consignee"}
      </button>
    </form>
  );
}
