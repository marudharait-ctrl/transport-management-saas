import { logout } from "@/app/actions/auth";
import { BrandLogo } from "@/app/components/BrandLogo";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Building2, KeyRound, LogOut, PackageCheck, Plus, Truck, Users } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const currentUser = await requireUser();
  const notifications = await prisma.notification.findMany({
    where: { companyId: currentUser.companyId, recipientType: "ADMIN" },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  return (
    <main className="page home-page">
      <div className="shell home-shell">
        <header className="topbar clean-topbar">
          <div className="brand">
            <BrandLogo />
            <span className="eyebrow">Transport desk</span>
            <h1>{currentUser.company.name}</h1>
            <p>Choose a workspace action.</p>
          </div>
          <div className="actions">
            <span className="user-pill">{currentUser.name}</span>
            <form action={logout}>
              <button className="button icon-button-text" type="submit">
                <LogOut size={16} aria-hidden="true" />
                Sign out
              </button>
            </form>
          </div>
        </header>

        <section className="option-grid" aria-label="Main actions">
          <Link className="option-tile primary-option" href="/requests/new">
            <span className="option-icon">
              <Plus size={22} aria-hidden="true" />
            </span>
            <span>
              <strong>New transport request</strong>
            </span>
          </Link>

          {currentUser.role === "ADMIN" ? (
            <>
              <Link className="option-tile" href="/admin/vendors">
                <span className="option-icon">
                  <KeyRound size={22} aria-hidden="true" />
                </span>
                <span>
                  <strong>Vendor Master</strong>
                </span>
              </Link>

              <Link className="option-tile" href="/admin/consignees">
                <span className="option-icon">
                  <Building2 size={22} aria-hidden="true" />
                </span>
                <span>
                  <strong>Consignee Master</strong>
                </span>
              </Link>

              <Link className="option-tile" href="/admin/users">
                <span className="option-icon">
                  <Users size={22} aria-hidden="true" />
                </span>
                <span>
                  <strong>Company users</strong>
                </span>
              </Link>

            </>
          ) : null}

          <Link className="option-tile muted-option" href="/quotes">
            <span className="option-icon">
              <Truck size={22} aria-hidden="true" />
            </span>
            <span>
              <strong>Compare vendor quotes</strong>
            </span>
          </Link>

          <Link className="option-tile" href="/shipments">
            <span className="option-icon">
              <PackageCheck size={22} aria-hidden="true" />
            </span>
            <span>
              <strong>Shipments</strong>
            </span>
          </Link>
        </section>
        <section className="panel dashboard-notifications">
          <div className="panel-title">
            <h2>Live notifications</h2>
            <span className="count-pill">{notifications.length}</span>
          </div>
          <ul className="timeline">
            {notifications.length === 0 ? (
              <li>
                <strong>No notifications yet</strong>
                <span>RFQs, bids, approvals, shipments, documents, invoice, and payment updates will appear here.</span>
              </li>
            ) : null}
            {notifications.map((notification) => (
              <li key={notification.id}>
                <strong>{notification.title}</strong>
                <span>{notification.body}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
