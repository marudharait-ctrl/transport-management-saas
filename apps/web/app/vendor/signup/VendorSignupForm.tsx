"use client";

import { useActionState } from "react";
import { vendorSignup, type VendorSignupState } from "@/app/actions/vendor-auth";
import { UserPlus } from "lucide-react";

const initialState: VendorSignupState = {};

export function VendorSignupForm() {
  const [state, formAction, isPending] = useActionState(vendorSignup, initialState);

  return (
    <form className="auth-form" action={formAction}>
      <label>
        Vendor name
        <input name="name" placeholder="Shree Balaji Transport" required />
      </label>
      <label>
        WhatsApp mobile number
        <input name="primaryPhone" autoComplete="tel" inputMode="numeric" pattern="[0-9]{10}" placeholder="9876543210" required />
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
        <input name="email" type="email" autoComplete="email" placeholder="dispatch@example.com" />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="new-password" minLength={6} required />
      </label>
      {state.error ? <p className="form-error">{state.error}</p> : null}
      <button className="button primary" type="submit" disabled={isPending}>
        <UserPlus size={16} aria-hidden="true" />
        {isPending ? "Creating..." : "Create vendor account"}
      </button>
    </form>
  );
}
