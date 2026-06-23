import { logout } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRouteLabel, parseRouteStops } from "@/lib/route-stops";
import { ArrowUpRight, BarChart3, LogOut } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function statusClass(status: string) {
  return `status ${status.toLowerCase().replaceAll("_", "-")}`;
}

export default async function QuotesPage() {
  const currentUser = await requireUser();
  const requests = await prisma.transportRequest.findMany({
    where: { companyId: currentUser.companyId },
    orderBy: { createdAt: "desc" },
    include: {
      quotes: { select: { id: true } },
      quoteRequests: {
        where: { question: { not: null }, questionAnswer: null },
        select: { id: true }
      }
    }
  });

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <span className="eyebrow">RFQs</span>
            <h1>Compare quotes</h1>
            <p>Open one RFQ at a time to review bid history and approve a vendor.</p>
          </div>
          <div className="actions">
            <Link className="button" href="/">
              Dashboard
            </Link>
            <Link className="button" href="/requests">
              Requests
            </Link>
            <form action={logout}>
              <button className="button icon-button-text" type="submit">
                <LogOut size={16} aria-hidden="true" />
                Sign out
              </button>
            </form>
          </div>
        </header>

        <section className="panel">
          <div className="panel-title">
            <h2>
              <BarChart3 size={18} aria-hidden="true" />
              RFQ list
            </h2>
            <span className="count-pill">{requests.length}</span>
          </div>

          <div className="request-picker-table-wrap">
            {requests.length === 0 ? (
              <div className="empty-state">
                <strong>No transport requests yet</strong>
                <p className="muted">Create a request and invite vendors before comparing quotes.</p>
              </div>
            ) : (
              <table className="request-picker-table">
                <thead>
                  <tr>
                    <th>RFQ</th>
                    <th>Route</th>
                    <th>Status</th>
                    <th>Bids</th>
                    <th>Questions</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => {
                    const routeStops = parseRouteStops(request.routeStops, request.pickupCity, request.dropCity);

                    return (
                      <tr key={request.id}>
                        <td>
                          <strong>{request.requestNumber}</strong>
                          <span>{request.title}</span>
                        </td>
                        <td>{formatRouteLabel(routeStops)}</td>
                        <td>
                          <span className={statusClass(request.status)}>{request.status.replaceAll("_", " ")}</span>
                        </td>
                        <td>{request.quotes.length}</td>
                        <td>{request.quoteRequests.length}</td>
                        <td>
                          <Link className="button compact" href={`/quotes/${request.id}`} target="_blank">
                            <ArrowUpRight size={15} aria-hidden="true" />
                            Open RFQ
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
