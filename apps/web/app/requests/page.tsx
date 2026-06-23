import { sendQuoteRequest } from "@/app/actions/broadcasts";
import {
  advanceInvoicePaymentStatus,
  approveDeliveryPod,
  approveDriverDetails,
  approveFinalDelivery,
  markShipmentInTransit,
  startLoading,
  uploadLoadingWeightSlip
} from "@/app/actions/shipments";
import { answerVendorQuestion } from "@/app/actions/vendor-questions";
import { logout } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRouteLabel, parseRouteStops } from "@/lib/route-stops";
import { BarChart3, ExternalLink, LogOut, MessageCircleQuestion, Plus, RefreshCw, Send } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const formatDate = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

const formatDateTimeIst = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
  timeZoneName: "short"
});

const formatMoney = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

function statusClass(status: string) {
  return `status ${status.toLowerCase().replaceAll("_", "-")}`;
}

export default async function RequestsPage() {
  const currentUser = await requireUser();
  const requests = await prisma.transportRequest.findMany({
    where: { companyId: currentUser.companyId },
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: true,
      quotes: {
        include: { transporter: true },
        orderBy: { amountPaise: "asc" }
      },
      quoteRequests: {
        include: { transporter: true },
        orderBy: { createdAt: "asc" }
      },
      shipment: {
        include: {
          transporter: true,
          loadingPoints: { orderBy: { pointIndex: "asc" } },
          deliveryStops: { orderBy: { stopIndex: "asc" } }
        }
      }
    }
  });

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <span className="eyebrow">Requests</span>
            <h1>Request and vendor links</h1>
            <p>Review transport requests and open/send vendor quote links.</p>
          </div>
          <div className="actions">
            <Link className="button" href="/">
              Dashboard
            </Link>
            <Link className="button primary" href="/requests/new">
              <Plus size={16} aria-hidden="true" />
              New request
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
            <h2>All requests</h2>
            <span className="count-pill">{requests.length}</span>
          </div>
          <div className="request-list">
            {requests.length === 0 ? (
              <div className="empty-state">
                <strong>No requests yet</strong>
                <p className="muted">Create a request, select vendors, then send quote links.</p>
              </div>
            ) : null}

            {requests.map((request) => (
              <article className="request" key={request.id}>
                {(() => {
                  const routeStops = parseRouteStops(request.routeStops, request.pickupCity, request.dropCity);

                  return (
                    <>
                <div className="request-head">
                  <div>
                    <h3>{request.title}</h3>
                    <p className="muted">
                      {request.requestNumber} - raised by {request.requestedBy.name}
                    </p>
                    <p className="muted">Created {formatDateTimeIst.format(request.createdAt)}</p>
                  </div>
                  <div className="request-head-actions">
                    <span className={statusClass(request.status)}>{request.status.replaceAll("_", " ")}</span>
                    <Link className="button compact" href={`/quotes/${request.id}`}>
                      <BarChart3 size={15} aria-hidden="true" />
                      Compare quotes
                    </Link>
                  </div>
                </div>

                <dl className="details">
                  <div>
                    <dt>Route</dt>
                    <dd>{formatRouteLabel(routeStops)}</dd>
                  </div>
                  <div>
                    <dt>Load</dt>
                    <dd>
                      {request.quantity} - {request.material}
                    </dd>
                  </div>
                  <div>
                    <dt>Pickup</dt>
                    <dd>{formatDateTimeIst.format(request.pickupDate)}</dd>
                  </div>
                </dl>

                <div className="route-stop-list">
                  {routeStops.map((stop, index) => (
                    <div className="route-stop-summary" key={`${stop.city}-${index}`}>
                      <strong>{index === 0 ? "Source" : index === routeStops.length - 1 ? "Destination" : `Stop ${index}`}</strong>
                      {stop.consigneeName ? <span>{stop.consigneeName}</span> : null}
                      <span>{stop.pincode ? `${stop.city} - ${stop.pincode}` : stop.city}</span>
                      {stop.address ? <small>{stop.address}</small> : null}
                      {stop.addressPhotoUrl ? (
                        <a className="route-photo-link" href={stop.addressPhotoUrl} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img className="route-photo-thumb" src={stop.addressPhotoUrl} alt={`${stop.city} address`} />
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>

                {request.quotes.length > 0 ? (
                  <div className="workflow-block">
                    <div className="workflow-title">
                      <strong>Submitted vendor quotes</strong>
                      <span>{request.quotes.length} quote{request.quotes.length === 1 ? "" : "s"}</span>
                    </div>
                    <div className="vendor-link-list">
                      {request.quotes.map((quote) => (
                        <div className="vendor-link-row" key={quote.id}>
                          <div>
                            <strong>{quote.transporter.name}</strong>
                            <span className={statusClass(quote.status)}>{quote.status.replaceAll("_", " ")}</span>
                          </div>
                          <div className="portal-actions">
                            <strong className="money">{formatMoney.format(quote.amountPaise / 100)}</strong>
                            <Link className="button compact" href={`/quotes/${request.id}`}>
                              Compare
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {request.quoteRequests.length > 0 ? (
                  <div className="workflow-block">
                    <div className="workflow-title">
                      <strong>Vendor quote links</strong>
                      <span>{request.quoteRequests.length} vendor{request.quoteRequests.length === 1 ? "" : "s"}</span>
                    </div>
                    <div className="vendor-link-list">
                      {request.quoteRequests.map((quoteRequest) => (
                        <div className="vendor-question-card" key={quoteRequest.id}>
                          <div className="vendor-link-row">
                            <div>
                              <strong>{quoteRequest.transporter.name}</strong>
                              <span className={statusClass(quoteRequest.status)}>{quoteRequest.status.replaceAll("_", " ")}</span>
                            </div>
                            <div className="portal-actions">
                              <Link className="button compact" href={`/vendor/quote/${quoteRequest.accessToken}`}>
                                <ExternalLink size={15} aria-hidden="true" />
                                Quote page
                              </Link>
                              <form action={sendQuoteRequest}>
                                <input type="hidden" name="quoteRequestId" value={quoteRequest.id} />
                                <button className="button compact" type="submit">
                                  {quoteRequest.status === "SENT" ? (
                                    <>
                                      <RefreshCw size={15} aria-hidden="true" />
                                      Resend
                                    </>
                                  ) : quoteRequest.status === "FAILED" ? (
                                    <>
                                      <RefreshCw size={15} aria-hidden="true" />
                                      Retry
                                    </>
                                  ) : (
                                    <>
                                      <Send size={15} aria-hidden="true" />
                                      Send
                                    </>
                                  )}
                                </button>
                              </form>
                            </div>
                          </div>
                          {quoteRequest.question ? (
                            <div className="vendor-question">
                              <strong>
                                <MessageCircleQuestion size={15} aria-hidden="true" />
                                Vendor question
                              </strong>
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
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {request.shipment ? (
                  <div className="order-strip">
                    <div>
                      <strong>Confirmed order</strong>
                      <p className="muted">
                        {request.shipment.transporter.name} - {request.shipment.status.replaceAll("_", " ").toLowerCase()}
                        {request.shipment.vehicleNumber ? ` - ${request.shipment.vehicleNumber}` : ""}
                      </p>
                    </div>
                    <Link className="button compact" href={`/shipments`}>
                      <ExternalLink size={15} aria-hidden="true" />
                      Order page
                    </Link>
                  </div>
                ) : null}

                {request.shipment ? (
                  <div className="workflow-block">
                    <div className="workflow-title">
                      <strong>Order workflow</strong>
                      <span>{request.shipment.status.replaceAll("_", " ")}</span>
                    </div>
                    <div className="vendor-link-list">
                      <div className="vendor-link-row">
                        <div>
                          <strong>{request.shipment.transporter.name}</strong>
                          <span className={statusClass(request.shipment.status)}>{request.shipment.status.replaceAll("_", " ")}</span>
                          {request.shipment.driverName ? (
                            <span>{request.shipment.driverName} - {request.shipment.driverPhone}</span>
                          ) : null}
                        </div>
                        <div className="portal-actions">
                          {request.shipment.driverLicenseDocumentUrl ? (
                            <a className="button compact" href={request.shipment.driverLicenseDocumentUrl} target="_blank" rel="noreferrer">Driver license</a>
                          ) : null}
                          {request.shipment.vehicleRcDocumentUrl ? (
                            <a className="button compact" href={request.shipment.vehicleRcDocumentUrl} target="_blank" rel="noreferrer">Vehicle RC</a>
                          ) : null}
                          {request.shipment.truckImageUrl ? (
                            <a className="button compact" href={request.shipment.truckImageUrl} target="_blank" rel="noreferrer">Truck image</a>
                          ) : null}
                          {request.shipment.weightSlipDocumentUrl ? (
                            <a className="button compact" href={request.shipment.weightSlipDocumentUrl} target="_blank" rel="noreferrer">Weight slip</a>
                          ) : null}
                          {request.shipment.invoiceDocumentUrl ? (
                            <a className="button compact" href={request.shipment.invoiceDocumentUrl} target="_blank" rel="noreferrer">Invoice</a>
                          ) : null}
                          {["DRIVER_DETAILS_SUBMITTED", "ADMIN_APPROVAL_REQUIRED"].includes(request.shipment.status) ? (
                            <form action={approveDriverDetails}>
                              <input type="hidden" name="shipmentId" value={request.shipment.id} />
                              <button className="button compact primary" type="submit">Approve driver details</button>
                            </form>
                          ) : null}
                          {request.shipment.status === "DRIVER_DETAILS_APPROVED" ? (
                            <form action={startLoading}>
                              <input type="hidden" name="shipmentId" value={request.shipment.id} />
                              <button className="button compact primary" type="submit">Start loading</button>
                            </form>
                          ) : null}
                          {request.shipment.status === "FINAL_WEIGHT_SLIP_UPLOADED" ? (
                            <form action={markShipmentInTransit}>
                              <input type="hidden" name="shipmentId" value={request.shipment.id} />
                              <button className="button compact primary" type="submit">Mark in transit</button>
                            </form>
                          ) : null}
                          {request.shipment.status === "ALL_DELIVERIES_COMPLETED" ? (
                            <form action={approveFinalDelivery}>
                              <input type="hidden" name="shipmentId" value={request.shipment.id} />
                              <button className="button compact primary" type="submit">Approve final delivery</button>
                            </form>
                          ) : null}
                          {request.shipment.status === "INVOICE_SUBMITTED" ? (
                            <form action={advanceInvoicePaymentStatus}>
                              <input type="hidden" name="shipmentId" value={request.shipment.id} />
                              <input type="hidden" name="nextStatus" value="INVOICE_VERIFIED" />
                              <button className="button compact primary" type="submit">Verify invoice</button>
                            </form>
                          ) : null}
                          {request.shipment.status === "INVOICE_VERIFIED" ? (
                            <form action={advanceInvoicePaymentStatus}>
                              <input type="hidden" name="shipmentId" value={request.shipment.id} />
                              <input type="hidden" name="nextStatus" value="PAYMENT_PROCESSED" />
                              <button className="button compact primary" type="submit">Payment processed</button>
                            </form>
                          ) : null}
                          {request.shipment.status === "PAYMENT_PROCESSED" ? (
                            <form action={advanceInvoicePaymentStatus}>
                              <input type="hidden" name="shipmentId" value={request.shipment.id} />
                              <input type="hidden" name="nextStatus" value="PAYMENT_COMPLETED" />
                              <button className="button compact primary" type="submit">Payment completed</button>
                            </form>
                          ) : null}
                          {request.shipment.status === "PAYMENT_COMPLETED" ? (
                            <form action={advanceInvoicePaymentStatus}>
                              <input type="hidden" name="shipmentId" value={request.shipment.id} />
                              <input type="hidden" name="nextStatus" value="ORDER_CLOSED" />
                              <button className="button compact primary" type="submit">Close order</button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                      {request.shipment.loadingPoints.map((point) => (
                        <div className="vendor-link-row" key={point.id}>
                          <div>
                            <strong>{point.label ?? `Loading Point ${point.pointIndex}`}</strong>
                            <span>{point.pincode ? `${point.city} - ${point.pincode}` : point.city}</span>
                            {point.isFinal ? <span className="status approved">Final loading point</span> : null}
                          </div>
                          <div className="portal-actions">
                            {point.weightSlipUrl ? (
                              <a className="button compact" href={point.weightSlipUrl} target="_blank" rel="noreferrer">Weight slip</a>
                            ) : ["LOADING_IN_PROCESS", "LOADING_POINT_COMPLETED"].includes(request.shipment!.status) ? (
                              <form action={uploadLoadingWeightSlip}>
                                <input type="hidden" name="shipmentId" value={request.shipment!.id} />
                                <input type="hidden" name="loadingPointId" value={point.id} />
                                <input name="weightSlipFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required />
                                <button className="button compact primary" type="submit">Upload slip</button>
                              </form>
                            ) : null}
                          </div>
                        </div>
                      ))}
                      {request.shipment.deliveryStops.map((stop) => (
                        <div className="vendor-link-row" key={stop.id}>
                          <div>
                            <strong>{stop.consigneeName ?? `Delivery ${stop.stopIndex}`}</strong>
                            <span>{stop.pincode ? `${stop.city} - ${stop.pincode}` : stop.city}</span>
                          </div>
                          <div className="portal-actions">
                            {stop.podDocumentUrl ? (
                              <a className="button compact" href={stop.podDocumentUrl} target="_blank" rel="noreferrer">Open GRN/POD</a>
                            ) : (
                              <span className="status open">POD pending</span>
                            )}
                            {stop.biltyDocumentUrl ? (
                              <a className="button compact" href={stop.biltyDocumentUrl} target="_blank" rel="noreferrer">Open Bilty</a>
                            ) : (
                              <span className="status open">Bilty pending</span>
                            )}
                            {stop.completedAt ? <span className="status approved">Completed</span> : null}
                            {stop.podDocumentUrl && stop.biltyDocumentUrl && !stop.podApprovedAt ? (
                              <form action={approveDeliveryPod}>
                                <input type="hidden" name="shipmentId" value={request.shipment!.id} />
                                <input type="hidden" name="deliveryStopId" value={stop.id} />
                                <button className="button compact primary" type="submit">Approve delivery</button>
                              </form>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                </>
                  );
                })()}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
