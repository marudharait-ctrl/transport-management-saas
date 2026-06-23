export type RouteStop = {
  city: string;
  state?: string | null;
  pincode?: string | null;
  address: string;
  consigneeName?: string | null;
  addressPhotoUrl?: string | null;
};

export const sourceUnitOptions = [
  {
    id: "unit-1-noida",
    name: "Unit 1: Marudhara Polypack Industries",
    city: "Noida",
    state: "Uttar Pradesh",
    pincode: "201307",
    address: "F-458, Sector 63 Rd, F Block, Industrial Area, Noida, Chotpur, Uttar Pradesh- 201307, India"
  },
  {
    id: "unit-2-boranada",
    name: "Unit 2: Marudhara Polypack Pvt. Ltd.",
    city: "Boranada",
    state: "Rajasthan",
    pincode: "342012",
    address: "F-661, 662, G-681, RIICO Industrial Area, Phase 4, Boranada, Jodhpur, Rajasthan - 342012, India"
  },
  {
    id: "unit-3-kiamsariya",
    name: "Unit 3: Marucool World Pvt. Ltd.",
    city: "Kiamsariya Kalan",
    state: "Rajasthan",
    pincode: "342305",
    address: "Kiamsariya Kalan, Tehsil Tiwari, Jodhpur, Rajasthan - 342305, India"
  }
] as const;

export function findSourceUnit(unitId: string) {
  return sourceUnitOptions.find((unit) => unit.id === unitId) ?? null;
}

export const citySuggestions = [
  "Ahmedabad",
  "Bengaluru",
  "Bhiwandi",
  "Boranada",
  "Chennai",
  "Delhi",
  "Faridabad",
  "Gurugram",
  "Hyderabad",
  "Indore",
  "Jaipur",
  "Jodhpur",
  "Kiamsariya Kalan",
  "Kiramsariya",
  "Kolkata",
  "Ludhiana",
  "Mumbai",
  "Nagpur",
  "Noida",
  "Pune",
  "Rajkot",
  "Surat",
  "Udaipur",
  "Vadodara"
];

function isRouteStop(value: unknown): value is RouteStop {
  return (
    typeof value === "object" &&
    value !== null &&
    "city" in value &&
    typeof value.city === "string" &&
    "address" in value &&
    typeof value.address === "string"
  );
}

export function normalizeRouteStops(
  cities: string[],
  pincodes: string[],
  addresses: string[],
  consigneeNames: string[] = [],
  states: string[] = []
): RouteStop[] {
  return cities
    .map((city, index) => ({
      city: city.trim(),
      state: (states[index] ?? "").trim() || null,
      pincode: (pincodes[index] ?? "").trim() || null,
      address: (addresses[index] ?? "").trim(),
      consigneeName: (consigneeNames[index] ?? "").trim() || null,
      addressPhotoUrl: null
    }))
    .filter((stop) => stop.city);
}

export function parseRouteStops(value: unknown, fallbackPickupCity: string, fallbackDropCity: string): RouteStop[] {
  if (Array.isArray(value)) {
    const stops = value.filter(isRouteStop).map((stop) => ({
      city: stop.city.trim(),
      state: "state" in stop && typeof stop.state === "string" ? stop.state.trim() : null,
      pincode: "pincode" in stop && typeof stop.pincode === "string" ? stop.pincode.trim() : null,
      address: stop.address.trim(),
      consigneeName: "consigneeName" in stop && typeof stop.consigneeName === "string" ? stop.consigneeName.trim() : null,
      addressPhotoUrl:
        "addressPhotoUrl" in stop && typeof stop.addressPhotoUrl === "string" ? stop.addressPhotoUrl : null
    }));

    if (stops.length >= 2) {
      return stops;
    }
  }

  return [
    { city: fallbackPickupCity, address: "" },
    { city: fallbackDropCity, address: "" }
  ].filter((stop) => stop.city);
}

export function formatRouteLabel(stops: RouteStop[]) {
  return stops.map((stop) => (stop.consigneeName ? `${stop.consigneeName} (${stop.city})` : stop.city)).join(" -> ");
}

export function formatTransporterRoute(stops: RouteStop[]) {
  return stops.map((stop) => stop.city).join(" -> ");
}

export function formatRouteWithAddresses(stops: RouteStop[]) {
  return stops
    .map((stop, index) => {
      const label = index === 0 ? "Source" : index === stops.length - 1 ? "Destination" : `Stop ${index}`;
      const pincode = stop.pincode ? ` - ${stop.pincode}` : "";
      const consignee = stop.consigneeName ? ` - ${stop.consigneeName}` : "";
      const address = stop.address ? ` (${stop.address})` : "";
      const photo = stop.addressPhotoUrl ? `\n${label} address photo: ${stop.addressPhotoUrl}` : "";
      return `${label}: ${stop.city}${pincode}${consignee}${address}${photo}`;
    })
    .join("\n");
}
