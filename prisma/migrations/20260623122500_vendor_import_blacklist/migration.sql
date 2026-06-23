-- AlterTable
ALTER TABLE "Transporter" ADD COLUMN "gstin" TEXT;

-- AlterTable
ALTER TABLE "CompanyTransporter" ADD COLUMN "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "blacklistedAt" TIMESTAMP(3),
ADD COLUMN "blacklistedByName" TEXT;
