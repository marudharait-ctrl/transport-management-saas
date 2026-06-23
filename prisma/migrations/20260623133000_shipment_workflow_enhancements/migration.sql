ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'ADMIN_APPROVAL_REQUIRED';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'LOADING_IN_PROCESS';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'LOADING_POINT_COMPLETED';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'FINAL_WEIGHT_SLIP_UPLOADED';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'POD_UPLOADED';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'POD_APPROVED';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'ALL_DELIVERIES_COMPLETED';
ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'FINAL_DELIVERY_APPROVED';

ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "finalDeliveryApprovedAt" TIMESTAMP(3);
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "finalDeliveryApprovedByName" TEXT;
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "loadingStartedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "ShipmentLoadingPoint" (
  "id" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "pointIndex" INTEGER NOT NULL,
  "label" TEXT,
  "city" TEXT NOT NULL,
  "pincode" TEXT,
  "address" TEXT,
  "isFinal" BOOLEAN NOT NULL DEFAULT false,
  "weightSlipUrl" TEXT,
  "uploadedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShipmentLoadingPoint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ShipmentLoadingPoint_shipmentId_pointIndex_key" ON "ShipmentLoadingPoint"("shipmentId", "pointIndex");
CREATE INDEX IF NOT EXISTS "ShipmentLoadingPoint_shipmentId_idx" ON "ShipmentLoadingPoint"("shipmentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShipmentLoadingPoint_shipmentId_fkey'
  ) THEN
    ALTER TABLE "ShipmentLoadingPoint"
      ADD CONSTRAINT "ShipmentLoadingPoint_shipmentId_fkey"
      FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "ShipmentDeliveryStop" ADD COLUMN IF NOT EXISTS "podUploadedAt" TIMESTAMP(3);
ALTER TABLE "ShipmentDeliveryStop" ADD COLUMN IF NOT EXISTS "podApprovedAt" TIMESTAMP(3);
ALTER TABLE "ShipmentDeliveryStop" ADD COLUMN IF NOT EXISTS "podApprovedByName" TEXT;

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "requestId" TEXT,
  "shipmentId" TEXT,
  "transporterId" TEXT,
  "recipientType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_companyId_recipientType_createdAt_idx" ON "Notification"("companyId", "recipientType", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_shipmentId_idx" ON "Notification"("shipmentId");
CREATE INDEX IF NOT EXISTS "Notification_transporterId_createdAt_idx" ON "Notification"("transporterId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Notification_shipmentId_fkey'
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_shipmentId_fkey"
      FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
