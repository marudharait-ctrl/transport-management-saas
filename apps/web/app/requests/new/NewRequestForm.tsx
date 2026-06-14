"use client";

import { useActionState } from "react";
import { createTransportRequest, type RequestFormState } from "@/app/actions/requests";

const initialState: RequestFormState = {};

type RequestTransporter = {
  id: string;
  name: string;
  phone: string;
  baseCity: string;
  trustRating: number;
};

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatInputDate(date);
}

export function NewRequestForm({ transporters }: { transporters: RequestTransporter[] }) {
  const [state, formAction, isPending] = useActionState(createTransportRequest, initialState);
  const today = addDays(0);
  const dispatchDate = addDays(2);
  const targetDeliveryDate = addDays(4);

  return (
    <form className="request-form" action={formAction}>
      <label>
        Request date
        <input value={today} readOnly />
      </label>

      <label className="wide">
        Request title
        <input name="title" defaultValue="Transport request" required />
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
        Dispatch date
        <input name="pickupDate" type="date" defaultValue={dispatchDate} required />
      </label>

      <label>
        Target delivery
        <input name="targetDeliveryDate" type="date" defaultValue={targetDeliveryDate} />
      </label>

      <label>
        Pickup city
        <input name="pickupCity" defaultValue="Jodhpur" required />
      </label>

      <label>
        Pickup pincode
        <input name="pickupPincode" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" placeholder="342001" required />
      </label>

      <label>
        Drop city
        <input name="dropCity" placeholder="Noida" required />
      </label>

      <label>
        Drop pincode
        <input name="dropPincode" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" placeholder="201301" required />
      </label>

      <label>
        Material
        <input name="material" defaultValue="PP woven bags" required />
      </label>

      <label>
        Quantity
        <input name="quantity" placeholder="16 MT" required />
      </label>

      <label className="wide">
        Truck requirement
        <input name="truckRequirement" defaultValue="32 ft container, tarpaulin required" required />
      </label>

      <fieldset className="wide transporter-select">
        <legend>Prepare WhatsApp broadcast</legend>
        <p className="muted">
          Select transporters who should receive this quote request. This prepares the broadcast list; actual WhatsApp send can be enabled next.
        </p>
        <div className="transporter-options">
          {transporters.map((transporter) => (
            <label className="transporter-option" key={transporter.id}>
              <input name="transporterIds" type="checkbox" value={transporter.id} defaultChecked />
              <span>
                <strong>{transporter.name}</strong>
                <small>
                  {transporter.phone} - {transporter.baseCity} - rating {transporter.trustRating}/5
                </small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="wide">
        Notes
        <textarea name="notes" rows={3} placeholder="Urgency, loading constraints, special instructions" />
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
