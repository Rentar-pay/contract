# 🛡 Threat Model and Security Analysis

This threat model outlines potential attack vectors against the **Rentar Smart Contract** and highlights the mechanisms implemented to mitigate them.

---

## 👥 Threat Actors & Trust Assumptions
1. **Malicious Tenant**: Attempts to withdraw locked funds, spoof deposits, bypass landlord payment commitments, or drain other vaults.
2. **Malicious Landlord**: Attempts to claim escrow early or claim funds they are not authorized to access.
3. **Compromised Admin**: Possesses power to adjust fees or trigger the pause circuit breaker. Assumption: Admin keys are secured using Stellar multisig or custody solutions.

---

## 🎯 Critical Risks & Mitigations

### 1. Unauthorized Fund Withdrawals (Tenant / Attacker)
- **Threat**: An attacker attempts to call `withdraw` on a tenant's vault or `release_escrow` on a landlord's escrow without permission.
- **Mitigation**: Strict validation using Soroban's native `require_auth()` verification on both tenant and landlord addresses. The contract verifies that the cryptographic signature of the caller matches the address designated as the owner of the resource.

### 2. Lock-Up Period Bypasses
- **Threat**: A tenant attempts to withdraw their committed savings before the agreed-upon `lock_until` period has expired.
- **Mitigation**: Explicit ledger timestamp check inside the `withdraw` routine.
  ```rust
  let current_time = env.ledger().timestamp();
  if current_time < vault.lock_until {
      return Err(Error::SavingsLocked);
  }
  ```
  The ledger timestamp cannot be manipulated by users, guaranteeing absolute temporal discipline.

### 3. Re-initialization & State Takeover
- **Threat**: An attacker attempts to call `initialize` after the contract has been deployed to hijack admin control.
- **Mitigation**: Checked condition at initialization startup:
  ```rust
  if get_admin_config_opt(&env).is_some() {
      return Err(Error::AlreadyInitialized);
  }
  ```
  Once set, the configuration cannot be re-created.

### 4. Mathematical Exploits & Integer Overflow
- **Threat**: An attacker tries to cause integer overflows inside vault balance additions or subtractions to inflate their balance.
- **Mitigation**: The contract utilizes checked arithmetic (`checked_add`, `checked_sub`) throughout. Any overflow immediately throws a contract error, reverting all state transitions.

### 5. Contract Lockup under Emergency
- **Threat**: A severe external protocol vulnerability or token issue occurs and funds are actively drained.
- **Mitigation**: Implemented an immediate global `is_paused` circuit breaker managed by the administrator, which blocks critical state modification calls until resolved.
