-- AlterTable
ALTER TABLE "TransportRequest" ADD COLUMN     "dropPincode" TEXT,
ADD COLUMN     "pickupPincode" TEXT;

-- CreateTable
CREATE TABLE "QuoteRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "transporterId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "status" TEXT NOT NULL DEFAULT 'READY',
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteRequest_companyId_requestId_idx" ON "QuoteRequest"("companyId", "requestId");

-- CreateIndex
CREATE INDEX "QuoteRequest_transporterId_idx" ON "QuoteRequest"("transporterId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteRequest_requestId_transporterId_key" ON "QuoteRequest"("requestId", "transporterId");

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TransportRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_transporterId_fkey" FOREIGN KEY ("transporterId") REFERENCES "Transporter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
