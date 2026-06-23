import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resetVendorPassword } from "@/app/actions/vendors";
import { BulkVendorUploadForm } from "./BulkVendorUploadForm";
import { CreateVendorForm } from "./CreateVendorForm";
import { VendorManagementActions } from "./VendorManagementActions";

export default async function VendorsPage() {
  const admin = await requireAdmin();
  const vendors = await prisma.companyTransporter.findMany({
    where: { companyId: admin.companyId },
    orderBy: [{ createdAt: "desc" }],
    include: { transporter: true }
  });

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <h1>Transport Vendors</h1>
            <p>{admin.company.name} approved vendor directory.</p>
          </div>
          <div className="actions">
            <Link className="button" href="/">
              Dashboard
            </Link>
            <Link className="button" href="/requests/new">
              New request
            </Link>
          </div>
        </header>

        <div className="grid">
          <section className="panel">
            <h2>Current Vendors</h2>
            <div className="table-list">
              {vendors.length === 0 ? (
                <div className="empty-state">
                  <strong>No vendors yet</strong>
                  <p className="muted">Add transport vendor WhatsApp numbers or emails to prepare quote notifications.</p>
                </div>
              ) : null}

              {vendors.map((vendor) => (
                <article className="table-row" key={vendor.id}>
                  <div>
                    <strong>{vendor.displayName}</strong>
                    <p className="muted">
                      {vendor.transporter.primaryPhone} - {vendor.transporter.baseCity}, {vendor.transporter.baseState}
                    </p>
                    {vendor.transporter.gstin ? <p className="muted">GSTIN: {vendor.transporter.gstin}</p> : null}
                    {vendor.notes ? <p className="muted">{vendor.notes}</p> : null}
                  </div>
                  <div className="row-actions">
                    <span className={`status ${vendor.isBlacklisted ? "rejected" : "approved"}`}>
                      {vendor.isBlacklisted ? "BLACKLISTED" : "READY"}
                    </span>
                  </div>
                  <VendorManagementActions
                    companyTransporterId={vendor.id}
                    vendorName={vendor.displayName}
                    isBlacklisted={vendor.isBlacklisted}
                  />
                  <form className="inline-password-form" action={resetVendorPassword}>
                    <input type="hidden" name="companyTransporterId" value={vendor.id} />
                    <label>
                      Login password
                      <input name="password" type="password" minLength={6} placeholder="New vendor password" required />
                    </label>
                    <button className="button compact" type="submit">
                      Set password
                    </button>
                  </form>
                </article>
              ))}
            </div>
          </section>

          <aside className="panel">
            <h2>Add Vendor</h2>
            <CreateVendorForm />
            <div className="side-divider" />
            <h2>Bulk Import</h2>
            <BulkVendorUploadForm />
          </aside>
        </div>
      </div>
    </main>
  );
}
