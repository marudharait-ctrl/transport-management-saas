import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <main className="page auth-page">
      <section className="auth-panel">
        <div className="brand">
          <h1>Transport Management</h1>
          <p>Authorized users only.</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
