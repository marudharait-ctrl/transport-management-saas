-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ShipmentStatus" ADD VALUE 'ORDER_CONFIRMED';
ALTER TYPE "ShipmentStatus" ADD VALUE 'DRIVER_DETAILS_SUBMITTED';
ALTER TYPE "ShipmentStatus" ADD VALUE 'DRIVER_DETAILS_APPROVED';
ALTER TYPE "ShipmentStatus" ADD VALUE 'WEIGHT_SLIP_UPLOADED';
ALTER TYPE "ShipmentStatus" ADD VALUE 'DELIVERY_APPROVED';
ALTER TYPE "ShipmentStatus" ADD VALUE 'INVOICE_SUBMITTED';
ALTER TYPE "ShipmentStatus" ADD VALUE 'INVOICE_VERIFIED';
ALTER TYPE "ShipmentStatus" ADD VALUE 'PAYMENT_PROCESSED';
ALTER TYPE "ShipmentStatus" ADD VALUE 'PAYMENT_COMPLETED';
ALTER TYPE "ShipmentStatus" ADD VALUE 'ORDER_CLOSED';

-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "lastError" TEXT;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "deliveryApprovedAt" TIMESTAMP(3),
ADD COLUMN     "deliveryApprovedByName" TEXT,
ADD COLUMN     "driverDetailsApprovedAt" TIMESTAMP(3),
ADD COLUMN     "driverDetailsApprovedByName" TEXT,
ADD COLUMN     "driverDetailsSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "driverLicenseDocumentUrl" TEXT,
ADD COLUMN     "invoiceSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "invoiceVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "invoiceVerifiedByName" TEXT,
ADD COLUMN     "materialPickedUpAt" TIMESTAMP(3),
ADD COLUMN     "paymentCompletedAt" TIMESTAMP(3),
ADD COLUMN     "paymentProcessedAt" TIMESTAMP(3),
ADD COLUMN     "truckImageUrl" TEXT,
ADD COLUMN     "vehicleRcDocumentUrl" TEXT,
ADD COLUMN     "weightSlipUploadedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ShipmentDeliveryStop" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "stopIndex" INTEGER NOT NULL,
    "consigneeName" TEXT,
    "city" TEXT NOT NULL,
    "pincode" TEXT,
    "address" TEXT,
    "podDocumentUrl" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentDeliveryStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShipmentDeliveryStop_shipmentId_idx" ON "ShipmentDeliveryStop"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentDeliveryStop_shipmentId_stopIndex_key" ON "ShipmentDeliveryStop"("shipmentId", "stopIndex");

-- AddForeignKey
ALTER TABLE "ShipmentDeliveryStop" ADD CONSTRAINT "ShipmentDeliveryStop_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
