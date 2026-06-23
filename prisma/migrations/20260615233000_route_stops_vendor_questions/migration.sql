ALTER TABLE "TransportRequest"
ADD COLUMN "routeStops" JSONB;

ALTER TABLE "QuoteRequest"
ADD COLUMN "questionAnswer" TEXT,
ADD COLUMN "questionAnsweredAt" TIMESTAMP(3),
ADD COLUMN "questionAnsweredByName" TEXT;
