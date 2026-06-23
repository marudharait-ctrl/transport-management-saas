import { approveQuote } from "@/app/actions/quotes";
import { logout } from "@/app/actions/auth";
import { answerVendorQuestion } from "@/app/actions/vendor-questions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRouteLabel, parseRouteStops } from "@/lib/route-stops";
import { ArrowLeft, CheckCircle2, IndianRupee, LogOut, MessageCircleQuestion, Truck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const formatMoney = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
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

function statusClass(status: string) {
  return `status ${status.toLowerCase().replaceAll("_", "-")}`;
}

function detailString(details: unknown, key: string) {
  if (typeof details !== "object" || details === null || !(key in details)) {
    return null;
  }

  const value = (details as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function approvalNotificationStatus(
  events: { action: string; details: unknown }[],
  transporter: { name: string; primaryPhone: string }
) {
  return events.find((event) => {
    const transporterName = detailString(event.details, "transporter");
    const primaryPhone = detailString(event.details, "primaryPhone");
    return transporterName === transporter.name || primaryPhone === transporter.primaryPhone;
  });
}

function bidRankClass(index: number, total: number) {
  if (total <= 1 || index === 0) {
    return "bid-lowest";
  }

  if (index === total - 1) {
    return "bid-highest";
  }

  return "bid-middle";
}

export default async function QuoteDetailPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const currentUser = await requireUser();
  const request = await prisma.transportRequest.findFirst({
    where: {
      id: requestId,
      companyId: currentUser.companyId
    },
    include: {
      quoteRequests: {
        where: { question: { not: null } },
        include: { transporter: true },
        orderBy: { questionAt: "desc" }
      },
      quotes: {
        include: { transporter: true },
        orderBy: [{ amountPaise: "asc" }, { createdAt: "asc" }]
      },
      shipment: true,
      auditEvents: {
        where: {
          action: { in: ["quote_approval.whatsapp_sent", "quote_approval.whatsapp_failed"] }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!request) {
    notFound();
  }

  const routeStops = parseRouteStops(request.routeStops, request.pickupCity, request.dropCity);
  const approvedQuote = request.quotes.find((quote) => quote.status === "APPROVED") ?? null;

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <span className="eyebrow">RFQ Detail</span>
            <h1>{request.requestNumber}</h1>
            <p>{formatRouteLabel(routeStops)}</p>
          </div>
          <div className="actions">
            <Link className="button" href="/quotes">
              <ArrowLeft size={16} aria-hidden="true" />
              RFQ list
            </Link>
            <form action={logout}>
              <button className="button icon-button-text" type="submit">
                <LogOut size={16} aria-hidden="true" />
                Sign out
              </button>
            </form>
          </div>
        </header>

        <section className="panel rfq-detail-summary">
          <div>
            <h2>{request.title}</h2>
            <p className="muted">
              {request.material} - {request.quantity} - {request.truckRequirement}
            </p>
          </div>
          <dl className="quote-details">
            <div>
              <dt>Status</dt>
              <dd>
                <span className={statusClass(request.status)}>{request.status.replaceAll("_", " ")}</span>
              </dd>
            </div>
            <div>
              <dt>Pickup</dt>
              <dd>{formatDateTime.format(request.pickupDate)}</dd>
            </div>
            <div>
              <dt>Bidding closes</dt>
              <dd>{request.biddingDeadline ? formatDateTime.format(request.biddingDeadline) : "Not set"}</dd>
            </div>
          </dl>
          {approvedQuote ? (
            <div className="order-strip">
              <span>
                <strong>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  Bid approved
                </strong>
                <small>
                  {approvedQuote.transporter.name} at {formatMoney.format(approvedQuote.amountPaise / 100)}. Shipment module now owns documents, tracking,
                  invoice, and payment.
                </small>
              </span>
              {request.shipment ? (
                <Link className="button compact" href="/shipments">
                  View Shipments
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>

        {request.quoteRequests.length > 0 ? (
          <section className="panel">
            <div className="panel-title">
              <h2>
                <MessageCircleQuestion size={18} aria-hidden="true" />
                Vendor questions
              </h2>
              <span className="count-pill">{request.quoteRequests.length}</span>
            </div>
            <div className="quotes">
              {request.quoteRequests.map((quoteRequest) => (
                <article className="quote vendor-question-card" key={`question-${quoteRequest.id}`}>
                  <div className="vendor-question">
                    <strong>{quoteRequest.transporter.name}</strong>
                    <p>{quoteRequest.question}</p>
                    {quoteRequest.questionAnswer ? (
                      <p className="answer-line">
                        <strong>Answer:</strong> {quoteRequest.questionAnswer}
                      </p>
                    ) : (
                      <form className="question-answer-form" action={answerVendorQuestion}>
                        <input type="hidden" name="quoteRequestId" value={quoteRequest.id} />
                        <textarea name="answer" rows={2} placeholder="Reply to vendor question" required />
                        <button className="button compact primary" type="submit">
                          Send answer
                        </button>
                      </form>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="panel">
          <div className="panel-title">
            <h2>
              <IndianRupee size={18} aria-hidden="true" />
              Bid history
            </h2>
            <span className="count-pill">{request.quotes.length}</span>
          </div>

          <div className="quotes quote-board-grid">
            {request.quotes.length === 0 ? (
              <div className="empty-state">
                <strong>No bids yet</strong>
                <p className="muted">Vendor quotes will appear here in ascending order.</p>
              </div>
            ) : null}

            {request.quotes.map((quote, index) => {
              const approvalNotification = approvalNotificationStatus(request.auditEvents, quote.transporter);
              const rankClass = bidRankClass(index, request.quotes.length);

              return (
                <article className={`quote quote-card bid-card ${rankClass} ${quote.status === "APPROVED" ? "approved-quote" : ""}`} key={quote.id}>
                  <div className="quote-row">
                    <div>
                      <strong>{quote.transporter.name}</strong>
                      <p className="muted">
                        <Truck size={14} aria-hidden="true" />
                        {quote.truckType || "Truck details pending"}
                      </p>
                    </div>
                    <span className="money">{formatMoney.format(quote.amountPaise / 100)}</span>
                  </div>
                  <dl className="quote-details">
                    <div>
                      <dt>Status</dt>
                      <dd>
                        <span className={statusClass(quote.status)}>{quote.status.replaceAll("_", " ")}</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Received</dt>
                      <dd>{formatDateTime.format(quote.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>Via</dt>
                      <dd>
                        {quote.receivedVia}
                        {quote.aiExtracted ? " / AI" : ""}
                      </dd>
                    </div>
                  </dl>
                  {quote.notes ? <p className="muted">{quote.notes}</p> : null}
                  {quote.status === "APPROVED" ? (
                    approvalNotification?.action === "quote_approval.whatsapp_sent" ? (
                      <p className="approval-note">Vendor has been notified on WhatsApp.</p>
                    ) : approvalNotification?.action === "quote_approval.whatsapp_failed" ? (
                      <p className="form-error">WhatsApp notification failed. Share the shipment link manually or retry after fixing sender access.</p>
                    ) : (
                      <p className="approval-note">Shipment created. WhatsApp notification is pending.</p>
                    )
                  ) : quote.status !== "REJECTED" && !approvedQuote ? (
                    <form className="quote-actions" action={approveQuote}>
                      <input type="hidden" name="quoteId" value={quote.id} />
                      <button className="button compact primary" type="submit">
                        Approve bid and create shipment
                      </button>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
