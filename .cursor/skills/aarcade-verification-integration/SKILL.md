---
name: aarcade-verification-integration
description: Integrate Gotchiverse Discord verification via AarcadeGh-t /api/gotchiverse-verify. Use when wiring isVerified, Settings Discord CTA, or AARCADE_VERIFY_* env vars.
---

# Aarcade Discord Verification Integration

## Architecture

```
gotchiverse-2d ─AARCADE_VERIFY_SECRET─▶ AarcadeGh-t ─service secret─▶ Cloudflare Worker ─bot─▶ Discord
   (consumer)      /api/gotchiverse-verify      (wallet→discordId)   aarcade-discord-verify
```

**Do not** call the Cloudflare worker from Gotchiverse. Only call Aarcade.

## Endpoint contract

- **URL:** `AARCADE_VERIFY_URL` (default `https://aarcadeghst.com/api/gotchiverse-verify`)
- **Method:** `GET ?wallet=0x...`
- **Auth (server-only):** `Authorization: Bearer <AARCADE_VERIFY_SECRET>`
  or `x-verify-secret: <secret>`
- **Response:**
  ```json
  {
    "wallet": "0x...",
    "verified": true,
    "discordLinked": true,
    "inAavegotchiGuild": true,
    "checkedAt": "2026-07-18T00:00:00.000Z",
    "stale": false
  }
  ```
- `verified` = `discordLinked && inAavegotchiGuild`

## Gotchiverse env vars (Vercel, server-only)

| Var | Value |
|-----|--------|
| `AARCADE_VERIFY_URL` | `https://aarcadeghst.com/api/gotchiverse-verify` |
| `AARCADE_VERIFY_SECRET` | shared secret (same as Aarcade `GOTCHIVERSE_VERIFY_SECRET`) |
| `NEXT_PUBLIC_AARCADE_HOME` | `https://aarcadeghst.com` (optional; Settings CTA) |

Never expose `AARCADE_VERIFY_SECRET` via `next.config.js` `env` or `NEXT_PUBLIC_*`.

## FE pattern

1. Browser calls Gotchiverse `/api/aarcade-verify?wallet=0x...` (no secret).
2. That API route server-fetches Aarcade with the secret.
3. Settings / chat CTA → Aarcade Discord connect / player profile (not Gotchiverse OAuth).

## Caching

Short TTL cache in `/api/aarcade-verify` (e.g. 5 minutes) to protect Aarcade Vercel budget.

## Errors

| Status | Meaning |
|--------|---------|
| 401 | Bad/missing secret |
| 400 | Invalid wallet |
| 503 | Aarcade not configured / not redeployed yet |
| 200 + `verified: false` | Not linked or not in Aavegotchi guild (bot invite may still be pending) |
