CREATE TABLE "CompanyWhatsAppSetting" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'OPENCLAW',
  "senderNumber" TEXT,
  "openclawAccountId" TEXT,
  "baileysSessionName" TEXT,
  "baileysEnabled" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompanyWhatsAppSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyWhatsAppSetting_companyId_key" ON "CompanyWhatsAppSetting"("companyId");
CREATE INDEX "CompanyWhatsAppSetting_companyId_provider_idx" ON "CompanyWhatsAppSetting"("companyId", "provider");

ALTER TABLE "CompanyWhatsAppSetting"
ADD CONSTRAINT "CompanyWhatsAppSetting_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
