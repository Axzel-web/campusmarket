# Security Specification - Transactions

## 1. Data Invariants
- A transaction must have a `listingId`, `buyerId`, `sellerId`, `amount`, and `status`.
- `participants` must be a list of exactly 2 strings: the `buyerId` and `sellerId`.
- `status` must be one of: `['pending', 'completed', 'cancelled']`.
- `amount` must be a positive number.
- `buyerId` must match the authenticated user during creation.

## 2. The "Dirty Dozen" Payloads (Denial Proofs)
1. **Identity Spoofing**: Attempt to create a transaction with `buyerId` not matching `request.auth.uid`. (REJECT)
2. **Status Privilege Escalation**: Buyer attempts to mark transaction as `completed`. (REJECT - only seller can complete)
3. **Shadow Field Injection**: Adding `isRefunded: true` during update. (REJECT - `affectedKeys().hasOnly()`)
4. **Price Modification**: Buyer attempts to change the `amount` during a status update. (REJECT)
5. **Participant Poisoning**: Attempt to add a 3rd person to `participants`. (REJECT)
6. **Orphaned Transaction**: Create a transaction for a non-existent listing ID format. (REJECT via ID validation)
7. **System Hijack**: Attempt to update `createdAt` after creation. (REJECT)
8. **PII Leak**: Non-participant attempting to read a transaction. (REJECT)
9. **Blanket Read Request**: `db.collection('transactions').get()` without participant filter. (REJECT)
10. **Listing Status Lockout**: Seller setting status to `completed` but changing the `listingId`. (REJECT)
11. **Method Tampering**: Changing `paymentMethod` from `cash_on_meetup` after creation. (REJECT)
12. **Recursive Cost Attack**: Transaction ID with 10k characters. (REJECT via `isValidId()`)

## 3. Test Runner (Conceptual)
The rules will be verified against these patterns.
