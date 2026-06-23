type QuoteMessageInput = {
  companyName: string;
  requestNumber: string;
  requestDate: Date | string;
  requestedByName: string;
  title: string;
  loadType: string;
  status?: string;
  pickupCity: string;
  pickupState?: string | null;
  pickupPincode: string | null;
  dropCity: string;
  dropState?: string | null;
  dropPincode: string | null;
  routeLabel?: string | null;
  routeSummary?: string | null;
  routeDetails?: string | null;
  material: string;
  quantity: string;
  truckRequirement: string;
  pickupDate: Date | string;
  biddingDeadline?: Date | string | null;
  targetDeliveryDate: Date | string | null;
  notes: string | null;
  quoteUrl?: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata"
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kolkata"
});

function formatDate(value: Date | string | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value.includes("T") ? `${value}:00.000+05:30` : `${value}T09:00:00.000+05:30`);
  return Number.isNaN(date.getTime()) ? String(value) : dateFormatter.format(date);
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value.includes("T") ? `${value}:00.000+05:30` : value);
  return Number.isNaN(date.getTime()) ? String(value) : dateTimeFormatter.format(date);
}

function locationLine(city: string, _state?: string | null) {
  return city;
}

export function buildQuoteRequestMessage(input: QuoteMessageInput) {
  const targetDelivery = formatDateTime(input.targetDeliveryDate);
  const biddingDeadline = formatDateTime(input.biddingDeadline);
  const route =
    input.routeSummary ||
    input.routeLabel ||
    `${locationLine(input.pickupCity, input.pickupState)} -> ${locationLine(input.dropCity, input.dropState)}`;

  return [
    "This transport quote request has been sent by Marudhara Group.",
    "",
    "Transport Quote Request",
    "",
    `Request No: ${input.requestNumber}`,
    `Route: ${route}`,
    `Dispatch: ${formatDateTime(input.pickupDate)}`,
    targetDelivery ? `Target Delivery: ${targetDelivery}` : null,
    "",
    `Material: ${input.material}`,
    `Quantity: ${input.quantity}`,
    `Truck Requirement: ${input.truckRequirement}`,
    "",
    biddingDeadline ? `Bid Closing Date & Time: ${biddingDeadline}` : null,
    "",
    "Submit Quote:",
    input.quoteUrl ?? null
  ]
    .filter((line) => line !== null)
    .join("\n");
}
