# 🏛 Rentar Contract Architecture

This document details the architectural layout, modules, component interactions, and state transitions of the **Rentar Smart Contract** on Stellar.

## System Topology

```
                  ┌────────────────────────────────┐
                  │          Rentar Admin          │
                  └───────────────┬────────────────┘
                                  │ Configures, Pauses
                                  ▼
┌──────────────┐   Deposits /     ┌────────────────┐   Claims Escrow  ┌──────────────┐
│    Tenant    ├─────────────────►│ Rentar Contract├─────────────────►│   Landlord   │
└──────────────┘   Rent Payment   └──────┬─────────┘                  └──────────────┘
                                         │
                                         │ Interacts with
                                         ▼
                                  ┌────────────────┐
                                  │ Stellar Token  │
                                  │ (USDC / XLM)   │
                                  └────────────────┘
```

---

## Component Layout

### 1. Storage Layers
- **Instance Storage**: Stores global configuration variables like `AdminConfig` and `EscrowIdCounter` which are small and frequently accessed.
- **Persistent Storage**: Stores larger user structs (`SavingsVault`, `LandlordEscrow`) with custom TTL extensions to guarantee survival of user data across long tenancy periods.

### 2. Functional Modules
- **Initialization Module**: Handles startup logic, sets active collateral token, and records governance keys.
- **Savings Management**: Creates and updates personalized vaults with specific target rules.
- **Payment Execution**: Processes automatic token distributions from the contract vault to the landlord and the admin vault.
- **Escrow Settlement**: Secures landlord collateral, enforces temporal rules, and distributes funds on demand.
- **Platform Controls**: Circuit breaker (emergency pause) and dynamic fee structure configuration.

---

## Core Workflows

### Deposit and Goal Tracking
1. Tenant initiates `deposit(amount)`.
2. Contract calls token client to transfer `amount` from `tenant` to the `RentarContract` address.
3. Vault balance is incremented and written to persistent storage.
4. If `balance >= target_goal`, the contract marks `goal_reached = true`.
5. Emits `DepositMade` and optionally `SavingsGoalReached`.

### Rent Payment Execution
1. Tenant calls `execute_rent_payment(amount)`.
2. Contract calculates `total_required = amount + admin_fee`.
3. Validates that current vault balance is greater than or equal to `total_required`.
4. Updates vault state.
5. Performs transfers:
   - `amount` transferred to Landlord address.
   - `admin_fee` transferred to Admin address (if configured).
6. Emits `RentPaymentExecuted`.
