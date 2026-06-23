"use client";

import type { FormEvent, ReactNode } from "react";
import { useActionState, useState } from "react";
import { updateVendorOrder, type VendorPortalState } from "@/app/actions/vendor-portal";
import { FileUp, Save } from "lucide-react";

const initialState: VendorPortalState = {};
const maxFileMegabytes = 15;
const maxFileBytes = maxFileMegabytes * 1024 * 1024;

type DeliveryStop = {
  id: string;
  stopIndex: number;
  consigneeName: string | null;
  city: string;
  pincode: string | null;
  podDocumentUrl: string | null;
  podUploadedAt: Date | null;
  biltyDocumentUrl: string | null;
  biltyUploadedAt: Date | null;
  podApprovedAt: Date | null;
  completedAt: Date | null;
};

type OrderPortalFormProps = {
  accessToken: string;
  shipment: {
    id: string;
    status: string;
    vehicleNumber: string | null;
    driverName: string | null;
    driverPhone: string | null;
    driverLicenseDocumentUrl: string | null;
    vehicleRcDocumentUrl: string | null;
    truckImageUrl: string | null;
    invoiceNumber: string | null;
    invoiceAmountPaise: number | null;
    invoiceDocumentUrl: string | null;
    deliveryStops: DeliveryStop[];
  };
};

function StatusNote({ children }: { children: ReactNode }) {
  return <p className="vendor-note">{children}</p>;
}

