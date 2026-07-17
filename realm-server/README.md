# Gotchiverse REALM Server

Colyseus authoritative room server + thin HTTP BFF for the Gotchiverse 2D **walkable MVP**.

- HTTP: auth nonce/token, realm config, `/realm/socket` shim, `/health`
- Realtime: Colyseus room `citaadel` (move + see other players)
- Chain identity: Base Envio/Goldsky subgraphs (optional ownership check)

Lives at `realm-server/` inside [`gotchiverse-2d`](https://github.com/userdefault13/gotchiverse-2d) so FE + server ship together; extract this folder to its own repo anytime. Deploy on **DigitalOcean** (aarcade host). The Next.js client deploys to **Vercel** — see [`docs/DEPLOY.md`](../docs/DEPLOY.md).

## Quick start (local)

```bash
cp .env.example .env
npm install
npm run dev
```

- HTTP health: `http://localhost:2567/health`
- Colyseus: `ws://localhost:2567` (room name `citaadel`)

Point the FE at:

```bash
NEXT_PUBLIC_API_URL=http://localhost:2567
NEXT_PUBLIC_COLYSEUS_URL=http://localhost:2567
NEXT_PUBLIC_NETCODE=colyseus
```

## Auth flow

1. `GET /user/nonce/get?address=0x...` → `{ nonce, message }`
2. Wallet signs `message`
3. `GET /user/authtoken/get?address=0x...&signature=0x...&gotchiId=123` → `{ authToken }`
4. Client `joinOrCreate('citaadel', { token, gotchiId })`
5. Room `onAuth` verifies JWT (and optional subgraph ownership)

## Docker / DigitalOcean

### Local Docker (no TLS)

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up --build
```

### Production (Caddy TLS on droplet)

1. DNS: point `api.yourdomain.com` (or similar) at the droplet.
2. On the server:

```bash
git clone https://github.com/userdefault13/Gotchiverse-Server.git
cd Gotchiverse-Server
cp .env.example .env
# Edit .env:
#   JWT_SECRET=<long random>
#   PUBLIC_URL=https://api.yourdomain.com
#   CORS_ORIGINS=https://your-vercel-app.vercel.app,https://*.vercel.app
#   SKIP_OWNERSHIP_CHECK=false
#   CORE_SUBGRAPH_URL / GOTCHIVERSE_SUBGRAPH_URL = your Envio proxy or Goldsky Base URLs
```

3. Set the Caddy site name:

```bash
# deploy/Caddyfile uses REALM_DOMAIN env, or edit the hostname directly
export REALM_DOMAIN=api.yourdomain.com
docker compose up -d --build
```

4. Open firewall for **80/443** only. Colyseus listens internally on `2567`.

5. Verify:

```bash
curl -s https://api.yourdomain.com/health
```

## Env reference

| Variable | Purpose |
|----------|---------|
| `PORT` / `HOST` | Listen address |
| `PUBLIC_URL` | URL returned by `/realm/socket` and config |
| `CORS_ORIGINS` | Comma-separated FE origins (`*.vercel.app` suffix supported) |
| `JWT_SECRET` | Auth token signing |
| `CORE_SUBGRAPH_URL` | Base core GraphQL for ownership |
| `GOTCHIVERSE_SUBGRAPH_URL` | Gotchiverse GraphQL |
| `SKIP_OWNERSHIP_CHECK` | `true` for local sandbox |

## Smoke checklist

- [ ] `GET /health` → `ok: true`
- [ ] Nonce → sign → authToken succeeds
- [ ] Two browsers join `citaadel` and see each other move
- [ ] Vercel FE `NEXT_PUBLIC_NETCODE=colyseus` reaches this host over **WSS**
