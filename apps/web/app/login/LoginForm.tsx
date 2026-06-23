"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form className="auth-form" action={formAction}>
      <label>
        User
        <input name="email" autoComplete="username" required />
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
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
