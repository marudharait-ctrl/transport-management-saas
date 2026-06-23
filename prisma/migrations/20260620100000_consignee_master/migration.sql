-- CreateTable
CREATE TABLE "Consignee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "addressLine3" TEXT,
    "city" TEXT NOT NULL,
    "pincode" TEXT,
    "email" TEXT,
    "contactPerson" TEXT,
    "mobile" TEXT,
    "gstin" TEXT,
    "state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consignee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Consignee_companyId_name_key" ON "Consignee"("companyId", "name");

-- CreateIndex
CREATE INDEX "Consignee_companyId_city_idx" ON "Consignee"("companyId", "city");

-- AddForeignKey
ALTER TABLE "Consignee" ADD CONSTRAINT "Consignee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
