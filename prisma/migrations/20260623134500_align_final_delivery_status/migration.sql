UPDATE "Shipment" s
SET
  "status" = 'FINAL_DELIVERY_APPROVED',
  "finalDeliveryApprovedAt" = COALESCE(s."finalDeliveryApprovedAt", s."deliveryApprovedAt", s."updatedAt"),
  "finalDeliveryApprovedByName" = COALESCE(s."finalDeliveryApprovedByName", s."deliveryApprovedByName", 'Historical migration')
WHERE s."status" = 'DELIVERY_APPROVED'
  AND EXISTS (
    SELECT 1
    FROM "ShipmentDeliveryStop" d
    WHERE d."shipmentId" = s."id"
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "ShipmentDeliveryStop" d
    WHERE d."shipmentId" = s."id"
      AND (d."podDocumentUrl" IS NULL OR d."podApprovedAt" IS NULL)
  );
