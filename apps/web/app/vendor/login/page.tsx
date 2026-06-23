import { Truck } from "lucide-react";
import { BrandLogo } from "@/app/components/BrandLogo";

export default async function VendorLoginPage() {
  return (
    <main className="auth-page vendor-auth-page">
      <section className="auth-panel">
        <BrandLogo size="full" />
        <span className="vendor-mark">
          <Truck size={18} aria-hidden="true" />
          Vendor portal
        </span>
        <h1>Open from WhatsApp link</h1>
        <p className="muted">
          Vendor access is available only through the secure RFQ or shipment link sent on WhatsApp.
        </p>
      </section>
    </main>
  );
}
