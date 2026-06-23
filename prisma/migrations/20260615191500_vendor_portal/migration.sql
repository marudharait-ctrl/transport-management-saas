-- Vendor users for transporter-side login.
CREATE TABLE "VendorUser" (
    "id" TEXT NOT NULL,
    "transporterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorUser_pkey" PRIMARY KEY ("id")
);

-- Quote requests now act as authenticated vendor deep links and response trackers.
ALTER TABLE "QuoteRequest"
ADD COLUMN "accessToken" TEXT,
ADD COLUMN "question" TEXT,
ADD COLUMN "questionAt" TIMESTAMP(3),
ADD COLUMN "finalQuoteId" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "QuoteRequest"
SET "accessToken" = gen_random_uuid()::text
WHERE "accessToken" IS NULL;

ALTER TABLE "QuoteRequest"
ALTER COLUMN "accessToken" SET NOT NULL;

ALTER TABLE "QuoteRequest"
ALTER COLUMN "accessToken" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "Shipment"
ADD COLUMN "invoiceDocumentUrl" TEXT;

CREATE INDEX "VendorUser_email_idx" ON "VendorUser"("email");
CREATE INDEX "VendorUser_phone_idx" ON "VendorUser"("phone");
CREATE INDEX "VendorUser_transporterId_idx" ON "VendorUser"("transporterId");
CREATE UNIQUE INDEX "VendorUser_transporterId_email_key" ON "VendorUser"("transporterId", "email");
CREATE UNIQUE INDEX "VendorUser_transporterId_phone_key" ON "VendorUser"("transporterId", "phone");
CREATE UNIQUE INDEX "QuoteRequest_accessToken_key" ON "QuoteRequest"("accessToken");

ALTER TABLE "VendorUser"
ADD CONSTRAINT "VendorUser_transporterId_fkey"
FOREIGN KEY ("transporterId") REFERENCES "Transporter"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
