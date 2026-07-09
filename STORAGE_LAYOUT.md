# 📦 Storage Layout & Optimization Documentation

Soroban uses state archival to prevent state bloat, where all data has a Time To Live (TTL) that must be periodically extended. The Rentar Contract is designed to minimize fees and optimize gas by choosing appropriate storage types and automatically extending TTLs.

---

## 🔑 Data Key Schema (`DataKey` Enum)

| Key Name | Storage Type | Rust Definition | Purpose |
| :--- | :--- | :--- | :--- |
| `AdminConfig` | **Instance** | `DataKey::AdminConfig` | Stores system parameters including admin address, pause state, token address, and transaction fees. |
| `Vault` | **Persistent** | `DataKey::Vault(Address)` | Tracks the tenant's individual vault state (balance, goals, lock thresholds, metadata). |
| `Escrow` | **Persistent** | `DataKey::Escrow(Address, u64)` | Tracks the status of secure landlord escrows indexed by landlord address and escrow counter ID. |
| `EscrowIdCounter` | **Instance** | `DataKey::EscrowIdCounter` | Tracks the next unique ID used to index landlord escrows. |

---

## ⚡ Storage Optimization Strategy

### 1. Instance Storage for Small Global Configs
Instance storage is bundled with the contract instance. We store `AdminConfig` and `EscrowIdCounter` here. This is extremely gas-efficient because these parameters are loaded and processed on almost every transaction, avoiding multiple separate storage reads.

### 2. Persistent Storage for Large User Entities
`SavingsVault` and `LandlordEscrow` are placed in persistent storage because they vary in size, grow linearly with user count, and are unique to user accounts. Placing them in instance storage would make the instance size grow prohibitively large.

### 3. Dynamic TTL Extensions (`extend_ttl_info`)
To prevent data eviction and user fund lockups:
- When a user vault is created or updated, the contract triggers:
  ```rust
  env.storage().persistent().extend_ttl_info(
      &DataKey::Vault(tenant),
      10000,  // minimum threshold (~1.3 days)
      100000, // extend to ~13.8 days
  );
  ```
- Similarly, creating or releasing a landlord escrow extends its lifetime. This ensures active vaults and escrows never expire due to storage rent rules.
