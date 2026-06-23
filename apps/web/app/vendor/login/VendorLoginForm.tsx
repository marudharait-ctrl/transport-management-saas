"use client";

import { useActionState } from "react";
import { vendorLogin, type VendorLoginState } from "@/app/actions/vendor-auth";
import { LogIn } from "lucide-react";

const initialState: VendorLoginState = {};

export function VendorLoginForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, isPending] = useActionState(vendorLogin, initialState);

  return (
    <form className="auth-form" action={formAction}>
      <input name="next" type="hidden" value={nextPath} />
      <label>
        WhatsApp number or email
        <input name="loginId" autoComplete="username" placeholder="9876543210 or dispatch@example.com" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <label className="checkbox-row">
        <input name="remember" type="checkbox" />
        <span>Remember me on this device</span>
      </label>
      {state.error ? <p className="form-error">{state.error}</p> : null}
      <button className="button primary" type="submit" disabled={isPending}>
        <LogIn size={16} aria-hidden="true" />
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
