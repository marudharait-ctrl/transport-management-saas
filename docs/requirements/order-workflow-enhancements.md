# Transport Bidding Workflow Enhancements

Date: 2026-06-22

Requester: Hanu/Hariansh Purohit

## Required Changes

### RFQ Notifications

- Every eligible vendor selected for a transport request must receive a WhatsApp RFQ notification.
- Notification attempts must be logged with sent, delivered, and failed states where available.
- Failed notifications must stay visible so admins can resend.

### Vendor Mobile Numbers

- Users enter only a 10 digit Indian mobile number for vendors.
- The system stores vendor mobile numbers with `+91` prepended.
- Users should not manually enter `+91`.

Example:

```text
Entered: 9876543210
Stored: +919876543210
```

### Order Workflow

The shipment lifecycle should be controlled by admins. Vendors upload required documents but cannot directly move shipment statuses.

Status flow:

```text
RFQ Raised
-> Bid Submitted
-> Quote Approved
-> Order Confirmed
-> Driver Details Submitted
-> Driver Details Approved
-> Material Picked Up
-> Weight Slip Uploaded
-> In Transit
-> Delivery 1 Completed
-> Delivery 2 Completed
-> Delivery 3 Completed (as applicable)
-> Final Delivery Approved
-> Invoice Uploaded
-> Invoice Verified
-> Payment Processed
-> Payment Completed
-> Order Closed
```

Vendor allowed actions:

- Submit quotation.
- Upload driver name/contact and driver license image.
- Upload vehicle RC image and truck image.
- Upload GRN/POD per consignee delivery stop.
- Upload invoice after final delivery approval.

Admin controlled actions:

- Approve quote.
- Approve driver and vehicle details.
- Mark material picked up.
- Upload weight slip.
- Mark shipment in transit.
- Approve final delivery after all PODs are uploaded.
- Verify invoice.
- Mark payment processed/completed.

