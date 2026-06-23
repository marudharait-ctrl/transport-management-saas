import Link from "next/link";
import { vendorLogout } from "@/app/actions/vendor-auth";
import { BrandLogo } from "@/app/components/BrandLogo";
import { requireVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRouteLabel, parseRouteStops } from "@/lib/route-stops";
import { LogOut, Truck } from "lucide-react";

export const dynamic = "force-dynamic";

const formatDate = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

const formatMoney = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

function formatStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

export default async function VendorHomePage({
  searchParams
}: {
  searchParams?: Promise<{ search?: string; status?: string }>;
}) {
  const filters = searchParams ? await searchParams : {};
  const search = String(filters.search ?? "").trim();
  const statusFilter = String(filters.status ?? "").trim();
  const vendorUser = await requireVendorUser("/vendor");
  const vendorAllowedNotificationActions = [
    "quote.approved",
    "quote.rejected",
    "shipment.driver_details_approved",
    "shipment.loading_started",
    "shipment.in_transit",
    "shipment.invoice_verified",
    "shipment.payment_processed",
    "shipment.payment_completed"
  ];
  const notifications = await prisma.notification.findMany({
    where: { transporterId: vendorUser.transporterId, recipientType: "VENDOR", action: { in: vendorAllowedNotificationActions } },
    orderBy: { createdAt: "desc" },
    take: 5
  });
  const quoteRequests = await prisma.quoteRequest.findMany({
    where: { transporterId: vendorUser.transporterId },
    orderBy: { createdAt: "desc" },
    include: {
      request: {
        include: {
          company: true,
          quotes: {
            where: { transporterId: vendorUser.transporterId },
            orderBy: { createdAt: "desc" }
          },
          shipment: true
        }
      }
    }
  });
  const rows = quoteRequests.map((quoteRequest) => {
    const request = quoteRequest.request;
    const quote = request.quotes[0] ?? null;
    const shipment =
      request.shipment && request.shipment.transporterId === vendorUser.transporterId
        ? request.shipment
        : null;
    const approvedQuote = quote?.status === "APPROVED";
    const rejectedQuote = quote?.status === "REJECTED";
    const status = shipment
      ? shipment.status
      : quote
        ? quote.status
        : quoteRequest.status;
    const href = shipment ? `/vendor/order/${quoteRequest.accessToken}` : `/vendor/quote/${quoteRequest.accessToken}`;
    const nextAction = shipment
      ? !shipment.vehicleNumber || !shipment.driverName || !shipment.driverPhone || !shipment.pickupAt
        ? "Send truck details"
        : !shipment.invoiceDocumentUrl
          ? "Upload invoice"
          : "Update order"
      : quote
        ? approvedQuote
          ? "Open order"
          : rejectedQuote
            ? "View closed quote"
            : "Waiting approval"
        : "Submit final quote";

    return {
      id: quoteRequest.id,
      requestNumber: request.requestNumber,
      title: request.title,
      companyName: request.company.name,
      route: formatRouteLabel(parseRouteStops(request.routeStops, request.pickupCity, request.dropCity)),
      dispatchDate: request.pickupDate,
      amount: quote ? formatMoney.format(quote.amountPaise / 100) : "Pending",
      status,
      invoice: shipment ? shipment.invoiceDocumentUrl ? "Uploaded" : "Pending" : "-",
      nextAction,
      href,
      isOrder: Boolean(shipment)
    };
  });
  const statusOptions = Array.from(new Set(rows.map((row) => row.status))).sort();
  const visibleRows = rows.filter((row) => {
    const matchesStatus = !statusFilter || row.status === statusFilter;
    const matchesSearch =
      !search ||
      `${row.requestNumber} ${row.title} ${row.companyName} ${row.route} ${formatStatus(row.status)}`
        .toLowerCase()
        .includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <main className="page vendor-page">
      <div className="vendor-shell">
        <header className="vendor-topbar">
          <div>
            <BrandLogo />
            <span className="vendor-mark">
              <Truck size={17} aria-hidden="true" />
              Vendor portal
            </span>
            <h1>{vendorUser.transporter.name}</h1>
            <p className="muted">All quote requests, approvals, truck details, and invoices in one place.</p>
          </div>
          <form action={vendorLogout}>
            <button className="button icon-button-text" type="submit">
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          </form>
        </header>

        <section className="vendor-card">
          <div className="vendor-list-header">
            <h2>Live notifications</h2>
            <span className="count-pill">{notifications.length}</span>
          </div>
          <ul className="timeline">
            {notifications.length === 0 ? (
              <li>
                <strong>No notifications yet</strong>
                <span>New RFQs, approved bids, shipment updates, POD approvals, invoice, and payment updates will appear here.</span>
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

        <section className="vendor-card">
          <div className="vendor-list-header">
            <h2>Received quote requests</h2>
            <span className="count-pill">{visibleRows.length} / {rows.length}</span>
          </div>

          {quoteRequests.length === 0 ? (
            <div className="empty-state">
              <strong>No quote requests yet</strong>
              <p className="muted">New transport quote requests and confirmed orders will appear here.</p>
            </div>
          ) : (
            <>
              <form className="vendor-filter-bar" action="/vendor">
                <input name="search" placeholder="Search request, route, company..." defaultValue={search} />
                <select name="status" defaultValue={statusFilter}>
                  <option value="">All status</option>
                  {statusOptions.map((status) => (
                    <option value={status} key={status}>{formatStatus(status)}</option>
                  ))}
                </select>
                <button className="button compact" type="submit">Filter</button>
                <Link className="button compact ghost" href="/vendor">Clear</Link>
              </form>
              {visibleRows.length === 0 ? (
                <div className="empty-state compact-empty">
                  <strong>No matching requests</strong>
                  <p className="muted">Adjust the filter or clear it to see all received quote requests.</p>
                </div>
              ) : (
                <div className="vendor-table-wrap">
                  <table className="vendor-status-table">
                    <thead>
                      <tr>
                        <th>Request</th>
                        <th>Route</th>
                        <th>Dispatch</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Invoice</th>
                        <th>Next step</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <strong>{row.requestNumber}</strong>
                            <span>{row.title}</span>
                            <span>{row.companyName}</span>
                          </td>
                          <td>{row.route}</td>
                          <td>{formatDate.format(row.dispatchDate)}</td>
                          <td>{row.amount}</td>
                          <td>
                            <span className={`status ${row.status.toLowerCase().replaceAll("_", "-")}`}>
                              {formatStatus(row.status)}
                            </span>
                          </td>
                          <td>{row.invoice}</td>
                          <td>{row.nextAction}</td>
                          <td>
                            <Link className={`button compact ${row.isOrder ? "primary" : ""}`} href={row.href}>
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
