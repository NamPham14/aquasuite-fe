# UC30 — Quản lý tiền COD shipper bàn giao

Scope approved by owner, updated 2026-11-14. This replaces the earlier preliminary
review/partial remittance design. Backend contract: aquasuite-be/docs/contracts/uc30-current-api.md.

## Workflow

- SHIPPER declares collected cash for their delivered COD batch: status PENDING.
- ACCOUNTANT/SHOP_OWNER receives the entire declaration in cash and confirms:
  POST /finance/cod/collections/{id}/accept -> VERIFIED, contributing to order payment.
- Reject requires a reason: POST /collections/{id}/reject -> REJECTED, no payment.
- No self-receipt, second handover step, partial allocation, or additional business tables.
- COD declaration needs no image; proof of delivery remains owned by Delivery.
- Shipper selects an own DELIVERED batch with positive COD from the existing
  paginated /fulfillment/me/deliveries API; there is no manual UUID entry.
  Options show delivery code, recipient, batch and planned COD. Actual cash is
  entered separately. Backend still verifies ownership and remaining claim limits.

## Frontend

- List/detail use backend status PENDING/VERIFIED/REJECTED, amount and reviewed metadata.
- Receipt requires explicit confirmation that the full amount was physically received.
- Rejection requires a reason, without falsely confirming that cash was received.
- Uncertain mutation results retain the exact decision/version and lock closing until retry.
- Declaration retries retain original payload/idempotency key. No persistence across reload.
- Removed remittance endpoints/components are not used. Display existing declaration and
  review timestamps; do not claim an immutable or multi-receipt history.
- Order COD balance invalidates by order ID after ordinary payments/deposit verification,
  and after COD changes. Order panel refreshes on mount and polls every 30 seconds.

Verification: API transport/cache tests, interactive role/self-receipt/acknowledgment,
rejection/retry tests, production build and synthetic desktop/mobile browser review.
No live financial mutation was performed as part of frontend verification.
