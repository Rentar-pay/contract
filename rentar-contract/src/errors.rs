use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum Error {
    /// The contract has already been initialized and cannot be initialized again.
    AlreadyInitialized = 1,
    
    /// The contract is not initialized yet.
    NotInitialized = 2,
    
    /// The contract is currently paused due to emergency.
    ContractPaused = 3,
    
    /// Unauthorized caller. Access denied.
    Unauthorized = 4,
    
    /// Savings vault was not found for this user.
    VaultNotFound = 5,
    
    /// Deposit amount must be greater than zero.
    InvalidAmount = 6,
    
    /// Withdraw amount exceeds available savings.
    InsufficientFunds = 7,
    
    /// Savings are locked until the configured lock conditions are met.
    SavingsLocked = 8,
    
    /// Savings goal has already been achieved.
    GoalAlreadyReached = 9,
    
    /// The specified payment/escrow has already been released or does not exist.
    EscrowNotFound = 10,
    
    /// Escrow cannot be released yet (conditions or lock time not met).
    EscrowLocked = 11,
    
    /// Configured savings plan has invalid parameters (e.g. zero target, past lock date).
    InvalidPlanConfig = 12,
    
    /// Arithmetic overflow occurred in contract calculations.
    ArithmeticOverflow = 13,
}
