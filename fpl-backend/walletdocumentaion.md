## Wallet API Documentation

**IMPORTANT – SERVER-TO-SERVER ONLY**

- **Do NOT call these wallet endpoints directly from browsers, mobile apps, or any client-side code.**
- **Only your backend/server should talk to this wallet API using the base URL and `pass-key`.**
- Your own backend must expose its **own routes** to your clients, then forward validated requests server‑to‑server to this wallet service.
- This rule also applies to AI code agents: they should generate code where **your backend** calls these URLs, never the frontend.

This document describes the wallet endpoints exposed for external game backends.  
All examples assume **production** environment.

---

## Base URL and Authentication

- **Base URL**: `https://next-ludo-backend.onrender.com`
- **API Prefix**: All wallet endpoints are under:  
  `https://next-ludo-backend.onrender.com/api/wallet`

### Required Headers

All wallet requests **must** include:

- `Authorization: Bearer <USER_JWT_TOKEN>`
- `pass-key: <SHARED_SECRET_BINGO from env>`
- `Content-Type: application/json`

Notes:

- `<USER_JWT_TOKEN>` is the user token you already have (from your auth / Telegram / login flow).
- The `pass-key` is a **shared secret** between your backend and the wallet service.

---

## 1. Get User Profile

- **Method**: `GET`
- **URL**: `/api/wallet/profile`

### Purpose

Fetch the current user’s profile and wallet balances using their JWT and the shared `pass-key`.

### Request

**Headers**:

- `Authorization: Bearer <USER_JWT_TOKEN>`
- `pass-key: <SHARED_SECRET_BINGO from env>`
- `Content-Type: application/json`

**Body**: none.

**Example (`curl`)**:

```bash
curl -X GET "https://next-ludo-backend.onrender.com/api/wallet/profile" \
  -H "Authorization: Bearer <USER_JWT_TOKEN>" \
  -H "pass-key: <SHARED_SECRET_BINGO from env>" \
  -H "Content-Type: application/json"
```

### Successful Response

- **Status**: `200 OK`

**Example body**:

```json
{
  "userData": {
    "_id": "696fa0ad449effb66ce59c6c",
    "username": "Yaba40",
    "chatId": "1982046925",
    "phoneNumber": "0965242213",
    "balance": 984.39,
    "realBalance": 984.39,
    "bonus": 0,
    "banned": false,
    "verified": false,
    "inviteCount": 0,
    "invitedBy": null,
    "bonusReceived": true,
    "withdrawals": { "count": 0 },
    "deviceFingerprint": {
      "ipAddress": "74.220.48.3",
      "lastSeen": "2026-01-22T11:37:06.573Z",
      "screenHeight": 768,
      "screenWidth": 1366,
      "userAgent": "axios/1.7.9"
    },
    "userAgent": {
      "userAgent": "Mozilla/5.0 (...)",
      "screenResolution": { "width": 1366, "height": 768 },
      "lastUpdated": "2026-01-21T16:06:50.508Z"
    },
    "fromWebsite": false,
    "createdAt": "2026-01-20T15:35:09.436Z",
    "updatedAt": "2026-03-10T11:08:13.159Z",
    "__v": 0
  }
}
```

### Common Errors (simplified)

- `401 / 403` – invalid or missing JWT or `pass-key`.
- `403` – user is banned.

---

## 2. Debit Wallet (Bet / Stake)

- **Method**: `POST`
- **URL**: `/api/wallet/debit`

### Purpose

Debit (subtract) funds from the user’s wallet for a specific game round.  
Bonus balance is always used first, then real balance.

The combination of `user_id + game + round_id` is used to avoid duplicate debits.

### Request

**Headers**:

- `Authorization: Bearer <USER_JWT_TOKEN>`
- `pass-key: <SHARED_SECRET_BINGO from env>`
- `Content-Type: application/json`

**Body fields**:

- `user_id` (string, required) – user chat ID (e.g. `"1982046925"`).
- `username` (string, required) – user username.
- `transaction_type` (string, required) – must be `"debit"`.
- `amount` (number, required) – amount to debit.
- `game` (string, required) – game name (e.g. `"Ludo"`).
- `round_id` (string, required) – unique round ID on your side.
- `status` (string, optional) – usually `"completed"`; backend ignores custom statuses.
- `transaction_id` (string, optional but recommended) – your own external transaction ID.

**Example (`curl`)**:

