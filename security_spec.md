# Firestore Security Specification (Phase 0: Payload-First Security TDD)

## 1. Data Invariants

1. **Identity Integrity**: Every user-owned write (`users/{userId}`, `orders/{orderId}`, `staff_requests/{requestId}`, `stock_refills/{refillId}`, `stock_transactions/{transactionId}`, `milk_batches/{batchId}`, `audit_logs/{logId}`) MUST enforce `uid` / `customerId` / `applicantUid` / `staffUid` / `actorUid == request.auth.uid`.
2. **Zero Self-Assigned Privilege Escalation**: A user creating `users/{userId}` may ONLY set `role: 'customer'` and may NOT set `approvalStatus: 'APPROVED'`. Only a verified administrator (`isAdmin()`) may promote roles or approve staff accounts, or write `admins/{userId}`.
3. **PII Isolation**: User profile documents containing `email` and `phone` (`users/{userId}`) are readable ONLY by `isOwner(userId) || isAdmin()`, never by arbitrary authenticated users (`allow read: if isSignedIn()` is forbidden).
4. **Immutable Ledgers & Terminal Locking**: `stock_refills`, `stock_transactions`, and `audit_logs` are strictly append-only (`allow update, delete: if false`). Completed/failed orders cannot be modified by customers.
5. **Relational & Volumetric Guards**: Every document ID path variable is validated with `isValidId()`, every string enforces `.size() <= MAX`, and `create` validates exact required and allowed keys (`hasAll` + `hasOnly`) while `update` validates `affectedKeys().hasOnly(...)` + `isValid[Entity](incoming())`.
6. **Temporal Integrity & Payment-Mode Transparency**: Timestamps (`createdAt`, `updatedAt`, `refillTimestamp`, `timestamp`) must be bounded strings (`<= 64`) matching server-synced ISO timestamps or `request.time`; simulated orders (`gatewayMode == 'DEMO_SIMULATION'`) must set `isSimulatedPayment == true`.

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Target Collection | Attack Vector | Expected Result |
|---|-------------------|---------------|-----------------|
| 1 | `/users/attacker` | Self-registration with `role: "admin"` | `PERMISSION_DENIED` |
| 2 | `/users/attacker` | Profile update adding ghost field `isVerified: true` | `PERMISSION_DENIED` |
| 3 | `/users/victim` | Cross-user `get` read of another customer's PII (`email`, `phone`) | `PERMISSION_DENIED` |
| 4 | `/users/attacker` | Unverified email (`email_verified: false`) attempting profile write | `PERMISSION_DENIED` |
| 5 | `/admins/attacker` | Client attempt to create admin marker document | `PERMISSION_DENIED` |
| 6 | `/orders/bad..id!` | Document ID poisoning with invalid characters or >128 chars | `PERMISSION_DENIED` |
| 7 | `/orders/ord_1` | Customer forging `customerId: "other_uid"` on order create | `PERMISSION_DENIED` |
| 8 | `/orders/ord_1` | Customer updating their own completed order (`dispensingStatus: "COMPLETED"` -> `"PENDING"`) | `PERMISSION_DENIED` |
| 9 | `/orders` | Unfiltered `list` query by customer attempting to read other users' orders | `PERMISSION_DENIED` |
| 10 | `/machines/ATM-KA-001` | Customer or non-admin attempting to edit kiosk GPS coordinates | `PERMISSION_DENIED` |
| 11 | `/stock_refills/rfl_1` | Staff attempting to `update` or `delete` an immutable refill record | `PERMISSION_DENIED` |
| 12 | `/staff_requests/req_1` | Applicant creating staff onboarding request with pre-set `status: "APPROVED"` | `PERMISSION_DENIED` |
