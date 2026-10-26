# Gotchiverse 2D

Gotchiverse 2D is the browser game client for the Aavegotchi Gotchiverse. It is a Next.js, React, TypeScript, and Phaser application with game data and shared helpers vendored in `shared_code/`.

**Walkable MVP:** set `NEXT_PUBLIC_NETCODE=colyseus` and run the Colyseus REALM server from the separate repo [`gotchiverse-realm-server`](https://github.com/userdefault13/gotchiverse-realm-server). Deploy the FE to **Vercel** and the server to **DigitalOcean** — see [docs/DEPLOY.md](docs/DEPLOY.md).

## Requirements

- Node.js 20 or newer
- Yarn 1.22.x

This repo uses `yarn.lock`; do not use `npm install`.

## Quick Start

```bash
# Clone both repos as siblings, then from either:
git clone https://github.com/userdefault13/gotchiverse-realm-server.git
git clone https://github.com/userdefault13/gotchiverse-2d.git

cd gotchiverse-realm-server && cp .env.example .env && npm install
cd ../gotchiverse-2d && yarn install --frozen-lockfile && cp .env.example .env

# One command — FE (:3001) + BE (:2567)
yarn dev:all
# or from the realm server: npm run dev:all
```

Open [http://localhost:3001](http://localhost:3001). Use a **Base** wallet when `REALM_NETWORK=base`.

The default `.env.example` values point at local Colyseus (`:2567`) and Base Goldsky subgraphs. Optional wallet, captcha, Discord, and Sentry keys can stay blank for local UI work.

## Common Scripts

```bash
yarn dev        # Start the local Next.js dev server on port 3001
yarn dev:all    # Start FE + sibling REALM server together
yarn lint       # Type-check the project
yarn build      # Build the production app
yarn verify     # Run lint and production build
yarn start      # Start a built production app
```


Backend API / Colyseus live in [`gotchiverse-realm-server`](https://github.com/userdefault13/gotchiverse-realm-server). Point `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_COLYSEUS_URL` at that host. Full Vercel + DO steps: [docs/DEPLOY.md](docs/DEPLOY.md).

## Environment Files

The main local command, `yarn dev`, reads `.env`.

Other scripts read environment-specific files:

```bash
yarn dev:local         # .env.local.env
yarn dev:prod          # .env.prod.env
yarn dev:alpha         # .env.alpha.env
yarn dev:beta          # .env.beta.env
yarn dev:combat        # .env.combat.env
yarn dev:dev           # .env.development.env
yarn dev:local:mumbai  # .env.local.env with ALCHEMICA_NETWORK=mumbai
```

Keep real env files out of Git. Only `.env.example` should be committed.

## Shared Code

`shared_code/` is committed directly in this public repository. It is not a Git submodule, so a normal clone contains everything needed to install, type-check, and build the app.

## Docker

Build and run the production image:

```bash
docker build -t gotchiverse-2d .
docker run --rm -p 3001:3001 --env-file .env gotchiverse-2d
```

## Security

- Do not commit real `.env` files, API keys, private keys, mnemonics, logs, or generated build output.
- Run `yarn audit` before dependency updates are merged.
- Run `gitleaks dir . --redact` before publishing sensitive changes.

GitHub secret scanning, push protection, and Dependabot security updates are enabled on the public repository.

## Author

**Julius Wong** (userDef@ult) — [userdefault.dev](https://www.userdefault.dev) · [GitHub](https://github.com/userdefault13) · [X](https://x.com/userDefault_0x)

Freelance engineer working on AI agent orchestration, AI developer tooling, and Unity/WebGL
multiplayer games. Write-up of the multiplayer game work behind this project:
[userdefault.dev/work/gotchiverse-2d](https://www.userdefault.dev/work/gotchiverse-2d).

Available for freelance and contract work — [book a consult](https://www.userdefault.dev/hire),
or read more about [Unity & WebGL game development](https://www.userdefault.dev/services/unity-game-development).