```bash
curl -X POST "https://next-ludo-backend.onrender.com/api/wallet/debit" \
  -H "Authorization: Bearer <USER_JWT_TOKEN>" \
  -H "pass-key: <SHARED_SECRET_BINGO from env>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "1982046925",
    "username": "Yaba40",
    "transaction_type": "debit",
    "amount": 10,
    "game": "Ludo",
    "round_id": "test-round-001",
    "status": "completed",
    "transaction_id": "test-tx-001"
  }'
```

### Successful Response

- **Status**: `200 OK`

**Example body**:

```json
{
  "success": true,
  "message": "Transaction processed successfully",
  "data": {
    "transaction_id": "test-tx-001",
    "user_id": "1982046925",
    "username": "Yaba40",
    "transaction_type": "debit",
    "amount": 10,
    "status": "completed",
    "game": "Ludo",
    "round_id": "test-round-001",
    "rollback": false,
    "bonusUsed": false,
    "newBalance": 974.39,
    "balance": 974.39,
    "bonus": 0,
    "realBalance": 974.39,
    "createdAt": "2026-03-10T13:06:42.828Z",
    "updatedAt": "2026-03-10T13:06:42.828Z"
  }
}
```

### Common Errors (simplified)

- `400`:
  - Missing required fields.
  - `transaction_type` not `"debit"`.
  - Insufficient total balance (bonus + real).
  - Duplicate `round_id` for the same `user_id` and `game`.
- `403`:
  - Debits disabled by admin or for this specific game.
  - User is banned.
- `404`:
  - User not found.

---

## 3. Credit Wallet (Win / Payout)

- **Method**: `POST`
- **URL**: `/api/wallet/credit`

### Purpose

Credit (add) funds to the user’s wallet as a game win / payout.  
Requires an existing completed debit for the same `user_id + game + round_id`.  
Multiple credits for the same user and round are blocked, and the credit amount cannot exceed the remaining pool for that round.

### Request

**Headers**:

- `Authorization: Bearer <USER_JWT_TOKEN>`
- `pass-key: <SHARED_SECRET_BINGO from env>`
- `Content-Type: application/json`

**Body fields**:

- `user_id` (string, required) – user chat ID.
- `username` (string, required) – user username.
- `transaction_type` (string, required) – must be `"credit"`.
- `amount` (number, required) – amount to credit.
- `game` (string, required) – game name (e.g. `"Ludo"`).
- `round_id` (string, required) – same round ID as the debit transaction.
- `status` (string, optional) – usually `"completed"`.
- `transaction_id` (string, optional but recommended) – your external credit transaction ID.
- `debitTransaction_id` (string, optional) – your reference to the related debit.

**Example (`curl`)**:

```bash
curl -X POST "https://next-ludo-backend.onrender.com/api/wallet/credit" \
  -H "Authorization: Bearer <USER_JWT_TOKEN>" \
  -H "pass-key: <SHARED_SECRET_BINGO from env>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "1982046925",
    "username": "Yaba40",
    "transaction_type": "credit",
    "amount": 10,
    "game": "Ludo",
    "round_id": "test-round-001",
    "status": "completed",
    "transaction_id": "test-credit-001",
    "debitTransaction_id": "test-tx-001"
  }'
```

### Successful Response

- **Status**: `200 OK`

**Example body**:

```json
{
  "success": true,
  "message": "Credit transaction processed successfully",
  "data": {
    "transaction_id": "test-credit-001",
    "user_id": "1982046925",
    "username": "Yaba40",
    "transaction_type": "credit",
    "amount": 10,
    "status": "completed",
    "game": "Ludo",
    "round_id": "test-round-001",
    "rollback": false,
    "bonusUsed": false,
    "newBalance": 984.39,
    "balance": 984.39,
    "bonus": 0,
    "realBalance": 984.39,
    "createdAt": "2026-03-10T13:07:44.379Z",
    "updatedAt": "2026-03-10T13:07:44.379Z"
  }
}
```

### Common Errors (simplified)

- `400`:
  - Missing required fields.
  - `transaction_type` not `"credit"`.
  - No corresponding completed debit for this `user_id + game + round_id`.
  - User already credited for this round.
  - For non-Bingo games, credit amount exceeds remaining pool for the round.
- `403`:
  - User is banned.
- `404`:
  - User not found.

---

## Integration Notes

- Always:
  - Pass both the **user JWT** and the **`pass-key`** header.
  - Use a unique `round_id` per game round and user.
  - Keep your own `transaction_id` for traceability on your side.

