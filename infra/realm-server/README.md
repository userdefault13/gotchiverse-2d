# Gotchiverse REALM Server (deployable copy)

Colyseus `citaadel` room + HTTP BFF (nonce/auth, `/health`, config).

This tree is the **DigitalOcean-deployable** copy used by [`.do/app.yaml`](../../.do/app.yaml) in `gotchiverse-2d`. Upstream sibling repo: [`gotchiverse-realm-server`](https://github.com/userdefault13/gotchiverse-realm-server).

## DigitalOcean App Platform

```bash
# from gotchiverse-2d root
export DIGITALOCEAN_ACCESS_TOKEN=dop_v1_...
export VERCEL_TOKEN=...   # optional FE retarget
bash scripts/deploy-realm-digitalocean.sh
```

## Local

```bash
cp .env.example .env
npm install
npm run dev
# http://localhost:2567/health
```

## Droplet (Docker + Caddy)

```bash
cp .env.example .env
export REALM_DOMAIN=realm.aarcadeghst.com
docker compose up -d --build
```
