#!/usr/bin/env bash
# Keep gotchiverse-realm-server reachable via redundant public tunnels.
# - Ensures local REALM on :2567
# - Maintains cloudflared + localhost.run + localtunnel
# - Publishes live URLs to docs/realm-smoke-url.json (FE probes this at runtime)
# - Optionally syncs Vercel NEXT_PUBLIC_* when the URL set changes
#
# Usage:
#   WORKSPACE=/workspace bash scripts/realm-tunnel-watchdog.sh
# Env:
#   REALM_DIR=/tmp/gotchiverse-realm-server
#   WORKSPACE=/workspace
#   VERCEL_TOKEN=... VERCEL_SCOPE=userdefault13s-projects
#   WATCHDOG_SYNC_VERCEL=1   # also update Vercel envs + redeploy (slower)
#   WATCHDOG_INTERVAL_SEC=20

set -u
TMUX_CONF=/exec-daemon/tmux.portal.conf
REALM_DIR="${REALM_DIR:-/tmp/gotchiverse-realm-server}"
WORKSPACE="${WORKSPACE:-/workspace}"
INTERVAL="${WATCHDOG_INTERVAL_SEC:-20}"
STATE_DIR=/tmp/realm-watchdog
CLOUDFLARED="${CLOUDFLARED:-/tmp/cloudflared}"
BORE_BIN="${BORE_BIN:-/tmp/bore}"
URL_JSON="$WORKSPACE/docs/realm-smoke-url.json"
mkdir -p "$STATE_DIR"

log() { echo "[realm-watchdog $(date -u +%H:%M:%S)] $*"; }

tmux_ensure() {
  local name="$1"
  tmux -f "$TMUX_CONF" has-session -t "=$name" 2>/dev/null || \
    tmux -f "$TMUX_CONF" new-session -d -s "$name" -c /tmp -- "${SHELL:-bash}" -l
}

ensure_cloudflared_bin() {
  if [[ -x "$CLOUDFLARED" ]]; then return 0; fi
  if [[ -x /tmp/cloudflared-extract/usr/bin/cloudflared ]]; then
    cp /tmp/cloudflared-extract/usr/bin/cloudflared /tmp/cloudflared
    chmod +x /tmp/cloudflared
    return 0
  fi
  log "downloading cloudflared"
  curl -fsSL -o /tmp/cloudflared.deb \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
  dpkg -x /tmp/cloudflared.deb /tmp/cloudflared-extract
  cp /tmp/cloudflared-extract/usr/bin/cloudflared /tmp/cloudflared
  chmod +x /tmp/cloudflared
}

local_health() {
  curl -fsS -m 3 "http://127.0.0.1:2567/health" >/dev/null 2>&1
}

ensure_realm() {
  if local_health; then return 0; fi
  log "REALM down — restarting"
  tmux_ensure realm-server
  tmux -f "$TMUX_CONF" send-keys -t 'realm-server:0.0' C-c
  sleep 1
  tmux -f "$TMUX_CONF" send-keys -t 'realm-server:0.0' "cd '$REALM_DIR' && npm run start" C-m
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    sleep 1
    local_health && return 0
  done
  log "REALM failed to start"
  return 1
}

public_health() {
  local url="$1"
  local timeout="${2:-4}"
  curl -fsS -m "$timeout" "$url/health" 2>/dev/null | grep -q '"ok":true'
}

ensure_cloudflared() {
  ensure_cloudflared_bin || return 1
  local url=""
  if [[ -f /tmp/realm-cf.log ]]; then
    url=$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' /tmp/realm-cf.log | tail -1 || true)
  fi
  if [[ -n "$url" ]] && public_health "$url"; then
    echo "$url" > "$STATE_DIR/cf.url"
    return 0
  fi
  log "restarting cloudflared"
  tmux_ensure realm-cf
  tmux -f "$TMUX_CONF" send-keys -t 'realm-cf:0.0' C-c
  sleep 1
  : > /tmp/realm-cf.log
  tmux -f "$TMUX_CONF" send-keys -t 'realm-cf:0.0' \
    "$CLOUDFLARED tunnel --url http://127.0.0.1:2567 --no-autoupdate 2>&1 | tee /tmp/realm-cf.log" C-m
  for _ in $(seq 1 20); do
    sleep 1
    url=$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' /tmp/realm-cf.log | tail -1 || true)
    if [[ -n "$url" ]] && public_health "$url"; then
      echo "$url" > "$STATE_DIR/cf.url"
      log "cloudflared ok $url"
      return 0
    fi
  done
  log "cloudflared failed"
  return 1
}

