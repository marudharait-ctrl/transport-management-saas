ALTER TABLE "CompanyWhatsAppSetting"
ADD COLUMN "activeProvider" TEXT NOT NULL DEFAULT 'OPENCLAW',
ADD COLUMN "testRecipientNumber" TEXT,
ADD COLUMN "lastTestSentAt" TIMESTAMP(3),
ADD COLUMN "lastTestStatus" TEXT,
ADD COLUMN "lastTestError" TEXT,
ADD COLUMN "baileysConfirmedAt" TIMESTAMP(3),
ADD COLUMN "baileysConfirmedByName" TEXT;

UPDATE "CompanyWhatsAppSetting"
SET "activeProvider" = 'OPENCLAW'
WHERE "activeProvider" IS NULL;
