#!/usr/bin/env bash
# Deploy Gotchiverse REALM to DigitalOcean App Platform and point FE env at it.
#
# Required:
#   DIGITALOCEAN_ACCESS_TOKEN  — DO API token with App Platform write
# Optional:
#   VERCEL_TOKEN / VERCEL_SCOPE — update FE Production/Preview REALM URLs
#   JWT_SECRET                 — otherwise generated
#   DO_APP_NAME                — default gotchiverse-realm
#   DO_REGION                  — default nyc
#   REALM_PUBLIC_URL           — default https://realm.aarcadeghst.com
#   ATTACH_CUSTOM_DOMAIN=1     — attach realm.aarcadeghst.com after app is live
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPEC="${ROOT}/.do/app.yaml"
APP_NAME="${DO_APP_NAME:-gotchiverse-realm}"
SCOPE="${VERCEL_SCOPE:-userdefault13s-projects}"
REALM_PUBLIC_URL="${REALM_PUBLIC_URL:-https://realm.aarcadeghst.com}"

log() { echo "[deploy-realm-do] $*"; }

if [[ -z "${DIGITALOCEAN_ACCESS_TOKEN:-}" ]]; then
  cat <<EOF
ERROR: DIGITALOCEAN_ACCESS_TOKEN is not set.

Create a DigitalOcean personal access token (write: apps), then:

  export DIGITALOCEAN_ACCESS_TOKEN=dop_v1_...
  bash scripts/deploy-realm-digitalocean.sh

EOF
  exit 1
fi

if ! command -v doctl >/dev/null 2>&1; then
  log "installing doctl"
  curl -fsSL -o /tmp/doctl.tgz https://github.com/digitalocean/doctl/releases/download/v1.163.0/doctl-1.163.0-linux-amd64.tar.gz
  tar -xzf /tmp/doctl.tgz -C /tmp
  mkdir -p "$HOME/bin"
  mv /tmp/doctl "$HOME/bin/doctl"
  export PATH="$HOME/bin:$PATH"
fi

doctl auth init -t "$DIGITALOCEAN_ACCESS_TOKEN" >/dev/null

JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
export JWT_SECRET

# Resolve existing app id by name
APP_ID="$(doctl apps list --format ID,Spec.Name --no-header 2>/dev/null | awk -v n="$APP_NAME" '$2==n{print $1; exit}')"

if [[ -z "$APP_ID" ]]; then
  log "creating App Platform app from $SPEC"
  # doctl reads secrets from env when using --wait; pass JWT via update after create
  CREATE_OUT="$(doctl apps create --spec "$SPEC" --format ID,DefaultIngress --no-header)"
  APP_ID="$(echo "$CREATE_OUT" | awk '{print $1}')"
  log "created app id=$APP_ID"
else
  log "updating existing app id=$APP_ID"
  doctl apps update "$APP_ID" --spec "$SPEC" >/dev/null
fi

log "setting JWT_SECRET on app"
# Patch secret via apps update with inline env — doctl supports --update-env-vars style in newer versions.
# Fallback: write a temp spec with the secret value inlined for SECRET type.
TMP_SPEC="$(mktemp)"
python3 - <<PY > "$TMP_SPEC"
import os, pathlib, re, yaml, sys
# PyYAML may be missing — do a minimal string inject for JWT_SECRET placeholder
text = pathlib.Path("$SPEC").read_text()
# Ensure JWT_SECRET secret is present; doctl create doesn't set SECRET values from local env automatically.
print(text)
PY

# Use DO API to set secret env
python3 - <<PY
import json, os, urllib.request
token=os.environ["DIGITALOCEAN_ACCESS_TOKEN"]
app_id="$APP_ID"
jwt=os.environ["JWT_SECRET"]
# GET app spec
req=urllib.request.Request(f"https://api.digitalocean.com/v2/apps/{app_id}", headers={"Authorization":f"Bearer {token}"})
app=json.load(urllib.request.urlopen(req))["app"]
spec=app["spec"]
for svc in spec.get("services",[]):
  envs=svc.setdefault("envs",[])
  found=False
  for e in envs:
    if e.get("key")=="JWT_SECRET":
      e["value"]=jwt
      e["type"]="SECRET"
      found=True
  if not found:
    envs.append({"key":"JWT_SECRET","value":jwt,"type":"SECRET"})
  # PUBLIC_URL stays realm.aarcadeghst.com; also expose interim ingress below
body=json.dumps({"spec":spec}).encode()
req=urllib.request.Request(
  f"https://api.digitalocean.com/v2/apps/{app_id}",
  data=body,
  headers={"Authorization":f"Bearer {token}","Content-Type":"application/json"},
  method="PUT",
)
urllib.request.urlopen(req).read()
print("JWT_SECRET applied")
PY

