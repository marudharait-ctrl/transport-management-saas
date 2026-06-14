import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { NewRequestForm } from "./NewRequestForm";

export default async function NewRequestPage() {
  const user = await requireUser();

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <h1>New Transport Request</h1>
            <p>{user.company.name} request intake.</p>
          </div>
          <div className="actions">
            <Link className="button" href="/">
              Dashboard
            </Link>
          </div>
        </header>

        <section className="panel">
          <h2>Request Details</h2>
          <NewRequestForm />
        </section>
      </div>
    </main>
  );
}
