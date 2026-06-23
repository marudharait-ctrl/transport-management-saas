import {
  addLoadingPoint,
  advanceInvoicePaymentStatus,
  approveDeliveryPod,
  approveDriverDetails,
  approveFinalDelivery,
  markShipmentInTransit,
  startLoading,
  uploadLoadingWeightSlip
} from "@/app/actions/shipments";
import { logout } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRouteLabel, parseRouteStops } from "@/lib/route-stops";
import { Bell, ExternalLink, FileText, LogOut, PackageCheck, Plus, Route } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

function docLinks(details: unknown) {
  return [
    ["Driver license", detailString(details, "driverLicenseDocumentUrl")],
    ["Vehicle RC", detailString(details, "vehicleRcDocumentUrl")],
    ["Truck image", detailString(details, "truckImageUrl")],
    ["Weight slip", detailString(details, "weightSlipUrl")],
    ["POD", detailString(details, "podDocumentUrl")],
    ["Invoice", detailString(details, "invoiceDocumentUrl")]
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
}

export default async function ShipmentsPage() {
  const currentUser = await requireUser();
  const shipments = await prisma.shipment.findMany({
    where: { companyId: currentUser.companyId },
    orderBy: { createdAt: "desc" },
    include: {
      request: {
        include: {
          quoteRequests: true,
          auditEvents: {
            orderBy: { createdAt: "desc" },
            take: 30
          }
        }
      },
      transporter: true,
      loadingPoints: { orderBy: { pointIndex: "asc" } },
      deliveryStops: { orderBy: { stopIndex: "asc" } },
      notifications: {
        where: { recipientType: "ADMIN" },
        orderBy: { createdAt: "desc" },
        take: 6
      }
    }
  });

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <span className="eyebrow">Shipments</span>
            <h1>Shipment workflow</h1>
            <p>Driver approval, loading, transit, POD approvals, invoice, payment, and full audit trail.</p>
          </div>
          <div className="actions">
            <Link className="button" href="/">
              Dashboard
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
              <PackageCheck size={18} aria-hidden="true" />
              Active shipments
            </h2>
            <span className="count-pill">{shipments.length}</span>
          </div>
          <div className="request-list">
            {shipments.length === 0 ? (
              <div className="empty-state">
                <strong>No shipments yet</strong>
                <p className="muted">Approve a bid from an RFQ to create a shipment.</p>
              </div>
            ) : null}

            {shipments.map((shipment) => {
              const routeStops = parseRouteStops(shipment.request.routeStops, shipment.request.pickupCity, shipment.request.dropCity);
              const allPodApproved =
                shipment.deliveryStops.length > 0 && shipment.deliveryStops.every((stop) => stop.podDocumentUrl && stop.biltyDocumentUrl && stop.podApprovedAt);
              const vendorToken = shipment.request.quoteRequests.find((quoteRequest) => quoteRequest.transporterId === shipment.transporterId)?.accessToken;

              return (
                <article className="request shipment-card" key={shipment.id}>
                  <div className="request-head">
                    <div>
                      <h3>{shipment.request.requestNumber}</h3>
                      <p className="muted">{formatRouteLabel(routeStops)}</p>
                      <p className="muted">
                        {shipment.transporter.name}
                        {shipment.vehicleNumber ? ` - ${shipment.vehicleNumber}` : ""}
                      </p>
                    </div>
                    <div className="request-head-actions">
                      <span className={statusClass(shipment.status)}>{shipment.status.replaceAll("_", " ")}</span>
                      <Link className="button compact" href={`/vendor/order/${vendorToken ?? shipment.id}`}>
                        <ExternalLink size={15} aria-hidden="true" />
                        Vendor order
                      </Link>
                    </div>
                  </div>

                  <div className="workflow-block">
                    <div className="workflow-title">
                      <strong>Truck and driver details</strong>
                      <span>DRIVER_DETAILS_SUBMITTED - ADMIN_APPROVAL_REQUIRED - DRIVER_DETAILS_APPROVED</span>
                    </div>
                    <div className="vendor-link-row">
                      <div>
                        <strong>{shipment.driverName ?? "Driver details pending"}</strong>
                        {shipment.driverPhone ? <span>{shipment.driverPhone}</span> : null}
                      </div>
                      <div className="portal-actions">
                        {shipment.driverLicenseDocumentUrl ? <a className="button compact" href={shipment.driverLicenseDocumentUrl} target="_blank" rel="noreferrer">Driver license</a> : null}
                        {shipment.vehicleRcDocumentUrl ? <a className="button compact" href={shipment.vehicleRcDocumentUrl} target="_blank" rel="noreferrer">Vehicle RC</a> : null}
                        {shipment.truckImageUrl ? <a className="button compact" href={shipment.truckImageUrl} target="_blank" rel="noreferrer">Truck image</a> : null}
                        {["DRIVER_DETAILS_SUBMITTED", "ADMIN_APPROVAL_REQUIRED"].includes(shipment.status) ? (
                          <form action={approveDriverDetails}>
                            <input type="hidden" name="shipmentId" value={shipment.id} />
                            <button className="button compact primary" type="submit">Approve driver details</button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="workflow-block">
                    <div className="workflow-title">
                      <strong>
                        <Route size={16} aria-hidden="true" />
                        Loading
                      </strong>
                      <span>Final loading point weight slip unlocks In Transit</span>
                    </div>
                    <div className="vendor-link-list">
                      {shipment.loadingPoints.map((point) => (
                        <div className="vendor-link-row" key={point.id}>
                          <div>
                            <strong>{point.label ?? `Loading Point ${point.pointIndex}`}</strong>
                            <span>{point.pincode ? `${point.city} - ${point.pincode}` : point.city}</span>
                            {point.isFinal ? <span className="status approved">Final loading point</span> : null}
                          </div>
                          <div className="portal-actions">
                            {point.weightSlipUrl ? (
                              <a className="button compact" href={point.weightSlipUrl} target="_blank" rel="noreferrer">Open weight slip</a>
                            ) : ["LOADING_IN_PROCESS", "LOADING_POINT_COMPLETED"].includes(shipment.status) ? (
                              <form action={uploadLoadingWeightSlip}>
                                <input type="hidden" name="shipmentId" value={shipment.id} />
                                <input type="hidden" name="loadingPointId" value={point.id} />
                                <input name="weightSlipFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required />
                                <button className="button compact primary" type="submit">Upload weight slip</button>
                              </form>
                            ) : (
                              <span className="status open">Pending</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {shipment.status === "DRIVER_DETAILS_APPROVED" ? (
                      <form className="inline-grid-form" action={startLoading}>
                        <input type="hidden" name="shipmentId" value={shipment.id} />
                        <button className="button compact primary" type="submit">Start loading</button>
                      </form>
                    ) : null}
                    {["DRIVER_DETAILS_APPROVED", "LOADING_IN_PROCESS", "LOADING_POINT_COMPLETED"].includes(shipment.status) ? (
                      <form className="inline-grid-form" action={addLoadingPoint}>
                        <input type="hidden" name="shipmentId" value={shipment.id} />
                        <input name="label" placeholder="Loading Point 2" />
                        <input name="city" placeholder="City" required />
                        <input name="pincode" placeholder="Pincode" />
                        <input name="address" placeholder="Address" />
                        <button className="button compact" type="submit">
                          <Plus size={15} aria-hidden="true" />
                          Add loading point
                        </button>
                      </form>
                    ) : null}
                    {shipment.status === "FINAL_WEIGHT_SLIP_UPLOADED" ? (
                      <form className="inline-grid-form" action={markShipmentInTransit}>
                        <input type="hidden" name="shipmentId" value={shipment.id} />
                        <button className="button compact primary" type="submit">Move to In Transit</button>
                      </form>
                    ) : null}
                  </div>

                  <div className="workflow-block">
                    <div className="workflow-title">
                      <strong>Delivery POD approvals</strong>
                      <span>Admin approval is required after every POD upload</span>
                    </div>
                    <div className="vendor-link-list">
                      {shipment.deliveryStops.map((stop) => (
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
                            {stop.podApprovedAt ? (
                              <span className="status approved">POD approved</span>
                            ) : stop.podDocumentUrl && stop.biltyDocumentUrl ? (
                              <form action={approveDeliveryPod}>
                                <input type="hidden" name="shipmentId" value={shipment.id} />
                                <input type="hidden" name="deliveryStopId" value={stop.id} />
                                <button className="button compact primary" type="submit">Approve delivery</button>
                              </form>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                    {shipment.status === "ALL_DELIVERIES_COMPLETED" && allPodApproved ? (
                      <form className="inline-grid-form" action={approveFinalDelivery}>
                        <input type="hidden" name="shipmentId" value={shipment.id} />
                        <button className="button compact primary" type="submit">Approve final delivery</button>
                      </form>
                    ) : null}
                  </div>

                  <div className="workflow-block">
                    <div className="workflow-title">
                      <strong>Invoice and payment</strong>
                      <span>Enabled after final delivery approval</span>
                    </div>
                    <div className="vendor-link-row">
                      <div>
                        <strong>{shipment.invoiceNumber ?? "Invoice pending"}</strong>
                        {shipment.invoiceAmountPaise ? <span>INR {Math.round(shipment.invoiceAmountPaise / 100).toLocaleString("en-IN")}</span> : null}
                      </div>
                      <div className="portal-actions">
                        {shipment.invoiceDocumentUrl ? <a className="button compact" href={shipment.invoiceDocumentUrl} target="_blank" rel="noreferrer">Open invoice</a> : null}
                        {shipment.status === "INVOICE_SUBMITTED" ? (
                          <form action={advanceInvoicePaymentStatus}>
                            <input type="hidden" name="shipmentId" value={shipment.id} />
                            <input type="hidden" name="nextStatus" value="INVOICE_VERIFIED" />
                            <button className="button compact primary" type="submit">Verify invoice</button>
                          </form>
                        ) : null}
                        {shipment.status === "INVOICE_VERIFIED" ? (
                          <form action={advanceInvoicePaymentStatus}>
                            <input type="hidden" name="shipmentId" value={shipment.id} />
                            <input type="hidden" name="nextStatus" value="PAYMENT_PROCESSED" />
                            <button className="button compact primary" type="submit">Payment processed</button>
                          </form>
                        ) : null}
                        {shipment.status === "PAYMENT_PROCESSED" ? (
                          <form action={advanceInvoicePaymentStatus}>
                            <input type="hidden" name="shipmentId" value={shipment.id} />
                            <input type="hidden" name="nextStatus" value="PAYMENT_COMPLETED" />
                            <button className="button compact primary" type="submit">Payment completed</button>
                          </form>
                        ) : null}
                        {shipment.status === "PAYMENT_COMPLETED" ? (
                          <form action={advanceInvoicePaymentStatus}>
                            <input type="hidden" name="shipmentId" value={shipment.id} />
                            <input type="hidden" name="nextStatus" value="ORDER_CLOSED" />
                            <button className="button compact primary" type="submit">Close order</button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="workflow-block">
                    <div className="workflow-title">
                      <strong>
                        <Bell size={16} aria-hidden="true" />
                        Recent notifications
                      </strong>
                      <span>{shipment.notifications.length}</span>
                    </div>
                    <ul className="timeline">
                      {shipment.notifications.map((notification) => (
                        <li key={notification.id}>
                          <strong>{notification.title}</strong>
                          <span>{formatDateTime.format(notification.createdAt)} - {notification.body}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="workflow-block">
                    <div className="workflow-title">
                      <strong>
                        <FileText size={16} aria-hidden="true" />
                        Shipment timeline
                      </strong>
                      <span>Full audit trail</span>
                    </div>
                    <ul className="timeline">
                      {shipment.request.auditEvents.map((event) => (
                        <li key={event.id}>
                          <strong>{event.action.replaceAll("_", " ").replaceAll(".", " - ")}</strong>
                          <span>
                            {formatDateTime.format(event.createdAt)} - {event.actorName} - {event.actorType}
                          </span>
                          {docLinks(event.details).length > 0 ? (
                            <span className="uploaded-doc-list">
                              {docLinks(event.details).map(([label, url]) => (
                                <a className="button compact" href={url} target="_blank" rel="noreferrer" key={url}>{label}</a>
                              ))}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
