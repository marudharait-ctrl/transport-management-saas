import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/app/components/BrandLogo";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <main className="page auth-page">
      <section className="auth-panel">
        <BrandLogo size="full" />
        <div className="brand">
          <h1>Transport Management</h1>
          <p>Authorized users only. For MVP dev login, use admin / admin.</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