export function OrderPortalForm({ shipment, accessToken }: OrderPortalFormProps) {
  const [state, formAction, isPending] = useActionState(updateVendorOrder, initialState);
  const [localError, setLocalError] = useState("");
  const canSubmitDriverDetails = shipment.status === "PLANNED" || shipment.status === "ORDER_CONFIRMED";

  function validateUploadSize(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const files = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="file"]')).flatMap((input) =>
      Array.from(input.files ?? [])
    );
    const largeFile = files.find((file) => file.size > maxFileBytes);

    if (largeFile) {
      event.preventDefault();
      setLocalError(`${largeFile.name} is too large. Please upload files of ${maxFileMegabytes} MB or less.`);
      return;
    }

    setLocalError("");
  }

  return (
    <div className="stack-form vendor-subform">
      {canSubmitDriverDetails ? (
        <form className="stack-form vendor-subform" action={formAction} onSubmit={validateUploadSize}>
          <input name="shipmentId" type="hidden" value={shipment.id} />
          <input name="accessToken" type="hidden" value={accessToken} />
          <div className="vendor-step-heading">
            <span>1</span>
            <strong>Driver and vehicle documents</strong>
          </div>
          <div className="vendor-form-grid">
            <label>
              Truck number
              <input name="vehicleNumber" defaultValue={shipment.vehicleNumber ?? ""} placeholder="RJ19GB1234" required />
            </label>
            <label>
              Driver mobile
              <input name="driverPhone" defaultValue={shipment.driverPhone?.replace("+91", "") ?? ""} inputMode="numeric" pattern="[0-9]{10}" placeholder="9876543210" required />
            </label>
          </div>
          <label>
            Driver name
            <input name="driverName" defaultValue={shipment.driverName ?? ""} placeholder="Driver full name" required />
          </label>
          <label>
            Driver license image
            <input name="driverLicenseFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required />
          </label>
          <label>
            Vehicle RC image
            <input name="vehicleRcFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required />
          </label>
          <label>
            Truck image
            <input name="truckImageFile" type="file" accept="image/jpeg,image/png,image/webp" required />
          </label>
          {localError ? <p className="form-error">{localError}</p> : null}
          {state.error ? <p className="form-error">{state.error}</p> : null}
          {state.success ? <p className="form-success">{state.success}</p> : null}
          <div className="form-actions vendor-actions">
            <button className="button primary" type="submit" disabled={isPending}>
              <Save size={16} aria-hidden="true" />
              {isPending ? "Submitting..." : "Submit for verification"}
            </button>
          </div>
        </form>
      ) : null}

      {shipment.driverLicenseDocumentUrl || shipment.vehicleRcDocumentUrl || shipment.truckImageUrl ? (
        <div className="uploaded-doc-list" aria-label="Saved driver and vehicle documents">
          {shipment.driverLicenseDocumentUrl ? (
            <a className="button compact" href={shipment.driverLicenseDocumentUrl} target="_blank" rel="noreferrer">
              <FileUp size={15} aria-hidden="true" />
              Open driver license
            </a>
          ) : null}
          {shipment.vehicleRcDocumentUrl ? (
            <a className="button compact" href={shipment.vehicleRcDocumentUrl} target="_blank" rel="noreferrer">
              <FileUp size={15} aria-hidden="true" />
              Open vehicle RC
            </a>
          ) : null}
          {shipment.truckImageUrl ? (
            <a className="button compact" href={shipment.truckImageUrl} target="_blank" rel="noreferrer">
              <FileUp size={15} aria-hidden="true" />
              Open truck image
            </a>
          ) : null}
        </div>
      ) : null}

      {shipment.invoiceDocumentUrl || shipment.deliveryStops.some((stop) => stop.podDocumentUrl || stop.biltyDocumentUrl) ? (
        <div className="uploaded-doc-list" aria-label="Saved shipment documents">
          {shipment.deliveryStops.map((stop) =>
            stop.biltyDocumentUrl ? (
              <a className="button compact" href={stop.biltyDocumentUrl} target="_blank" rel="noreferrer" key={`${stop.id}-bilty`}>
                <FileUp size={15} aria-hidden="true" />
                Open Bilty {stop.stopIndex}
              </a>
            ) : null
          )}
          {shipment.deliveryStops.map((stop) =>
            stop.podDocumentUrl ? (
              <a className="button compact" href={stop.podDocumentUrl} target="_blank" rel="noreferrer" key={`${stop.id}-pod`}>
                <FileUp size={15} aria-hidden="true" />
                Open POD {stop.stopIndex}
              </a>
            ) : null
          )}
          {shipment.invoiceDocumentUrl ? (
            <a className="button compact" href={shipment.invoiceDocumentUrl} target="_blank" rel="noreferrer">
              <FileUp size={15} aria-hidden="true" />
              Open invoice
            </a>
          ) : null}
        </div>
      ) : null}

      {shipment.status === "DRIVER_DETAILS_SUBMITTED" || shipment.status === "ADMIN_APPROVAL_REQUIRED" ? (
        <StatusNote>Driver and vehicle details are submitted. Please wait for admin verification.</StatusNote>
      ) : null}

      {["DRIVER_DETAILS_APPROVED", "LOADING_IN_PROCESS", "LOADING_POINT_COMPLETED", "FINAL_WEIGHT_SLIP_UPLOADED"].includes(shipment.status) ? (
        <StatusNote>Driver details are approved. Admin will complete loading and move the shipment in transit.</StatusNote>
      ) : null}

      {["IN_TRANSIT", "BILTY_UPLOADED", "POD_UPLOADED", "POD_APPROVED", "ADMIN_APPROVAL_REQUIRED"].includes(shipment.status) ? (
        <div className="stack-form vendor-subform">
          <div className="vendor-step-heading">
            <span>2</span>
            <strong>Delivery Bilty and GRN/POD uploads</strong>
          </div>
          {shipment.deliveryStops.map((stop) => (
            <form className="vendor-link-row" action={formAction} onSubmit={validateUploadSize} key={stop.id}>
              <input name="shipmentId" type="hidden" value={shipment.id} />
              <input name="accessToken" type="hidden" value={accessToken} />
              <input name="deliveryStopId" type="hidden" value={stop.id} />
              <div>
                <strong>{stop.consigneeName ?? `Delivery ${stop.stopIndex}`}</strong>
                <span>{stop.pincode ? `${stop.city} - ${stop.pincode}` : stop.city}</span>
                {stop.biltyDocumentUrl ? (
                  <a className="button compact" href={stop.biltyDocumentUrl} target="_blank" rel="noreferrer">
                    <FileUp size={15} aria-hidden="true" />
                    Open Bilty
                  </a>
                ) : null}
                {stop.podDocumentUrl ? (
                  <a className="button compact" href={stop.podDocumentUrl} target="_blank" rel="noreferrer">
                    <FileUp size={15} aria-hidden="true" />
                    Open POD
                  </a>
                ) : null}
              </div>
              <div className="portal-actions">
                {stop.podApprovedAt ? (
                  <span className="status approved">POD approved</span>
                ) : stop.podDocumentUrl && stop.biltyDocumentUrl ? (
                  <span className="status open">Admin approval required</span>
                ) : (
                  <>
                    <input name="biltyFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required />
                    <input name="podFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required />
                    <button className="button compact primary" type="submit" disabled={isPending}>
                      Upload Bilty and POD
                    </button>
                  </>
                )}
              </div>
            </form>
          ))}
          {localError ? <p className="form-error">{localError}</p> : null}
          {state.error ? <p className="form-error">{state.error}</p> : null}
          {state.success ? <p className="form-success">{state.success}</p> : null}
        </div>
      ) : null}

      {shipment.status === "ALL_DELIVERIES_COMPLETED" ? (
        <StatusNote>All delivery PODs are approved. Please wait for admin final delivery approval.</StatusNote>
      ) : null}

      {shipment.status === "FINAL_DELIVERY_APPROVED" ? (
        <form className="stack-form vendor-subform" action={formAction} onSubmit={validateUploadSize}>
          <input name="shipmentId" type="hidden" value={shipment.id} />
          <input name="accessToken" type="hidden" value={accessToken} />
          <div className="vendor-step-heading">
            <span>3</span>
            <strong>Invoice upload</strong>
          </div>
          <div className="vendor-form-grid">
            <label>
              Invoice number
              <input name="invoiceNumber" defaultValue={shipment.invoiceNumber ?? ""} placeholder="INV-1024" required />
            </label>
            <label>
              Invoice amount
              <input
                name="invoiceAmount"
                defaultValue={shipment.invoiceAmountPaise ? String(shipment.invoiceAmountPaise / 100) : ""}
                inputMode="decimal"
                placeholder="48500"
                required
              />
            </label>
          </div>
          <label>
            Upload invoice PDF/photo
            <input name="invoiceFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required />
          </label>
          {shipment.invoiceDocumentUrl ? (
            <a className="button compact" href={shipment.invoiceDocumentUrl} target="_blank" rel="noreferrer">
              <FileUp size={15} aria-hidden="true" />
              Open saved invoice
            </a>
          ) : null}
          {localError ? <p className="form-error">{localError}</p> : null}
          {state.error ? <p className="form-error">{state.error}</p> : null}
          {state.success ? <p className="form-success">{state.success}</p> : null}
          <div className="form-actions vendor-actions">
            <button className="button primary" type="submit" disabled={isPending}>
              <Save size={16} aria-hidden="true" />
              {isPending ? "Submitting..." : "Submit invoice"}
            </button>
          </div>
        </form>
      ) : null}

      {["INVOICE_SUBMITTED", "INVOICE_VERIFIED", "PAYMENT_PROCESSED", "PAYMENT_COMPLETED", "ORDER_CLOSED"].includes(shipment.status) ? (
        <StatusNote>Invoice/payment stage is under admin processing. Current status: {shipment.status.replaceAll("_", " ")}.</StatusNote>
      ) : null}
    </div>
  );
}
