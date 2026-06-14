import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DashboardUser = {
  name: string;
};

type DashboardTransporter = {
  name: string;
};

type DashboardQuote = {
  id: string;
  amountPaise: number;
  truckType: string;
  status: string;
  receivedVia: string;
  aiExtracted: boolean;
  transporter: DashboardTransporter;
};

type DashboardRequest = {
  id: string;
  requestNumber: string;
  title: string;
  status: string;
  pickupCity: string;
  dropCity: string;
  material: string;
  quantity: string;
  pickupDate: Date;
  aiSummary: string | null;
  requestedBy: DashboardUser;
  quotes: DashboardQuote[];
  shipment: {
    transporter: DashboardTransporter;
    vehicleNumber: string | null;
  } | null;
};

type DashboardCompany = {
  name: string;
  transporters: Array<{ transporter: DashboardTransporter }>;
  requests: DashboardRequest[];
  auditEvents: Array<{
    id: string;
    actorName: string;
    action: string;
    createdAt: Date;
  }>;
};

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

function statusClass(status: string) {
  return `status ${status.toLowerCase().replaceAll("_", "-")}`;
}

export default async function Home() {
  const company = await prisma.company.findUnique({
    where: { slug: "marudara-polypack" },
    include: {
      users: true,
      transporters: { include: { transporter: true } },
      requests: {
        orderBy: { createdAt: "desc" },
        include: {
          requestedBy: true,
          approvedBy: true,
          quotes: {
            include: { transporter: true },
            orderBy: { amountPaise: "asc" }
          },
          shipment: { include: { transporter: true } }
        }
      },
      auditEvents: {
        orderBy: { createdAt: "desc" },
        take: 5
      }
    }
  });

  if (!company) {
    return (
      <main className="page">
        <div className="shell">
          <div className="panel">
            <h1>No seed data found</h1>
            <p className="muted">Run pnpm db:seed to create the Marudara Polypack demo workspace.</p>
          </div>
        </div>
      </main>
    );
  }

  const dashboardCompany = company as DashboardCompany;

  const openRequests = dashboardCompany.requests.filter((request) =>
    ["OPEN", "QUOTED", "APPROVED", "IN_TRANSIT"].includes(request.status)
  );
  const quoteCount = dashboardCompany.requests.reduce((total, request) => total + request.quotes.length, 0);
  const approvedRequest = dashboardCompany.requests.find((request) => request.status === "APPROVED");

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <h1>{dashboardCompany.name} Transport Desk</h1>
            <p>
              Tenant-isolated company workspace, shared transporter network, AI-assisted but manually operable.
            </p>
          </div>
          <div className="actions">
            <a className="button primary" href="#requests">
              New request
            </a>
            <a className="button" href="#quotes">
              Compare quotes
            </a>
          </div>
        </header>

        <section className="metrics" aria-label="MVP metrics">
          <div className="metric">
            <span>Active requests</span>
            <strong>{openRequests.length}</strong>
          </div>
          <div className="metric">
            <span>Transporters</span>
            <strong>{dashboardCompany.transporters.length}</strong>
          </div>
          <div className="metric">
            <span>Quotes received</span>
            <strong>{quoteCount}</strong>
          </div>
          <div className="metric">
            <span>Approved load</span>
            <strong>{approvedRequest ? "1" : "0"}</strong>
          </div>
        </section>

        <div className="grid">
          <section className="panel" id="requests">
            <h2>Transport Requests</h2>
            <div className="request-list">
              {dashboardCompany.requests.map((request) => (
                <article className="request" key={request.id}>
                  <div className="request-head">
                    <div>
                      <h3>{request.title}</h3>
                      <p className="muted">
                        {request.requestNumber} · raised by {request.requestedBy.name}
                      </p>
                    </div>
                    <span className={statusClass(request.status)}>{request.status.replaceAll("_", " ")}</span>
                  </div>

                  <dl className="details">
                    <div>
                      <dt>Route</dt>
                      <dd>
                        {request.pickupCity} to {request.dropCity}
                      </dd>
                    </div>
                    <div>
                      <dt>Load</dt>
                      <dd>
                        {request.quantity} · {request.material}
                      </dd>
                    </div>
                    <div>
                      <dt>Pickup</dt>
                      <dd>{formatDate.format(request.pickupDate)}</dd>
                    </div>
                  </dl>

                  {request.aiSummary ? <p className="muted">{request.aiSummary}</p> : null}

                  {request.shipment ? (
                    <p className="muted">
                      Shipment planned with {request.shipment.transporter.name}
                      {request.shipment.vehicleNumber ? ` · ${request.shipment.vehicleNumber}` : ""}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <aside className="panel" id="quotes">
            <h2>Quote Board</h2>
            <div className="quotes">
              {dashboardCompany.requests.flatMap((request) =>
                request.quotes.map((quote) => (
                  <article className="quote" key={quote.id}>
                    <div className="quote-row">
                      <div>
                        <strong>{quote.transporter.name}</strong>
                        <p className="muted">
                          {request.requestNumber} · {quote.truckType}
                        </p>
                      </div>
                      <span className="money">{formatMoney.format(quote.amountPaise / 100)}</span>
                    </div>
                    <p className="muted">
                      {quote.status.replaceAll("_", " ")} · {quote.receivedVia}
                      {quote.aiExtracted ? " · AI extracted" : ""}
                    </p>
                  </article>
                ))
              )}
            </div>

            <h2 style={{ marginTop: 18 }}>Audit Trail</h2>
            <ol className="timeline">
              {dashboardCompany.auditEvents.map((event) => (
                <li key={event.id}>
                  <strong>{event.action.replaceAll(".", " ")}</strong>
                  <span>
                    {event.actorName} · {formatDate.format(event.createdAt)}
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </main>
  );
}
