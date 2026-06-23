import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BulkConsigneeUploadForm } from "./BulkConsigneeUploadForm";
import { CreateConsigneeForm } from "./CreateConsigneeForm";

function formatAddress(consignee: {
  addressLine1: string | null;
  addressLine2: string | null;
  addressLine3: string | null;
  city: string;
  pincode: string | null;
  state: string | null;
}) {
  return [consignee.addressLine1, consignee.addressLine2, consignee.addressLine3, consignee.city, consignee.pincode, consignee.state]
    .filter(Boolean)
    .join(", ");
}

export default async function ConsigneesPage() {
  const admin = await requireAdmin();
  const consignees = await prisma.consignee.findMany({
    where: { companyId: admin.companyId },
    orderBy: [{ name: "asc" }]
  });

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <h1>Consignee Master</h1>
            <p>{admin.company.name} destination party directory.</p>
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
            <h2>Current Consignees</h2>
            <div className="table-list">
              {consignees.length === 0 ? (
                <div className="empty-state">
                  <strong>No consignees yet</strong>
                  <p className="muted">Add destination parties so new requests can fill destination route details automatically.</p>
                </div>
              ) : null}

              {consignees.map((consignee) => (
                <article className="table-row" key={consignee.id}>
                  <div>
                    <strong>{consignee.name}</strong>
                    <p className="muted">{formatAddress(consignee)}</p>
                    {consignee.contactPerson || consignee.mobile ? (
                      <p className="muted">
                        {[consignee.contactPerson, consignee.mobile].filter(Boolean).join(" - ")}
                      </p>
                    ) : null}
                    {consignee.gstin ? <p className="muted">GSTIN {consignee.gstin}</p> : null}
                  </div>
                  <div className="row-actions">
                    <span className="status approved">READY</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="side-stack">
            <section className="panel">
              <h2>Bulk Upload</h2>
              <BulkConsigneeUploadForm />
            </section>

            <section className="panel">
              <h2>Add Consignee</h2>
              <CreateConsigneeForm />
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
