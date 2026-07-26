# RH aarena Stock Token prizes — Phase 2 (onchain vault)

Phase 1 (shipped): `aarena-rh` room + KO → SIM `pocket.nvda` credit → player **Withdraw** marks `sim_pending`.

## Phase 2 flow (not implemented in MVP)

```
RH Uniswap → Treasury Safe (holds NVDA ERC-20)
                ↓
     claim / distributor contract
                ↓
 player withdraw burns sim_pending → ERC-20 transfer to RH wallet
```

### Ops checklist

1. Fund a Gnosis/Safe on Robinhood Chain (4663) with ETH for gas + USDG.
2. Swap USDG → NVDA (or chosen Stock Token) on Uniswap / RFQ.
3. Deploy a claim vault that:
   - Holds Stock Tokens
   - Accepts merkle proofs or signed vouchers matching `pendingWithdrawals` ids
   - Transfers fractional ERC-20 to the claimer
4. Wire Aarcade `pocket/withdraw` (or a new `pocket/claim`) to require the onchain tx and set `status: fulfilled` + `txHash`.
5. Compliance / geo eligibility remains a product gate outside this vault.

### Env (REALM)

```
AARCADE_CARTRIDGE_SIM_URL=https://aarcadeghst.com/api/cartridge-sim
AARCADE_POCKET_CREDIT_SECRET=<shared with Aarcade>
RH_KO_PRIZE_AMOUNT=1000000000000000
RH_KO_MAX_CREDITS_PER_DAY=20
RH_KO_PAIR_COOLDOWN_MS=30000
```

### Env (Aarcade + Gotchiverse proxy)

```
AARCADE_POCKET_CREDIT_SECRET=<same shared secret>
CARTRIDGE_SIM_ENABLED=true
```
