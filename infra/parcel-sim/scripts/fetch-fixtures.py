"""Read installation types from the Base Installation diamond into src/fixtures/installations.json.

Uses Foundry `cast` so the sim stays dependency-free.
Usage: python3 scripts/fetch-fixtures.py [rpcUrl]
"""
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

RPC = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("BASE_MAINNET_RPC", "https://mainnet.base.org")
CAST = os.path.expanduser("~/.foundry/bin/cast")
INSTALLATION_DIAMOND = "0xebba5b725A2889f7f089a6cAE0246A32cad4E26b"
SIG = (
    "getInstallationType(uint256)((uint8,uint8,uint16,uint8,uint8,uint32,uint16,uint8,uint32,uint32,bool,"
    "uint256[4],uint256,uint256,uint256[],string,uint256,uint256))"
)
MAX_ID = 400
WEI = 10**18


def ether(v):
    return int(v) / WEI


def fetch(i):
    r = subprocess.run([CAST, "call", INSTALLATION_DIAMOND, SIG, str(i), "--rpc-url", RPC, "--json"], capture_output=True, text=True)
    if r.returncode != 0:
        return None
    t = json.loads(r.stdout)[0]
    if not t[15]:
        return None
    return {
        "id": i,
        "name": t[15],
        "installationType": int(t[2]),
        "level": int(t[3]),
        "alchemicaType": int(t[4]),
        "width": int(t[0]),
        "height": int(t[1]),
        "upgradeQueueBoost": int(t[7]),
        "craftTime": int(t[8]),
        "nextLevelId": int(t[9]),
        "deprecated": bool(t[10]),
        "alchemicaCost": [ether(c) for c in t[11]],
        "harvestRate": ether(t[12]),
        "capacity": ether(t[13]),
        "prerequisites": [int(p) for p in t[14]],
    }


with ThreadPoolExecutor(8) as pool:
    types = [t for t in pool.map(fetch, range(MAX_ID)) if t]

out = os.path.join(os.path.dirname(__file__), "..", "src", "fixtures", "installations.json")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w") as f:
    json.dump(
        {"chainId": 8453, "source": INSTALLATION_DIAMOND, "fetchedAt": datetime.now(timezone.utc).isoformat(), "types": types},
        f,
        indent=2,
    )
    f.write("\n")
print(f"wrote {len(types)} installation types")
