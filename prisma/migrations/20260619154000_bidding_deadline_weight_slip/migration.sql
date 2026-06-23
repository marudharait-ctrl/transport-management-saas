ALTER TABLE "TransportRequest" ADD COLUMN "biddingDeadline" TIMESTAMP(3);

ALTER TABLE "Shipment" ADD COLUMN "weightSlipDocumentUrl" TEXT;
