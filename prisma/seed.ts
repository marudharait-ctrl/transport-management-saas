import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const prisma = new PrismaClient();

const inr = (rupees: number) => rupees * 100;
const date = (value: string) => new Date(`${value}T09:00:00.000+05:30`);
const seedPassword = process.env.AUTH_SEED_PASSWORD ?? "MaruMVP@2026!";

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password: string, passwordHash: string) {
  const [scheme, salt, hash] = passwordHash.split(":");
  if (scheme !== "scrypt" || !salt || !hash) {
    return false;
  }

  const candidate = scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");
  return stored.length === candidate.length && timingSafeEqual(stored, candidate);
}

async function main() {
  await prisma.auditEvent.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.transportRequest.deleteMany();
  await prisma.companyTransporter.deleteMany();
  await prisma.companyUser.deleteMany();
  await prisma.transporter.deleteMany();
  await prisma.company.deleteMany();

  const company = await prisma.company.create({
    data: {
      name: "Marudara Polypack",
      slug: "marudara-polypack",
      city: "Jodhpur",
      state: "Rajasthan"
    }
  });

  const [admin, requester, approver, accounts] = await Promise.all([
    prisma.companyUser.create({
      data: {
        companyId: company.id,
        name: "Naresh",
        email: "naresh@marudara.example",
        role: "ADMIN",
        passwordHash: hashPassword(seedPassword)
      }
    }),
    prisma.companyUser.create({
      data: {
        companyId: company.id,
        name: "Mahesh Bhai",
        email: "mahesh@marudara.example",
        role: "REQUESTER",
        passwordHash: hashPassword(seedPassword)
      }
    }),
    prisma.companyUser.create({
      data: {
        companyId: company.id,
        name: "Suresh Purohit",
        email: "suresh@marudara.example",
        role: "APPROVER",
        passwordHash: hashPassword(seedPassword)
      }
    }),
    prisma.companyUser.create({
      data: {
        companyId: company.id,
        name: "Accounts Team",
        email: "accounts@marudara.example",
        role: "ACCOUNTS",
        passwordHash: hashPassword(seedPassword)
      }
    })
  ]);

  const transporters = await Promise.all([
    prisma.transporter.create({
      data: {
        name: "Rajasthan Roadlines",
        primaryPhone: "+919829000101",
        email: "dispatch@rajasthanroadlines.example",
        baseCity: "Jodhpur",
        baseState: "Rajasthan"
      }
    }),
    prisma.transporter.create({
      data: {
        name: "Marwar Logistics",
        primaryPhone: "+919829000102",
        email: "quotes@marwarlogistics.example",
        baseCity: "Pali",
        baseState: "Rajasthan"
      }
    }),
    prisma.transporter.create({
      data: {
        name: "Shree Balaji Transport",
        primaryPhone: "+919829000103",
        baseCity: "Jaipur",
        baseState: "Rajasthan"
      }
    }),
    prisma.transporter.create({
      data: {
        name: "Noida Freight Carrier",
        primaryPhone: "+919829000104",
        email: "ops@noidafreight.example",
        baseCity: "Noida",
        baseState: "Uttar Pradesh"
      }
    })
  ]);

  await Promise.all(
    transporters.map((transporter, index) =>
      prisma.companyTransporter.create({
        data: {
          companyId: company.id,
          transporterId: transporter.id,
          displayName: transporter.name,
          trustRating: [5, 4, 3, 4][index],
          notes: [
            "Strong for Jodhpur to NCR full truck routes.",
            "Usually competitive on Rajasthan regional routes.",
            "Good backup option when urgent availability matters.",
            "Useful for Noida return loads and NCR coordination."
          ][index]
        }
      })
    )
  );

  const request1 = await prisma.transportRequest.create({
    data: {
      companyId: company.id,
      requestedById: requester.id,
      approvedById: approver.id,
      requestNumber: "MP-TR-2026-0001",
      title: "Full truck from Jodhpur to Noida",
      loadType: "FULL_TRUCK",
      status: "APPROVED",
      pickupCity: "Jodhpur",
      pickupState: "Rajasthan",
      dropCity: "Noida",
      dropState: "Uttar Pradesh",
      material: "PP woven bags",
      quantity: "16 MT",
      truckRequirement: "32 ft single axle container",
      pickupDate: date("2026-06-18"),
      targetDeliveryDate: date("2026-06-21"),
      notes: "Priority customer dispatch. Need clean vehicle and confirmed driver details.",
      aiSummary: "AI parsed a full-truck requirement for 16 MT PP woven bags from Jodhpur to Noida and identified NCR-capable transporters."
    }
  });

  const request2 = await prisma.transportRequest.create({
    data: {
      companyId: company.id,
      requestedById: requester.id,
      requestNumber: "MP-TR-2026-0002",
      title: "Partial load from Jodhpur to Jaipur",
      loadType: "PARTIAL_LOAD",
      status: "QUOTED",
      pickupCity: "Jodhpur",
      pickupState: "Rajasthan",
      dropCity: "Jaipur",
      dropState: "Rajasthan",
      material: "Packaging rolls",
      quantity: "4 MT",
      truckRequirement: "Shared vehicle acceptable, tarpaulin required",
      pickupDate: date("2026-06-19"),
      targetDeliveryDate: date("2026-06-20"),
      notes: "Cost-sensitive shipment. Compare partial-load quotes first.",
      aiSummary: "AI suggested partial-load mode and asked for delivery urgency before approval."
    }
  });

  const request3 = await prisma.transportRequest.create({
    data: {
      companyId: company.id,
      requestedById: admin.id,
      requestNumber: "MP-TR-2026-0003",
      title: "Multi-leg sample movement via Pali",
      loadType: "MULTI_LEG",
      status: "OPEN",
      pickupCity: "Jodhpur",
      pickupState: "Rajasthan",
      dropCity: "Ahmedabad",
      dropState: "Gujarat",
      material: "Sample rolls and documents",
      quantity: "800 kg",
      truckRequirement: "Small vehicle with Pali stopover",
      pickupDate: date("2026-06-22"),
      notes: "Needs pickup from factory, stop at Pali supplier, then Ahmedabad.",
      aiSummary: "AI detected multi-leg requirement and marked route details as needing confirmation."
    }
  });

  await prisma.quote.createMany({
    data: [
      {
        companyId: company.id,
        requestId: request1.id,
        transporterId: transporters[0].id,
        amountPaise: inr(68000),
        truckType: "32 ft container",
        availabilityDate: date("2026-06-18"),
        estimatedTransitDays: 3,
        paymentTerms: "50% advance, balance on POD",
        status: "APPROVED",
        receivedVia: "WhatsApp",
        notes: "Confirmed vehicle and driver by evening.",
        aiExtracted: true
      },
      {
        companyId: company.id,
        requestId: request1.id,
        transporterId: transporters[1].id,
        amountPaise: inr(70500),
        truckType: "32 ft container",
        availabilityDate: date("2026-06-18"),
        estimatedTransitDays: 3,
        paymentTerms: "Advance before loading",
        status: "REJECTED",
        receivedVia: "WhatsApp",
        notes: "Higher price than selected quote.",
        aiExtracted: true
      },
      {
        companyId: company.id,
        requestId: request2.id,
        transporterId: transporters[1].id,
        amountPaise: inr(18500),
        truckType: "Shared 14 ft vehicle",
        availabilityDate: date("2026-06-19"),
        estimatedTransitDays: 1,
        paymentTerms: "Full payment after delivery",
        status: "SHORTLISTED",
        receivedVia: "WhatsApp",
        notes: "Best price so far.",
        aiExtracted: true
      },
      {
        companyId: company.id,
        requestId: request2.id,
        transporterId: transporters[2].id,
        amountPaise: inr(21000),
        truckType: "Dedicated 14 ft vehicle",
        availabilityDate: date("2026-06-19"),
        estimatedTransitDays: 1,
        paymentTerms: "50% advance",
        status: "RECEIVED",
        receivedVia: "Manual entry",
        notes: "Dedicated vehicle, higher cost.",
        aiExtracted: false
      }
    ]
  });

  await prisma.shipment.create({
    data: {
      companyId: company.id,
      requestId: request1.id,
      transporterId: transporters[0].id,
      status: "PLANNED",
      vehicleNumber: "RJ19GC4581",
      driverName: "Ramesh Singh",
      driverPhone: "+919829009901",
      pickupAt: date("2026-06-18")
    }
  });

  await prisma.auditEvent.createMany({
    data: [
      {
        companyId: company.id,
        requestId: request1.id,
        actorType: "company_user",
        actorName: requester.name,
        action: "transport_request.created",
        details: { channel: "web", requestNumber: "MP-TR-2026-0001" }
      },
      {
        companyId: company.id,
        requestId: request1.id,
        actorType: "agent",
        actorName: "Garud Quote Assistant",
        action: "quotes.extracted",
        details: { channel: "whatsapp", quoteCount: 2, humanReviewRequired: true }
      },
      {
        companyId: company.id,
        requestId: request1.id,
        actorType: "company_user",
        actorName: approver.name,
        action: "quote.approved",
        details: { transporter: "Rajasthan Roadlines", amount: 68000 }
      },
      {
        companyId: company.id,
        requestId: request2.id,
        actorType: "agent",
        actorName: "Garud Quote Assistant",
        action: "quote.recommendation.drafted",
        details: { recommendation: "Marwar Logistics", reason: "Lowest quote and suitable route availability" }
      },
      {
        companyId: company.id,
        requestId: request3.id,
        actorType: "agent",
        actorName: "Garud Intake Assistant",
        action: "clarification.requested",
        details: { missingFields: ["Pali stopover address", "Ahmedabad delivery contact"] }
      }
    ]
  });

  console.log("Seeded Marudara Polypack MVP data");
  console.log({
    company: company.name,
    transporters: transporters.length,
    requests: 3,
    authorizedUsers: 4,
    passwordVerified: verifyPassword(seedPassword, admin.passwordHash)
  });
  void accounts;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
