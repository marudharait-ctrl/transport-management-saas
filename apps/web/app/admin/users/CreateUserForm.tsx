"use client";

import { useActionState } from "react";
import { createCompanyUser, type UserFormState } from "@/app/actions/users";

const initialState: UserFormState = {};

export function CreateUserForm() {
  const [state, formAction, isPending] = useActionState(createCompanyUser, initialState);

  return (
    <form className="stack-form" action={formAction}>
      <label>
        Name
        <input name="name" required />
      </label>
      <label>
        Email
        <input name="email" type="email" required />
      </label>
      <label>
        Role
        <select name="role" defaultValue="REQUESTER">
          <option value="ADMIN">Admin</option>
          <option value="REQUESTER">Requester</option>
          <option value="APPROVER">Approver</option>
          <option value="ACCOUNTS">Accounts</option>
          <option value="SUPPORT">Support</option>
        </select>
      </label>
      <label>
        Temporary password
        <input name="password" type="password" minLength={10} required />
      </label>
      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}
      <button className="button primary" type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create user"}
      </button>
    </form>
  );
}
