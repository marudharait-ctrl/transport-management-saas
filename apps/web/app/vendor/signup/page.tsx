import Link from "next/link";
import { Truck } from "lucide-react";
import { VendorSignupForm } from "./VendorSignupForm";

export default function VendorSignupPage() {
  return (
    <main className="auth-page vendor-auth-page">
      <section className="auth-panel">
        <span className="vendor-mark">
          <Truck size={18} aria-hidden="true" />
          Vendor portal
        </span>
        <h1>Create vendor account</h1>
        <p className="muted">Register with your WhatsApp number to receive and respond to quote requests.</p>
        <VendorSignupForm />
        <div className="auth-switch">
          <span>Already registered?</span>
          <Link className="button" href="/vendor/login">
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