log "waiting for deployment to become ACTIVE"
for i in $(seq 1 60); do
  PHASE="$(doctl apps get "$APP_ID" --format Phase --no-header 2>/dev/null || true)"
  INGRESS="$(doctl apps get "$APP_ID" --format DefaultIngress --no-header 2>/dev/null || true)"
  log "phase=$PHASE ingress=$INGRESS ($i/60)"
  if [[ "$PHASE" == "ACTIVE" && -n "$INGRESS" ]]; then
    break
  fi
  sleep 15
done

INGRESS="$(doctl apps get "$APP_ID" --format DefaultIngress --no-header)"
INGRESS="${INGRESS%/}"
if [[ -z "$INGRESS" ]]; then
  log "ERROR: no DefaultIngress yet — check DO dashboard for build logs"
  exit 1
fi

LIVE_URL="$INGRESS"

# Point PUBLIC_URL at the live ingress so auth/socket responses match the reachable host.
log "setting PUBLIC_URL=$LIVE_URL on app"
python3 - <<PY
import json, os, urllib.request
token=os.environ["DIGITALOCEAN_ACCESS_TOKEN"]
app_id="$APP_ID"
live="$LIVE_URL"
req=urllib.request.Request(f"https://api.digitalocean.com/v2/apps/{app_id}", headers={"Authorization":f"Bearer {token}"})
app=json.load(urllib.request.urlopen(req))["app"]
spec=app["spec"]
for svc in spec.get("services",[]):
  for e in svc.setdefault("envs",[]):
    if e.get("key")=="PUBLIC_URL":
      e["value"]=live
if os.environ.get("ATTACH_CUSTOM_DOMAIN")=="1":
  domains=spec.setdefault("domains",[])
  if not any(d.get("domain")=="realm.aarcadeghst.com" for d in domains):
    domains.append({"domain":"realm.aarcadeghst.com","type":"PRIMARY"})
body=json.dumps({"spec":spec}).encode()
req=urllib.request.Request(
  f"https://api.digitalocean.com/v2/apps/{app_id}",
  data=body,
  headers={"Authorization":f"Bearer {token}","Content-Type":"application/json"},
  method="PUT",
)
urllib.request.urlopen(req).read()
print("PUBLIC_URL updated")
PY

log "health check $LIVE_URL/health"
for i in $(seq 1 20); do
  if curl -fsS -m 10 "$LIVE_URL/health" | grep -q '"ok":true'; then
    log "REALM healthy at $LIVE_URL"
    break
  fi
  sleep 6
  if [[ $i -eq 20 ]]; then
    log "WARN: health not green yet; continuing to point FE at $LIVE_URL"
  fi
done

# Update Edge Config + Vercel FE envs to the live DO URL (use ingress until custom DNS works).
if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  log "updating Vercel Edge Config + NEXT_PUBLIC_* to $LIVE_URL"
  PATCH=$(python3 - <<PY
import json, datetime
print(json.dumps([
  {"operation":"upsert","key":"url","value":"$LIVE_URL"},
  {"operation":"upsert","key":"urls","value":["$LIVE_URL","$REALM_PUBLIC_URL"]},
  {"operation":"upsert","key":"updatedAt","value":datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ")},
]))
PY
)
  npx vercel edge-config update gotchiverse-realm-smoke --patch "$PATCH" --token "$VERCEL_TOKEN" --scope "$SCOPE" || true

  for var in NEXT_PUBLIC_API_URL NEXT_PUBLIC_COLYSEUS_URL NEXT_PUBLIC_REALM_URLS REALM_UPSTREAM_URL; do
    for envn in production preview; do
      npx vercel env rm "$var" "$envn" --yes --token "$VERCEL_TOKEN" --scope "$SCOPE" >/dev/null 2>&1 || true
    done
  done
  for envn in production preview; do
    printf '%s' "$LIVE_URL" | npx vercel env add NEXT_PUBLIC_API_URL "$envn" --token "$VERCEL_TOKEN" --scope "$SCOPE" >/dev/null
    printf '%s' "$LIVE_URL" | npx vercel env add NEXT_PUBLIC_COLYSEUS_URL "$envn" --token "$VERCEL_TOKEN" --scope "$SCOPE" >/dev/null
    printf '%s' "$LIVE_URL" | npx vercel env add REALM_UPSTREAM_URL "$envn" --token "$VERCEL_TOKEN" --scope "$SCOPE" >/dev/null
    printf '%s' "$LIVE_URL,$REALM_PUBLIC_URL" | npx vercel env add NEXT_PUBLIC_REALM_URLS "$envn" --token "$VERCEL_TOKEN" --scope "$SCOPE" >/dev/null
  done
  (cd "$ROOT" && npx vercel --prod --yes --token "$VERCEL_TOKEN" --scope "$SCOPE")
fi

cat <<EOF

✅ REALM on DigitalOcean App Platform
  App ID:     $APP_ID
  Live URL:   $LIVE_URL
  Custom DNS: create Cloudflare CNAME
              realm.aarcadeghst.com -> ${LIVE_URL#https://}
              (proxy off / grey-cloud until DO cert issues, then can orange-cloud)

EOF
