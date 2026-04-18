# CampusMarket Security Specification

## Data Invariants
1. **User Ownership**: A user can only modify their own profile.
2. **Relational Integrity**: 
   - A listing must belong to a verified seller (enforced at write).
   - A chat participant must be either the listing owner or the buyer starting the chat.
3. **Immutable Fields**: `createdAt` and `sellerId` (for listings) cannot be changed after creation.
4. **State Transitions**: `verificationStatus` can only be set to `pending` by the user; only an admin (simulated or real) could approve it.

## The "Dirty Dozen" Payloads (Rejected)
1. **Identity Theft**: Update `/users/not-me` profile.
2. **Ghost Seller**: Create a listing while `isVerified` is false.
3. **Price Manipulation**: Someone else updating the price of my listing.
4. **Chat Hijacking**: Reading a chat I'm not a participant in.
5. **Message Spoofing**: Sending a message as another user in a chat.
6. **Illegal Promotion**: Setting `isVerified: true` in my own profile update.
7. **Negative Price**: Creating a listing with `price: -100`.
8. **Huge Payload**: Injecting 1MB of text into a listing title.
9. **History Eraser**: Deleting a listing I don't own.
10. **Time Travel**: Setting `createdAt` to a future date.
11. **Shadow Message**: Sending a message to a chat that doesn't exist.
12. **Orphaned Message**: Deleting a chat but keeping its sub-messages accessible.

## Verification
These rules will be tested to ensure the above payloads return `PERMISSION_DENIED`.
