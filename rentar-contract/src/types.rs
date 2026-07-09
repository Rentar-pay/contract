use soroban_sdk::{contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminConfig {
    /// The administrator address with power to pause, upgrade, and adjust parameters.
    pub admin: Address,
    /// Boolean flag to indicate emergency suspension of core activities.
    pub is_paused: bool,
    /// Token address used for rent payment transactions (e.g. USDC).
    pub token_address: Address,
    /// Small system fee (in micro-units) per automated escrow payment.
    pub transaction_fee: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SavingsVault {
    /// Owner of the savings vault.
    pub tenant: Address,
    /// Landlord designated to receive rent payments.
    pub landlord: Address,
    /// Total amount accumulated inside the vault.
    pub balance: i128,
    /// Target savings goal for the current cycle.
    pub target_goal: i128,
    /// Timestamp (in seconds) after which savings can be unlocked or rent paid.
    pub lock_until: u64,
    /// Configured monthly savings target to help guide users.
    pub monthly_savings_target: i128,
    /// Custom metadata descriptor (e.g., "Apt 4B Rent Savings").
    pub description: String,
    /// Flag indicating whether the target savings goal has been achieved.
    pub goal_reached: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LandlordEscrow {
    /// Landlord who is authorized to claim the escrow.
    pub landlord: Address,
    /// Tenant who funded the escrow.
    pub tenant: Address,
    /// Escrow balance waiting to be claimed or released.
    pub amount: i128,
    /// Lock duration/release timestamp for security checks.
    pub lock_until: u64,
    /// Flag indicating if the escrow was already claimed or cancelled.
    pub is_released: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Admin-related dynamic configuration (Stored in Instance/Persistent).
    AdminConfig,
    /// Savings vault for a specific tenant account. Key: `Vault(Address)`.
    Vault(Address),
    /// Landlord escrow key. Key: `Escrow(Address, u64)` (Landlord, ID/timestamp).
    Escrow(Address, u64),
    /// Counter for generating unique landlord escrow IDs.
    EscrowIdCounter,
}
