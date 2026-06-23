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
        WhatsApp mobile number
        <input name="primaryPhone" inputMode="numeric" pattern="[0-9]{10}" placeholder="9876543210" required />
      </label>
      <label>
        GSTIN
        <input name="gstin" placeholder="08ABCDE1234F1Z5" />
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
        Vendor login password
        <input name="password" type="password" minLength={6} placeholder="Minimum 6 characters" required />
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
