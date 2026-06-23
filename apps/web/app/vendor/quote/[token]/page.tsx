import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseRouteStops } from "@/lib/route-stops";
import { CalendarClock, CalendarDays, IndianRupee, MapPin, Package, Truck } from "lucide-react";
import { BiddingCountdown } from "./BiddingCountdown";
import { FinalQuoteForm, QuoteQuestionForm } from "./QuotePortalForms";

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
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata"
});

export default async function VendorQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quoteRequest = await prisma.quoteRequest.findFirst({
    where: {
      accessToken: token
    },
    include: {
      request: { include: { company: true } },
      transporter: true
    }
  });

  if (!quoteRequest) {
    notFound();
  }

  const request = quoteRequest.request;
  const routeStops = parseRouteStops(request.routeStops, request.pickupCity, request.dropCity);
  const companyTransporter = await prisma.companyTransporter.findUnique({
    where: {
      companyId_transporterId: {
        companyId: quoteRequest.companyId,
        transporterId: quoteRequest.transporterId
      }
    },
    select: { isBlacklisted: true }
  });
  const submittedQuoteCount = await prisma.quote.count({
    where: {
      requestId: quoteRequest.requestId,
      transporterId: quoteRequest.transporterId
    }
  });
  const isBlacklisted = Boolean(companyTransporter?.isBlacklisted);

  return (
    <main className="page vendor-page">
      <div className="vendor-shell">
        <header className="vendor-topbar">
          <div>
            <span className="vendor-mark">
              <Truck size={17} aria-hidden="true" />
              Vendor quote
            </span>
            <h1>{request.requestNumber}</h1>
            <p className="muted">{request.company.name}</p>
          </div>
          <span className="status approved">Secure WhatsApp link</span>
        </header>

        <section className="vendor-card vendor-summary">
          <div>
            <span className={`status ${quoteRequest.status.toLowerCase().replaceAll("_", "-")}`}>
              {quoteRequest.status.replaceAll("_", " ")}
            </span>
            <h2>{request.title}</h2>
            <p className="muted">Transport request for {request.material}</p>
          </div>
        </section>

        <section className="vendor-card">
          <h2>Request details</h2>
          <dl className="vendor-details">
            <div>
              <dt>
                <MapPin size={15} aria-hidden="true" />
                Route
              </dt>
              <dd>
                <div className="vendor-route-list">
                  {routeStops.map((stop, index) => (
                    <span key={`${stop.city}-${index}`}>
                      <strong>{index === 0 ? "Source" : index === routeStops.length - 1 ? "Destination" : `Stop ${index}`}</strong>
                      {stop.consigneeName ? `${stop.consigneeName} - ` : ""}
                      {stop.pincode ? `${stop.city} - ${stop.pincode}` : stop.city}
                      {stop.address ? ` - ${stop.address}` : ""}
                    </span>
                  ))}
                </div>
              </dd>
            </div>
            <div>
              <dt>
                <CalendarDays size={15} aria-hidden="true" />
                Dispatch
              </dt>
              <dd>{formatDateTime.format(request.pickupDate)}</dd>
            </div>
            <div>
              <dt>
                <CalendarClock size={15} aria-hidden="true" />
                Bidding closes
              </dt>
              <dd>
                {request.biddingDeadline ? (
                  <>
                    {formatDateTime.format(request.biddingDeadline)}
                    <br />
                    <BiddingCountdown deadline={request.biddingDeadline.toISOString()} />
                  </>
                ) : (
                  "Not set"
                )}
              </dd>
            </div>
            <div>
              <dt>
                <Package size={15} aria-hidden="true" />
                Load
              </dt>
              <dd>{request.quantity} - {request.truckRequirement}</dd>
            </div>
          </dl>
          {routeStops.some((stop) => stop.addressPhotoUrl) ? (
            <div className="route-photo-grid">
              {routeStops.map((stop, index) =>
                stop.addressPhotoUrl ? (
                  <a className="route-photo-card" href={stop.addressPhotoUrl} target="_blank" rel="noreferrer" key={`${stop.city}-${index}-photo`}>
                    <span>{index === 0 ? "Source" : index === routeStops.length - 1 ? "Destination" : `Stop ${index}`} address photo</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={stop.addressPhotoUrl} alt={`${stop.city} address`} />
                  </a>
                ) : null
              )}
            </div>
          ) : null}
          {request.notes ? <p className="vendor-note">{request.notes}</p> : null}
        </section>

        {quoteRequest.question ? (
          <section className="vendor-card vendor-alert">
            <strong>Your question</strong>
            <p>{quoteRequest.question}</p>
            {quoteRequest.questionAnswer ? (
              <>
                <strong>Company answer</strong>
                <p>{quoteRequest.questionAnswer}</p>
              </>
            ) : (
              <p className="muted">Waiting for company answer.</p>
            )}
          </section>
        ) : null}

        <section className="vendor-card">
          <h2>Need clarification?</h2>
          <QuoteQuestionForm quoteRequestId={quoteRequest.id} token={token} />
        </section>

        <section className="vendor-card">
          <h2>
            <IndianRupee size={18} aria-hidden="true" />
            Final quote
          </h2>
          {isBlacklisted ? (
            <p className="form-error">This vendor account is currently blacklisted and cannot submit bids for RFQs.</p>
          ) : submittedQuoteCount >= 2 ? (
            <p className="form-error">This RFQ already has 2 submitted quotes from your vendor account.</p>
          ) : (
            <FinalQuoteForm quoteRequestId={quoteRequest.id} token={token} />
          )}
        </section>
      </div>
    </main>
  );
}
