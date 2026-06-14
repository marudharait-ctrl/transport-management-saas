"use client";

import { useActionState } from "react";
import { createTransportRequest, type RequestFormState } from "@/app/actions/requests";

const initialState: RequestFormState = {};

export function NewRequestForm() {
  const [state, formAction, isPending] = useActionState(createTransportRequest, initialState);

  return (
    <form className="request-form" action={formAction}>
      <label className="wide">
        Request title
        <input name="title" placeholder="Full truck from Jodhpur to Noida" required />
      </label>

      <label>
        Load type
        <select name="loadType" defaultValue="FULL_TRUCK" required>
          <option value="FULL_TRUCK">Full truck</option>
          <option value="PARTIAL_LOAD">Partial load</option>
          <option value="SIZE_SPECIFIC">Size specific truck</option>
          <option value="MULTI_LEG">Multi-leg movement</option>
        </select>
      </label>

      <label>
        Pickup date
        <input name="pickupDate" type="date" required />
      </label>

      <label>
        Target delivery
        <input name="targetDeliveryDate" type="date" />
      </label>

      <label>
        Pickup city
        <input name="pickupCity" defaultValue="Jodhpur" required />
      </label>

      <label>
        Pickup state
        <input name="pickupState" defaultValue="Rajasthan" required />
      </label>

      <label>
        Drop city
        <input name="dropCity" required />
      </label>

      <label>
        Drop state
        <input name="dropState" required />
      </label>

      <label>
        Material
        <input name="material" placeholder="PP woven bags" required />
      </label>

      <label>
        Quantity
        <input name="quantity" placeholder="16 MT" required />
      </label>

      <label className="wide">
        Truck requirement
        <input name="truckRequirement" placeholder="32 ft container, tarpaulin required" required />
      </label>

      <label className="wide">
        Notes
        <textarea name="notes" rows={4} placeholder="Urgency, loading constraints, special instructions" />
      </label>

      {state.error ? <p className="form-error wide">{state.error}</p> : null}

      <div className="form-actions wide">
        <button className="button primary" type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create request"}
        </button>
      </div>
    </form>
  );
}
