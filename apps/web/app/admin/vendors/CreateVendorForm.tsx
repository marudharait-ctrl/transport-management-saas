"use client";

import { useActionState } from "react";
import { createVendor, type VendorFormState } from "@/app/actions/vendors";

const initialState: VendorFormState = {};

export function CreateVendorForm() {
  const [state, formAction, isPending] = useActionState(createVendor, initialState);

  return (
    <form className="stack-form" action={formAction}>
      <label>
        Vendor name
        <input name="name" placeholder="Shree Balaji Transport" required />
      </label>
      <label>
        WhatsApp number
        <input name="primaryPhone" inputMode="tel" placeholder="+919876543210" required />
      </label>
      <label>
        Base city
        <input name="baseCity" defaultValue="Jodhpur" required />
      </label>
      <label>
        Base state
        <input name="baseState" defaultValue="Rajasthan" required />
      </label>
      <label>
        Email optional
        <input name="email" type="email" placeholder="dispatch@example.com" />
      </label>
      <label>
        Notes optional
        <textarea name="notes" rows={3} placeholder="Routes, vehicle type, payment preference" />
      </label>
      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}
      <button className="button primary" type="submit" disabled={isPending}>
        {isPending ? "Adding..." : "Add vendor"}
      </button>
    </form>
  );
}
