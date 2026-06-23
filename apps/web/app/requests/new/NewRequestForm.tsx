"use client";

import { useActionState, useMemo, useState } from "react";
import { createTransportRequest, type RequestFormState } from "@/app/actions/requests";
import { CalendarDays, MapPin, Package, Plus, Send, Trash2, Truck } from "lucide-react";
import { citySuggestions, sourceUnitOptions } from "@/lib/route-stops";

const initialState: RequestFormState = {};

type RequestTransporter = {
  id: string;
  name: string;
  phone: string;
  baseCity: string;
  trustRating: number;
};

type RequestConsignee = {
  id: string;
  name: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
};

type DestinationRow = {
  id: string;
  consigneeId: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
};

type SourceRow = {
  id: string;
  unitId: string;
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

function formatInputDateTime(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function addHours(hours: number) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return formatInputDateTime(date);
}

export function NewRequestForm({ transporters, consignees }: { transporters: RequestTransporter[]; consignees: RequestConsignee[] }) {
  const [state, formAction, isPending] = useActionState(createTransportRequest, initialState);
  const [sourceRows, setSourceRows] = useState<SourceRow[]>([{ id: "source-1", unitId: sourceUnitOptions[0].id }]);
  const [destinationRows, setDestinationRows] = useState<DestinationRow[]>([
    { id: "destination-1", consigneeId: "", city: "", state: "", pincode: "", address: "" }
  ]);
  const today = addDays(0);
  const dispatchDate = useMemo(() => formatInputDateTime(new Date()), []);
  const targetDeliveryDate = addDays(4);
  const biddingDeadline = useMemo(() => addHours(1), []);

  function sourceLabel(index: number) {
    if (index === 0) {
      return "Source loading point";
    }
    if (index === 1) {
      return "Second loading point";
    }
    return "Third loading point";
  }

  function updateSource(rowId: string, unitId: string) {
    setSourceRows((rows) => rows.map((row) => (row.id === rowId ? { ...row, unitId } : row)));
  }

  function addSource() {
    setSourceRows((rows) => {
      const nextUnit = sourceUnitOptions.find((unit) => !rows.some((row) => row.unitId === unit.id));

      if (!nextUnit || rows.length >= sourceUnitOptions.length) {
        return rows;
      }

      return [...rows, { id: `source-${Date.now()}`, unitId: nextUnit.id }];
    });
  }

  function removeSource(rowId: string) {
    setSourceRows((rows) => (rows.length === 1 ? rows : rows.filter((row) => row.id !== rowId)));
  }

  function updateDestination(rowId: string, updates: Partial<DestinationRow>) {
    setDestinationRows((rows) => rows.map((row) => (row.id === rowId ? { ...row, ...updates } : row)));
  }

  function selectConsignee(rowId: string, consigneeId: string) {
    const consignee = consignees.find((item) => item.id === consigneeId);
    updateDestination(rowId, {
      consigneeId,
      city: consignee?.city ?? "",
      state: consignee?.state ?? "",
      pincode: consignee?.pincode ?? "",
      address: consignee?.address ?? ""
    });
  }

  function addDestination() {
    setDestinationRows((rows) => [
      ...rows,
      { id: `destination-${Date.now()}`, consigneeId: "", city: "", state: "", pincode: "", address: "" }
    ]);
  }

  function removeDestination(rowId: string) {
    setDestinationRows((rows) => (rows.length === 1 ? rows : rows.filter((row) => row.id !== rowId)));
  }

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

        <div className="request-fixed-title wide">Transport Request</div>
        <input name="title" type="hidden" value="Transport Request" />
        <input name="loadType" type="hidden" value="FULL_TRUCK" />

        <label>
          Dispatch date and time
          <input name="pickupDate" type="datetime-local" defaultValue={dispatchDate} required />
        </label>

        <label>
          Target delivery
          <input name="targetDeliveryDate" type="date" defaultValue={targetDeliveryDate} />
        </label>

        <label>
          Bidding closes
          <input name="biddingDeadline" type="datetime-local" defaultValue={biddingDeadline} required />
        </label>
      </section>

      <section className="form-section" aria-labelledby="route-details">
        <div className="section-heading wide">
          <h3 id="route-details">
            <MapPin size={17} aria-hidden="true" />
            Route
          </h3>
        </div>

        <div className="route-builder wide">
          <datalist id="city-options">
            {citySuggestions.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>

          {sourceRows.map((row, index) => {
            const selectedSourceUnit = sourceUnitOptions.find((unit) => unit.id === row.unitId) ?? sourceUnitOptions[0];

            return (
              <div className="route-stop" key={row.id}>
                <div className="route-stop-index">{index + 1}</div>
                <div className="route-stop-fields">
                  <input name="sourceUnitId" type="hidden" value={selectedSourceUnit.id} />
                  <input name="routeConsigneeId" type="hidden" value="" />
                  <input name="routeConsigneeName" type="hidden" value={selectedSourceUnit.name} />
                  <input name="routeCity" type="hidden" value={selectedSourceUnit.city} />
                  <input name="routeState" type="hidden" value={selectedSourceUnit.state} />
                  <input name="routePincode" type="hidden" value={selectedSourceUnit.pincode} />
                  <input name="routeAddress" type="hidden" value={selectedSourceUnit.address} />
                  <label className="consignee-select-field">
                    {sourceLabel(index)}
                    <select value={row.unitId} onChange={(event) => updateSource(row.id, event.currentTarget.value)} required>
                      {sourceUnitOptions.map((unit) => (
                        <option
                          value={unit.id}
                          key={unit.id}
                          disabled={sourceRows.some((sourceRow) => sourceRow.id !== row.id && sourceRow.unitId === unit.id)}
                        >
                          {unit.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="selected-consignee-address">{selectedSourceUnit.address}</p>
                </div>
                {sourceRows.length > 1 ? (
                  <button className="button compact route-remove" type="button" onClick={() => removeSource(row.id)} aria-label={`Remove ${sourceLabel(index)}`}>
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            );
          })}

          <button className="button route-add" type="button" onClick={addSource} disabled={sourceRows.length >= sourceUnitOptions.length}>
            <Plus size={16} aria-hidden="true" />
            Add loading point
          </button>

          {destinationRows.map((row, index) => {
            const selectedConsignee = consignees.find((consignee) => consignee.id === row.consigneeId);

            return (
              <div className="route-stop" key={row.id}>
                <div className="route-stop-index">{sourceRows.length + index + 1}</div>
                <div className="route-stop-fields">
                  <input name="routeConsigneeName" type="hidden" value={selectedConsignee?.name ?? ""} />
                  <input name="routeState" type="hidden" value={row.state} />
                  <label className="consignee-select-field">
                    Consignee party
                    <select
                      name="routeConsigneeId"
                      value={row.consigneeId}
                      onChange={(event) => selectConsignee(row.id, event.currentTarget.value)}
                    >
                      <option value="">Select party or enter manually</option>
                      {consignees.map((consignee) => (
                        <option key={consignee.id} value={consignee.id}>
                          {consignee.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Destination city
                    <input
                      name="routeCity"
                      list="city-options"
                      value={row.city}
                      onChange={(event) => updateDestination(row.id, { city: event.currentTarget.value, state: "" })}
                      placeholder="Start typing city"
                      required
                    />
                  </label>
                  <label>
                    PIN code
                    <input
                      name="routePincode"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      placeholder="342012"
                      value={row.pincode}
                      onChange={(event) => updateDestination(row.id, { pincode: event.currentTarget.value })}
                      required
                    />
                  </label>
                  <label className="route-address-field">
                    Final address at this location
                    <input
                      name="routeAddress"
                      value={row.address}
                      onChange={(event) => updateDestination(row.id, { address: event.currentTarget.value })}
                      placeholder="Factory, warehouse, gate, landmark"
                    />
                  </label>
                  {selectedConsignee?.address ? <p className="selected-consignee-address">{selectedConsignee.address}</p> : null}
                </div>
                {destinationRows.length > 1 ? (
                  <button className="button compact route-remove" type="button" onClick={() => removeDestination(row.id)} aria-label="Remove destination">
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            );
          })}

          <button className="button route-add" type="button" onClick={addDestination} disabled={destinationRows.length >= 9}>
            <Plus size={16} aria-hidden="true" />
            Add consignee
          </button>
        </div>
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
          Quantity (kg)
          <input name="quantityKg" inputMode="numeric" placeholder="9600" required />
        </label>

        <label className="wide">
          Truck requirement
          <select name="truckRequirement" defaultValue="Container truck" required>
            <option value="Container truck">Container truck</option>
            <option value="32 Feet Container Truck">32 Feet Container Truck</option>
            <option value="Pickup Truck with Tarpaulin">Pickup Truck with Tarpaulin</option>
            <option value="Open truck with tarpaulin">Open truck with tarpaulin</option>
          </select>
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
              <p className="muted">Add transport vendors before preparing quote notifications.</p>
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
