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
  material: string;
  quantity: string;
  truckRequirement: string;
  pickupDate: Date | string;
  targetDeliveryDate: Date | string | null;
  notes: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata"
});

function formatDate(value: Date | string | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(`${value}T09:00:00.000+05:30`);
  return Number.isNaN(date.getTime()) ? String(value) : dateFormatter.format(date);
}

function formatLoadType(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function locationLine(city: string, pincode: string | null) {
  return pincode ? `${city} - ${pincode}` : city;
}

function stateLine(label: string, value?: string | null) {
  if (!value || value === "TBD") {
    return null;
  }

  return `${label}: ${value}`;
}

export function buildQuoteRequestMessage(input: QuoteMessageInput) {
  const targetDelivery = formatDate(input.targetDeliveryDate);

  return [
    `Transport quote request from ${input.companyName}`,
    "",
    `Request no: ${input.requestNumber}`,
    `Request date: ${formatDate(input.requestDate)}`,
    `Requested by: ${input.requestedByName}`,
    input.status ? `Status: ${formatLoadType(input.status)}` : null,
    `Title: ${input.title}`,
    `Load type: ${formatLoadType(input.loadType)}`,
    "",
    `Pickup: ${locationLine(input.pickupCity, input.pickupPincode)}`,
    stateLine("Pickup state", input.pickupState),
    `Drop: ${locationLine(input.dropCity, input.dropPincode)}`,
    stateLine("Drop state", input.dropState),
    `Dispatch date: ${formatDate(input.pickupDate)}`,
    targetDelivery ? `Target delivery: ${targetDelivery}` : null,
    "",
    `Material: ${input.material}`,
    `Quantity: ${input.quantity}`,
    `Truck requirement: ${input.truckRequirement}`,
    input.notes ? `Notes: ${input.notes}` : null,
    "",
    "Please reply with:",
    "1. Freight amount",
    "2. Truck availability date",
    "3. Transit time",
    "4. Payment terms"
  ]
    .filter((line) => line !== null)
    .join("\n");
}
