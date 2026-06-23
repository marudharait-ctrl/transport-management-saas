import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const prisma = new PrismaClient();

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
  await prisma.quoteRequest.deleteMany();
  await prisma.transportRequest.deleteMany();
  await prisma.companyTransporter.deleteMany();
  await prisma.vendorUser.deleteMany();
  await prisma.companyUser.deleteMany();
  await prisma.transporter.deleteMany();
  await prisma.company.deleteMany();

  const company = await prisma.company.create({
    data: {
      name: "Marudhara Trip Management",
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

  console.log("Seeded clean Marudhara Trip Management MVP workspace");
  console.log({
    company: company.name,
    transporters: 0,
    requests: 0,
    authorizedUsers: 4,
    passwordVerified: verifyPassword(seedPassword, admin.passwordHash)
  });
  void requester;
  void approver;
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
