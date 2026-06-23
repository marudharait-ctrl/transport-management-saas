"use client";

import { deleteVendor, toggleVendorBlacklist } from "@/app/actions/vendors";
import { Ban, Trash2 } from "lucide-react";

export function VendorManagementActions({
  companyTransporterId,
  vendorName,
  isBlacklisted
}: {
  companyTransporterId: string;
  vendorName: string;
  isBlacklisted: boolean;
}) {
  return (
    <div className="vendor-admin-actions">
      <form action={toggleVendorBlacklist}>
        <input type="hidden" name="companyTransporterId" value={companyTransporterId} />
        <input type="hidden" name="nextValue" value={String(!isBlacklisted)} />
        <button className="button compact" type="submit">
          <Ban size={15} aria-hidden="true" />
          {isBlacklisted ? "Remove blacklist" : "Blacklist"}
        </button>
      </form>
      <form
        action={deleteVendor}
        onSubmit={(event) => {
          if (!window.confirm(`Delete ${vendorName} from the vendor directory? Existing bid history and shipments will be preserved.`)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="companyTransporterId" value={companyTransporterId} />
        <button className="button compact danger" type="submit">
          <Trash2 size={15} aria-hidden="true" />
          Delete
        </button>
      </form>
    </div>
  );
}
