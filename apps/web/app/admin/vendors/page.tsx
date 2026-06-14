import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateVendorForm } from "./CreateVendorForm";

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
                  <p className="muted">Add real transport vendor WhatsApp numbers to test quote broadcasts.</p>
                </div>
              ) : null}

              {vendors.map((vendor) => (
                <article className="table-row" key={vendor.id}>
                  <div>
                    <strong>{vendor.displayName}</strong>
                    <p className="muted">
                      {vendor.transporter.primaryPhone} - {vendor.transporter.baseCity}, {vendor.transporter.baseState}
                    </p>
                    {vendor.notes ? <p className="muted">{vendor.notes}</p> : null}
                  </div>
                  <div className="row-actions">
                    <span className="status approved">READY</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="panel">
            <h2>Add Vendor</h2>
            <CreateVendorForm />
          </aside>
        </div>
      </div>
    </main>
  );
}
