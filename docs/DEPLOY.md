# Deploy: Vercel frontend + DO Colyseus REALM

Walkable MVP cutover guide.

## Architecture

| Piece | Where | Repo |
|-------|--------|------|
| Next.js FE | Vercel | [`gotchiverse-2d`](https://github.com/userdefault13/gotchiverse-2d) |
| Colyseus + HTTP BFF | DigitalOcean | [`gotchiverse-realm-server`](https://github.com/userdefault13/gotchiverse-realm-server) |
| Chain indexers | Envio / Goldsky Base | [aavegotchi-envio-indexers](https://github.com/userdefault13/aavegotchi-envio-indexers) |

## 1. REALM server on DigitalOcean (App Platform)

The deployable REALM server lives in [`infra/realm-server`](../infra/realm-server) (Colyseus + HTTP BFF). Spec: [`.do/app.yaml`](../.do/app.yaml).

```bash
# from this repo (gotchiverse-2d)
export DIGITALOCEAN_ACCESS_TOKEN=dop_v1_...   # write access to App Platform
export VERCEL_TOKEN=...                       # optional: retarget FE env + Edge Config
bash scripts/deploy-realm-digitalocean.sh
```

That script:
1. Creates/updates the `gotchiverse-realm` App Platform app from `.do/app.yaml`
2. Sets `JWT_SECRET`, waits until `ACTIVE`
3. Health-checks the DO ingress URL
4. (Optional) updates Vercel `NEXT_PUBLIC_API_URL` / Edge Config to that URL

### DNS for `realm.aarcadeghst.com`

Today Cloudflare points this hostname at a missing Vercel deployment (`DEPLOYMENT_NOT_FOUND`). After App Platform is live:

1. In Cloudflare DNS for `aarcadeghst.com`, set **CNAME** `realm` → `<app>.ondigitalocean.app`
2. Proxy status: **DNS only** (grey cloud) until the DO cert validates, then you can orange-cloud
3. Re-run deploy with `ATTACH_CUSTOM_DOMAIN=1` (or add the domain in the DO dashboard)
4. Set `PUBLIC_URL=https://realm.aarcadeghst.com` on the app and FE envs

### Droplet alternative (Docker + Caddy)

```bash
# on the droplet
git clone https://github.com/userdefault13/gotchiverse-2d.git
cd gotchiverse-2d/infra/realm-server
cp .env.example .env
# JWT_SECRET=...  PUBLIC_URL=https://realm.aarcadeghst.com
export REALM_DOMAIN=realm.aarcadeghst.com
docker compose up -d --build
curl -s https://realm.aarcadeghst.com/health
```

Local server without TLS:

```bash
cd infra/realm-server && cp .env.example .env && npm i && npm run dev
# or: docker compose -f docker-compose.dev.yml up --build
```

## 2. Vercel frontend

Create a **new** Vercel project from `userdefault13/gotchiverse-2d`.

### Build settings

- Framework: Next.js
- Node: 20+
- Install: `yarn install --frozen-lockfile`
- Build: `yarn build`

### Environment variables

Live project: `userdefault13s-projects/gotchiverse-2d` → https://gotchiverse-2d.vercel.app

| Variable | Production | Preview | Development |
|----------|------------|---------|-------------|
| `APP_ENV` | `production` | `preview` | `local` |
| `REALM_NETWORK` / `NETWORK` / `ALCHEMICA_NETWORK` | `base` | `base` | `base` |
| `NEXT_PUBLIC_NETCODE` | `colyseus` | `colyseus` | `colyseus` |
| `NEXT_PUBLIC_API_URL` | `https://realm.aarcadeghst.com` | same | `http://localhost:2567` |
| `NEXT_PUBLIC_COLYSEUS_URL` | `https://realm.aarcadeghst.com` | same | `http://localhost:2567` |
| `NEXT_PUBLIC_CORE_SUBGRAPH_URL` | Base Goldsky core | same | same |
| `NEXT_PUBLIC_GOTCHIVERSE_SUBGRAPH_URL` | Base Goldsky gotchiverse | same | same |
| `NEXT_PUBLIC_SVG_SUBGRAPH_URL` | Base Goldsky SVG | same | same |
| `NEXT_PUBLIC_BASE_RPC` | `https://mainnet.base.org` | same | same |

After the DO REALM host is up, point DNS for `realm.aarcadeghst.com` at the droplet and set CORS for `https://gotchiverse-2d.vercel.app` + `https://*.vercel.app`. See [vercel-env.example](./vercel-env.example).

## 3. Local full stack

Terminal A — server repo:

```bash
cd gotchiverse-realm-server && cp .env.example .env && npm i && npm run dev
```

Terminal B — this FE repo:

```bash
cp .env.example .env
yarn install --frozen-lockfile
yarn dev
```

Open `http://localhost:3001`, connect a Base wallet, select a gotchi, enter the citaadel.

## 4. Enter the verse (ENTER NOW)

```
Select gotchi + parcel
  → sign nonce (GET /user/nonce/get)
  → auth token (GET /user/authtoken/get)
  → /play
  → Colyseus joinOrCreate('citaadel', { token, gotchiId, name, spawnLocId })
  → spawn at selected parcel center; client seeds nearby parcel grids
  → WASD / click-to-move
```

**Hard requirement:** `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_COLYSEUS_URL` must hit a live DO host.


**Temporary smoke tunnels (agent):** maintained by `scripts/realm-tunnel-watchdog.sh` (localhost.run + localtunnel + cloudflared). Live URLs are published to **Vercel Edge Config** `gotchiverse-realm-smoke` (read by `/api/realm-config` with no redeploy). The FE probes that list at Enter time. Replace with DO/`realm.aarcadeghst.com` when ready.

Today `https://realm.aarcadeghst.com` still resolves to a missing Vercel deployment (`DEPLOYMENT_NOT_FOUND`). Point that DNS at the droplet (or update the Vercel envs to the droplet URL), then:

```bash
# on aarcade DO host
git clone https://github.com/userdefault13/gotchiverse-realm-server.git
cd gotchiverse-realm-server && cp .env.example .env
# JWT_SECRET=...
# PUBLIC_URL=https://realm.aarcadeghst.com
# CORS_ORIGINS=https://gotchiverse-2d.vercel.app,https://*.vercel.app,http://localhost:3001
# SKIP_OWNERSHIP_CHECK=true   # optional for first smoke
export REALM_DOMAIN=realm.aarcadeghst.com
docker compose up -d --build
curl -s https://realm.aarcadeghst.com/health
```

Local enter without DO: run REALM on `:2567`, set FE `.env` API/Colyseus to `http://localhost:2567`, `yarn dev`, Enter from `localhost:3001`.

## 5. Smoke checklist

- [ ] `GET /health` on DO API
- [ ] Wallet connect on Base
- [ ] Nonce → signature → authToken
- [ ] Join Colyseus `citaadel` room (no portal error toast)
- [ ] Spawn lands on selected parcel (not the default random band)
- [ ] Parcel grids visible around spawn; owned parcels tinted
- [ ] Two browsers see each other move
- [ ] Vercel HTTPS → WSS (no mixed content)