ensure_lhr() {
  local url=""
  if [[ -f "$STATE_DIR/lhr.url" ]]; then
    url=$(cat "$STATE_DIR/lhr.url")
    if [[ -n "$url" ]] && public_health "$url"; then return 0; fi
  fi
  # Parse from live pane / log
  url=$(tmux -f "$TMUX_CONF" capture-pane -t realm-ssh-tunnel -p -S -80 2>/dev/null \
    | tr -cd '\11\12\15\40-\176' \
    | grep -oE 'https://[a-z0-9]+\.lhr\.life' \
    | tail -1 || true)
  if [[ -n "$url" ]] && public_health "$url"; then
    echo "$url" > "$STATE_DIR/lhr.url"
    return 0
  fi
  log "restarting localhost.run"
  tmux_ensure realm-ssh-tunnel
  tmux -f "$TMUX_CONF" send-keys -t 'realm-ssh-tunnel:0.0' C-c
  sleep 1
  : > /tmp/realm-lhr.log
  tmux -f "$TMUX_CONF" send-keys -t 'realm-ssh-tunnel:0.0' \
    'ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes -R 80:127.0.0.1:2567 nokey@localhost.run 2>&1 | tee /tmp/realm-lhr.log' C-m
  for _ in $(seq 1 25); do
    sleep 1
    url=$(tmux -f "$TMUX_CONF" capture-pane -t realm-ssh-tunnel -p -S -80 2>/dev/null \
      | tr -cd '\11\12\15\40-\176' \
      | grep -oE 'https://[a-z0-9]+\.lhr\.life' \
      | tail -1 || true)
    if [[ -z "$url" ]]; then
      url=$(grep -oE 'https://[a-z0-9]+\.lhr\.life' /tmp/realm-lhr.log 2>/dev/null | tail -1 || true)
    fi
    if [[ -n "$url" ]] && public_health "$url"; then
      echo "$url" > "$STATE_DIR/lhr.url"
      log "lhr ok $url"
      return 0
    fi
  done
  log "localhost.run failed"
  return 1
}

ensure_loca() {
  local url=""
  if [[ -f "$STATE_DIR/loca.url" ]]; then
    url=$(cat "$STATE_DIR/loca.url")
    if [[ -n "$url" ]] && public_health "$url" 3; then return 0; fi
  fi
  url=$(grep -oE 'https://[a-zA-Z0-9.-]+\.loca\.lt' /tmp/realm-lt.log 2>/dev/null | tail -1 || true)
  if [[ -n "$url" ]] && public_health "$url" 3; then
    echo "$url" > "$STATE_DIR/loca.url"
    return 0
  fi
  log "restarting localtunnel"
  tmux_ensure realm-lt
  tmux -f "$TMUX_CONF" send-keys -t 'realm-lt:0.0' C-c
  sleep 1
  : > /tmp/realm-lt.log
  # Prefer stable subdomain; fall back to random if taken.
  tmux -f "$TMUX_CONF" send-keys -t 'realm-lt:0.0' \
    'npx --yes localtunnel --port 2567 --subdomain gotchiverse-realm-mvp 2>&1 | tee /tmp/realm-lt.log' C-m
  for _ in $(seq 1 12); do
    sleep 1
    url=$(grep -oE 'https://[a-zA-Z0-9.-]+\.loca\.lt' /tmp/realm-lt.log 2>/dev/null | tail -1 || true)
    if [[ -n "$url" ]] && public_health "$url" 3; then
      echo "$url" > "$STATE_DIR/loca.url"
      log "loca ok $url"
      return 0
    fi
  done
  log "localtunnel failed (non-fatal)"
  rm -f "$STATE_DIR/loca.url"
  return 1
}

keepalive_ping() {
  local url
  for f in cf.url lhr.url loca.url; do
    [[ -f "$STATE_DIR/$f" ]] || continue
    url=$(cat "$STATE_DIR/$f")
    curl -fsS -m 5 "$url/health" >/dev/null 2>&1 || true
  done
}

