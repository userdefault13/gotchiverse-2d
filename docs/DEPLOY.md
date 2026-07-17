# Deploy: Vercel frontend + DO Colyseus REALM

Walkable MVP cutover guide.

## Architecture

| Piece | Where | Repo path |
|-------|--------|-----------|
| Next.js FE | Vercel | this repo root |
| Colyseus + HTTP BFF | DigitalOcean | [`realm-server/`](../realm-server/) |
| Chain indexers | Envio / Goldsky Base | [aavegotchi-envio-indexers](https://github.com/userdefault13/aavegotchi-envio-indexers) |

## 1. REALM server on DigitalOcean

```bash
# on the droplet (aarcade host)
cd /opt # or your apps dir
git clone https://github.com/userdefault13/gotchiverse-2d.git
cd gotchiverse-2d/realm-server
cp .env.example .env
# set JWT_SECRET, PUBLIC_URL=https://api.YOURDOMAIN, CORS_ORIGINS=https://YOUR-VERCEL-APP.vercel.app,https://*.vercel.app
# SKIP_OWNERSHIP_CHECK=false in production
export REALM_DOMAIN=api.YOURDOMAIN
docker compose up -d --build
curl -s https://api.YOURDOMAIN/health
```

Local server without TLS:

```bash
cd realm-server
cp .env.example .env
npm install
npm run dev
# or: docker compose -f docker-compose.dev.yml up --build
```

## 2. Vercel frontend

Create a **new** Vercel project from `userdefault13/gotchiverse-2d`.

### Build settings

- Framework: Next.js
- Node: 20+
- Install: `yarn install --frozen-lockfile`
- Build: `yarn build`

### Environment variables (Production + Preview)

```bash
APP_ENV=production
REALM_NETWORK=base
NETWORK=base
ALCHEMICA_NETWORK=base
NEXT_PUBLIC_NETCODE=colyseus
NEXT_PUBLIC_API_URL=https://api.YOURDOMAIN
NEXT_PUBLIC_COLYSEUS_URL=https://api.YOURDOMAIN
NEXT_PUBLIC_CORE_SUBGRAPH_URL=https://api.goldsky.com/api/public/project_cmh3flagm0001r4p25foufjtt/subgraphs/aavegotchi-core-base/prod/gn
NEXT_PUBLIC_GOTCHIVERSE_SUBGRAPH_URL=https://api.goldsky.com/api/public/project_cmh3flagm0001r4p25foufjtt/subgraphs/gotchiverse-base/prod/gn
NEXT_PUBLIC_BASE_RPC=https://mainnet.base.org
```

Prefer your Envio GraphQL proxy URLs when cut over.

### CLI (if logged in)

```bash
npx vercel link
npx vercel env add NEXT_PUBLIC_API_URL production
# ... repeat for vars above
npx vercel --prod
```

## 3. Local full stack

Terminal A:

```bash
cd realm-server && cp .env.example .env && npm i && npm run dev
```

Terminal B:

```bash
cp .env.example .env
yarn install --frozen-lockfile
yarn dev
```

Open `http://localhost:3001`, connect a Base wallet, select a gotchi, enter the citaadel.

## 4. Smoke checklist

- [ ] `GET /health` on DO API
- [ ] Wallet connect on Base
- [ ] Nonce → signature → authToken
- [ ] Join Colyseus `citaadel` room (no portal error toast)
- [ ] Two browsers see each other move
- [ ] Vercel HTTPS → WSS (no mixed content)

## Note on `realm-server/`

The Colyseus server lives under `realm-server/` in this monorepo so it can ship with the FE PR. It is self-contained (own `package.json`, Docker, Caddy) and can be extracted to `Gotchiverse-Server` / `gotchiverse-realm-server` later by copying that folder.
