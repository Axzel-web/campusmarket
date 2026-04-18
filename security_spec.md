# Security Specification - CampusMarket

## Data Invariants
1. **User Identity Persistence**: `uid` fields in documents (e.g., `userId`, `sellerId`, `senderId`) must match the authenticated user's `request.auth.uid`.
2. **Access Derivation**: Access to messages is strictly derived from the `participants` array in the parent `Chat` document.
3. **Verification Integrity**: `isVerified` and `verificationStatus` in the user profile are immutable by the user and can only be set by the system/admin.
4. **Marketplace Visibility**: All authenticated users can read listings, but only the owner (seller) can modify or delete them.
5. **Relational Sync**: A `Message` cannot exist without being associated with a `Chat` where the sender is a participant.

## The Dirty Dozen (Test Cases)

| ID | Attack Name | Target Path | Payload / Action | Expected Result |
|---|---|---|---|---|
| 1 | Profile Hijack | `/users/userB` | Update `fullName` as User A | `PERMISSION_DENIED` |
| 2 | Privilege Escalation | `/users/userA` | Set `isVerified: true` as User A | `PERMISSION_DENIED` |
| 3 | Ghost Field injection | `/listings/list1` | Add `isAdmin: true` to document | `PERMISSION_DENIED` |
| 4 | State Shortcut | `/listings/list1` | Change `status` from `active` to `sold` as non-seller | `PERMISSION_DENIED` |
| 5 | ID Poisoning | `/listings/huge_id...` | Create document with 1MB ID string | `PERMISSION_DENIED` |
| 6 | Orphaned Favorite | `/users/userB/favorites/list1` | Create favorite for another user | `PERMISSION_DENIED` |
| 7 | Chat Snooping | `/chats/chat1` | Read chat where user is not in `participants` | `PERMISSION_DENIED` |
| 8 | Sender Impersonation | `/chats/chat1/messages/m1` | Create message with `senderId: userB` as User A | `PERMISSION_DENIED` |
| 9 | Resource Exhaustion | `/listings/list1` | Update `description` with 5MB text | `PERMISSION_DENIED` |
| 10 | Unverified Access | `/listings/list2` | Create listing with unverified email | `PERMISSION_DENIED` |
| 11 | Immutable Break | `/listings/list1` | Change `sellerId` on existing listing | `PERMISSION_DENIED` |
| 12 | Role Self-Assignment | `/users/userA` | Set `role: "admin"` during registration | `PERMISSION_DENIED` |

## Security Consistency Report

| Collection | Auth Check | Schema/Type Check | Identity/Role Check | Size Check |
|---|---|---|---|---|
| `users` | `isOwner(userId)` | `isValidUserProfile()` | Required | `bio.size() <= 500` |
| `listings` | `isOwner(sellerId)` | `isValidListing()` | Required | `desc.size() <= 2000` |
| `favorites` | `isOwner(userId)` | `isValidFavorite()` | Required | - |
| `chats` | `isParticipant()` | `isValidChat()` | Required | - |
| `messages` | `isParticipant()` | `isValidMessage()` | Required | `text.size() <= 1000` |