publish_urls() {
  local cf lhr loca primary
  cf=$(cat "$STATE_DIR/cf.url" 2>/dev/null || true)
  lhr=$(cat "$STATE_DIR/lhr.url" 2>/dev/null || true)
  loca=$(cat "$STATE_DIR/loca.url" 2>/dev/null || true)
  primary="${cf:-${lhr:-$loca}}"
  [[ -n "$primary" ]] || return 1

  local tmp="$STATE_DIR/realm-smoke-url.json"
  cat > "$tmp" <<EOF
{
  "updatedAt": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "url": "$primary",
  "urls": [
$(
  first=1
  for u in "$cf" "$lhr" "$loca"; do
    [[ -n "$u" ]] || continue
    if [[ $first -eq 1 ]]; then first=0; else echo ","; fi
    printf '    "%s"' "$u"
  done
  echo
)
  ],
  "note": "Ephemeral smoke tunnels maintained by scripts/realm-tunnel-watchdog.sh. FE probes these at Enter time."
}
EOF

  if [[ -f "$URL_JSON" ]] && cmp -s "$tmp" "$URL_JSON"; then
    return 0
  fi

  cp "$tmp" "$URL_JSON"
  # Keep REALM PUBLIC_URL aligned with primary
  if [[ -f "$REALM_DIR/.env" ]]; then
    sed -i "s|^PUBLIC_URL=.*|PUBLIC_URL=$primary|" "$REALM_DIR/.env" || true
  fi

  log "published smoke URLs primary=$primary"
  if [[ -d "$WORKSPACE/.git" ]]; then
    (
      cd "$WORKSPACE" || exit 0
      git add docs/realm-smoke-url.json
      if git diff --cached --quiet; then exit 0; fi
      git commit -m "chore: refresh REALM smoke tunnel URLs"
      # Best-effort push so raw.githubusercontent.com updates without FE redeploy
      git push -u origin HEAD || log "git push failed (raw JSON may be stale until push succeeds)"
    )
  fi

  if [[ "${WATCHDOG_SYNC_VERCEL:-0}" == "1" && -n "${VERCEL_TOKEN:-}" ]]; then
    sync_vercel "$primary" "$cf" "$lhr" "$loca"
  fi
}

sync_vercel() {
  local primary="$1"
  local urls_csv
  urls_csv=$(printf '%s,' "${@:1}" | sed 's/,$//')
  local scope="${VERCEL_SCOPE:-userdefault13s-projects}"
  log "syncing Vercel env primary=$primary"
  for var in NEXT_PUBLIC_API_URL NEXT_PUBLIC_COLYSEUS_URL NEXT_PUBLIC_REALM_URLS REALM_UPSTREAM_URL; do
    for envn in production preview; do
      npx vercel env rm "$var" "$envn" --yes --token "$VERCEL_TOKEN" --scope "$scope" >/dev/null 2>&1 || true
    done
  done
  for envn in production preview; do
    printf '%s' "$primary" | npx vercel env add NEXT_PUBLIC_API_URL "$envn" --token "$VERCEL_TOKEN" --scope "$scope" >/dev/null
    printf '%s' "$primary" | npx vercel env add NEXT_PUBLIC_COLYSEUS_URL "$envn" --token "$VERCEL_TOKEN" --scope "$scope" >/dev/null
    printf '%s' "$primary" | npx vercel env add REALM_UPSTREAM_URL "$envn" --token "$VERCEL_TOKEN" --scope "$scope" >/dev/null
    printf '%s' "$urls_csv" | npx vercel env add NEXT_PUBLIC_REALM_URLS "$envn" --token "$VERCEL_TOKEN" --scope "$scope" >/dev/null
  done
  (cd "$WORKSPACE" && npx vercel --prod --yes --token "$VERCEL_TOKEN" --scope "$scope") || log "vercel redeploy failed"
}

log "starting interval=${INTERVAL}s workspace=$WORKSPACE"
ensure_cloudflared_bin
while true; do
  ensure_realm || true
  # Prefer CF + LHR; loca is best-effort (often interstitial / flaky).
  ensure_cloudflared || true
  ensure_lhr || true
  ensure_loca || true
  keepalive_ping
  publish_urls || true
  sleep "$INTERVAL"
done
