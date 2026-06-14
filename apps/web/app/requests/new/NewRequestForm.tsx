"use client";

import { useActionState } from "react";
import { createTransportRequest, type RequestFormState } from "@/app/actions/requests";
import { CalendarDays, MapPin, Package, Send, Truck } from "lucide-react";

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
      <section className="form-section form-section-first" aria-labelledby="request-basics">
        <div className="section-heading">
          <h3 id="request-basics">
            <CalendarDays size={17} aria-hidden="true" />
            Request
          </h3>
          <span>{today}</span>
        </div>

        <label className="wide">
          Title
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
      </section>

      <section className="form-section" aria-labelledby="route-details">
        <div className="section-heading wide">
          <h3 id="route-details">
            <MapPin size={17} aria-hidden="true" />
            Route
          </h3>
        </div>

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
      </section>

      <section className="form-section" aria-labelledby="load-details">
        <div className="section-heading wide">
          <h3 id="load-details">
            <Package size={17} aria-hidden="true" />
            Load
          </h3>
        </div>

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

        <label className="wide">
          Notes
          <textarea name="notes" rows={3} placeholder="Urgency, loading constraints, special instructions" />
        </label>
      </section>

      <fieldset className="form-section transporter-select">
        <legend className="section-heading wide">
          <span className="legend-title">
            <Truck size={17} aria-hidden="true" />
            Vendors
          </span>
        </legend>

        <div className="transporter-options">
          {transporters.length === 0 ? (
            <div className="empty-state">
              <strong>No vendors added yet</strong>
              <p className="muted">Add transport vendors before testing WhatsApp broadcast selection.</p>
            </div>
          ) : null}

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

      {state.error ? <p className="form-error wide">{state.error}</p> : null}

      <div className="form-actions wide">
        <button className="button primary" type="submit" disabled={isPending}>
          <Send size={16} aria-hidden="true" />
          {isPending ? "Creating..." : "Create request"}
        </button>
      </div>
    </form>
  );
}
