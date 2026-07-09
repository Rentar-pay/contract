# 🏠 Rentar Smart Contract

Rentar is a production-grade, decentralized rent savings, goal tracking, and secure payment escrow platform built for the **Stellar Network** using the **Soroban Smart Contract SDK**. It addresses the common pain points of tenancy, including saving for security deposits, lock-up discipline, landlord trust, dynamic rent due configurations, and immutability of payment history.

## Key Features

- **User Savings Vaults**: Dynamic personal vaults where tenants can securely store tokens to prepare for rent.
- **Savings Goals**: Target tracking to monitor milestones. Automatically tags status when goals are hit.
- **Locked Savings**: Restrict early withdrawals to guarantee rent preparedness. Lock rules expire at a user-defined UNIX epoch.
- **Direct Rent Payments**: Execute payments instantly to the landlord's address, automatically deducting small configured platform fees.
- **Landlord Escrows**: Escrow support allows tenants to lock funds for landlord security, allowing landlords to safely claim them upon lock time expiry.
- **Monthly Savings Plans**: Configurable plans helping tenants plan and stick to healthy financial timelines.
- **Administrative Configuration & Controls**: Dynamic setting of transaction fees, accepted tokens, admin transfers, and emergency pause mechanism.
- **Optimized Storage**: Uses persistent storage alongside dynamic TTL extension rules (`extend_ttl_info`) to prevent eviction.
- **Full Event Emission**: Emits `SavingsCreated`, `DepositMade`, `WithdrawalMade`, `RentPaymentExecuted`, `SavingsGoalReached`, `EscrowReleased`, and `AdminUpdated`.

---

## 🛠 Project Structure

```bash
rentar-contract/
├── Cargo.toml          # Rust package dependencies & compiler profiles
└── src/
    ├── lib.rs          # Core smart contract entry point and implementation
    ├── types.rs        # Persistent storage structs and custom schema
    ├── errors.rs       # Contract error enum mappings
    └── test.rs         # High-coverage unit & integration test suite
```

---

## 🚀 How to Build & Run Tests

Ensure you have Rust and the `soroban-cli` installed.

### Build the Contract
Compile to optimized WASM:
```bash
cargo build --target wasm32-unknown-unknown --release
```

### Run Unit and Integration Tests
```bash
cargo test
```

## 🔐 Security Best Practices Included
1. **Strict Auth Verification**: Every user action is strictly guarded with `require_auth()` to prevent impersonation or unauthorized liquidations.
2. **Safe Math**: Avoids overflows with checked arithmetic (`checked_add`, `checked_sub`).
3. **Emergency Circuit Breaker**: Administrative pausing prevents exploits or funds processing in unforeseen network conditions.
4. **State Pinning Prevention**: Utilizes Soroban's TTL extensions on all key structural updates.
