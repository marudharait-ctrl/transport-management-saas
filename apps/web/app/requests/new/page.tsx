import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewRequestForm } from "./NewRequestForm";
import { ArrowLeft } from "lucide-react";

export default async function NewRequestPage() {
  const user = await requireUser();
  const transporters = await prisma.companyTransporter.findMany({
    where: { companyId: user.companyId, isBlacklisted: false },
    orderBy: [{ trustRating: "desc" }, { displayName: "asc" }],
    include: { transporter: true }
  });
  const consignees = await prisma.consignee.findMany({
    where: { companyId: user.companyId },
    orderBy: [{ name: "asc" }]
  });

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <span className="eyebrow">Request intake</span>
            <h1>New Transport Request</h1>
            <p>{user.company.name}</p>
          </div>
          <div className="actions">
            <Link className="button" href="/">
              <ArrowLeft size={16} aria-hidden="true" />
              Dashboard
            </Link>
          </div>
        </header>

        <section className="panel intake-panel">
          <div className="panel-title">
            <h2>Request Details</h2>
          </div>
          <NewRequestForm
            transporters={transporters.map((item) => ({
              id: item.transporterId,
              name: item.displayName,
              phone: item.transporter.primaryPhone,
              baseCity: item.transporter.baseCity,
              trustRating: item.trustRating
            }))}
            consignees={consignees.map((consignee) => ({
              id: consignee.id,
              name: consignee.name,
              city: consignee.city,
              state: consignee.state ?? "",
              pincode: consignee.pincode ?? "",
              address: [
                consignee.addressLine1,
                consignee.addressLine2,
                consignee.addressLine3,
                consignee.city,
                consignee.pincode,
                consignee.state
              ]
                .filter(Boolean)
                .join(", ")
            }))}
          />
        </section>
      </div>
    </main>
  );
}
