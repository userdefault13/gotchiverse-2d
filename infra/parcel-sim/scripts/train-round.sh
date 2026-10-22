#!/usr/bin/env bash
# One full training round, unattended: planner data over the wide config range, a first model, DAgger data
# driven by that model, the final model, and an evaluation of each against the planner on unseen seeds.
# Every step resumes or skips if its output already exists, so the script can be re-run after an interruption.
# Usage: scripts/train-round.sh [wide seeds] [dagger seeds]
set -euo pipefail
cd "$(dirname "$0")/.."
WIDE=${1:-1500}
DAGGER=${2:-750}
mkdir -p data models logs
node() { mise exec node@24 -- node "$@"; }
step() { echo "== $(date '+%F %T') $*"; }

step "planner data, $WIDE wide seeds"
node src/train/gen.ts --seeds "$WIDE" --first-seed 1 --out data/wide.jsonl
prior=$( [ -f data/planner.jsonl ] && echo data/planner.jsonl, || true )

step "fit model A"
[ -f models/wide.json ] || node src/train/fit.ts --data "${prior}data/wide.jsonl" --out models/wide.json > logs/fit-wide.log
tail -1 logs/fit-wide.log

step "DAgger data, $DAGGER seeds driven by model A"
node src/train/gen.ts --seeds "$DAGGER" --first-seed 20001 --out data/dagger.jsonl --learner models/wide.json

step "fit final model"
[ -f models/steward.json ] && [ ! -f models/steward-v1.json ] && mv models/steward.json models/steward-v1.json
[ -f models/steward.json ] || node src/train/fit.ts --data "${prior}data/wide.jsonl,data/dagger.jsonl" --out models/steward.json > logs/fit-final.log
tail -1 logs/fit-final.log

for m in steward-v1 wide steward; do
  [ -f "models/$m.json" ] || continue
  step "eval $m"
  node src/train/eval.ts --model "models/$m.json" --seeds 64 > "logs/eval-$m.log"
  cat "logs/eval-$m.log"
done
step done
