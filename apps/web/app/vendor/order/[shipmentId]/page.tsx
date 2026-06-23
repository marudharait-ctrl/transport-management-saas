import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatRouteLabel, parseRouteStops } from "@/lib/route-stops";
import { CalendarDays, IndianRupee, MapPin, Truck } from "lucide-react";
import { OrderPortalForm } from "./OrderPortalForm";

export const dynamic = "force-dynamic";

const formatDate = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

const formatDateTime = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

const formatMoney = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

export default async function VendorOrderPage({ params }: { params: Promise<{ shipmentId: string }> }) {
  const { shipmentId: accessToken } = await params;
  const quoteRequest = await prisma.quoteRequest.findUnique({
    where: { accessToken },
    select: { requestId: true, transporterId: true }
  });

  if (!quoteRequest) {
    notFound();
  }

  const shipment = await prisma.shipment.findFirst({
    where: {
      requestId: quoteRequest.requestId,
      transporterId: quoteRequest.transporterId
    },
    include: {
      request: { include: { company: true, quoteRequests: true } },
      transporter: true,
      deliveryStops: { orderBy: { stopIndex: "asc" } }
    }
  });

  if (!shipment) {
    notFound();
  }

  const routeStops = parseRouteStops(shipment.request.routeStops, shipment.request.pickupCity, shipment.request.dropCity);

  const approvedQuote = await prisma.quote.findFirst({
    where: {
      requestId: shipment.requestId,
      transporterId: shipment.transporterId,
      status: "APPROVED"
    }
  });

  return (
    <main className="page vendor-page">
      <div className="vendor-shell">
        <header className="vendor-topbar">
          <div>
            <span className="vendor-mark">
              <Truck size={17} aria-hidden="true" />
              Order confirmation
            </span>
            <h1>{shipment.request.requestNumber}</h1>
            <p className="muted">{shipment.request.company.name}</p>
          </div>
          <span className="status approved">Secure WhatsApp link</span>
        </header>

        <section className="vendor-card vendor-summary">
          <div>
            <span className={`status ${shipment.status.toLowerCase().replaceAll("_", "-")}`}>
              {shipment.status.replaceAll("_", " ")}
            </span>
            <h2>{shipment.request.title}</h2>
            <p className="muted">Confirmed order for {shipment.transporter.name}</p>
          </div>
          {approvedQuote ? <strong className="vendor-amount">{formatMoney.format(approvedQuote.amountPaise / 100)}</strong> : null}
        </section>

        <section className="vendor-card">
          <h2>Order details</h2>
          <dl className="vendor-details">
            <div>
              <dt>
                <MapPin size={15} aria-hidden="true" />
                Route
              </dt>
              <dd>{formatRouteLabel(routeStops)}</dd>
            </div>
            <div>
              <dt>
                <CalendarDays size={15} aria-hidden="true" />
                Pickup
              </dt>
              <dd>{shipment.pickupAt ? formatDateTime.format(shipment.pickupAt) : formatDate.format(shipment.request.pickupDate)}</dd>
            </div>
            <div>
              <dt>
                <IndianRupee size={15} aria-hidden="true" />
                Invoice
              </dt>
              <dd>{shipment.invoiceAmountPaise ? formatMoney.format(shipment.invoiceAmountPaise / 100) : "Pending"}</dd>
            </div>
          </dl>
        </section>

        <section className="vendor-card">
          <h2>Truck, driver, and invoice</h2>
          <OrderPortalForm shipment={shipment} accessToken={accessToken} />
        </section>
      </div>
    </main>
  );
}
