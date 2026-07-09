#![no_std]

pub mod errors;
pub mod types;

#[cfg(test)]
mod test;

use errors::Error;
use types::{AdminConfig, DataKey, LandlordEscrow, SavingsVault};

use soroban_sdk::{
    contract, contractimpl, contractmeta, symbol_short, Address, Env, IntoVal, String, Symbol, Val, Vec,
};

// Metadata for the smart contract build target
contractmeta!(
    key = "Description",
    val = "Rentar Contract: Decentralized rent savings, automated planning, and secure landlord escrow payments."
);

#[contract]
pub struct RentarContract;

// Helper function to check if the contract is paused
fn check_paused(env: &Env) -> Result<(), Error> {
    if let Some(config) = get_admin_config_opt(env) {
        if config.is_paused {
            return Err(Error::ContractPaused);
        }
    }
    Ok(())
}

// Helper to retrieve admin config options
fn get_admin_config_opt(env: &Env) -> Option<AdminConfig> {
    env.storage().instance().get(&DataKey::AdminConfig)
}

// Helper to save admin config
fn set_admin_config(env: &Env, config: &AdminConfig) {
    env.storage().instance().set(&DataKey::AdminConfig, config);
}

// Helper to fetch vault
fn get_vault_opt(env: &Env, tenant: &Address) -> Option<SavingsVault> {
    env.storage().persistent().get(&DataKey::Vault(tenant.clone()))
}

// Helper to save vault and extend its storage lifetime
fn set_vault(env: &Env, tenant: &Address, vault: &SavingsVault) {
    env.storage().persistent().set(&DataKey::Vault(tenant.clone()), vault);
    // Extend TTL to optimize storage and prevent eviction (standard practice in Soroban)
    env.storage().persistent().extend_ttl_info(
        &DataKey::Vault(tenant.clone()),
        10000,  // minimum threshold
        100000, // lifetime extension
    );
}

// Helper to transfer tokens
fn transfer_tokens(env: &Env, token_address: &Address, from: &Address, to: &Address, amount: i128) {
    let client = soroban_sdk::token::Client::new(env, token_address);
    client.transfer(from, to, &amount);
}

#[contractimpl]
impl RentarContract {
    /// Initializes the Rentar platform parameters, including the administrator, payment token, and platform fee.
    /// 
    /// # Arguments
    /// * `admin` - The admin address who will hold governance keys (e.g. pause, config, upgrades).
    /// * `token` - Stellar token address accepted for payments and savings (e.g. USDC, XLM-equivalent).
    /// * `fee` - A small performance fee (in micro-units) applied during settlement.
    /// 
    /// # Panics
    /// Panics if the contract has already been initialized.
    pub fn initialize(
        env: Env,
        admin: Address,
        token: Address,
        fee: i128,
    ) -> Result<(), Error> {
        if get_admin_config_opt(&env).is_some() {
            return Err(Error::AlreadyInitialized);
        }

        if fee < 0 {
            return Err(Error::InvalidPlanConfig);
        }

        let config = AdminConfig {
            admin: admin.clone(),
            is_paused: false,
            token_address: token,
            transaction_fee: fee,
        };

        set_admin_config(&env, &config);

        // Emit Initialization / Admin Update event
        env.events().publish(
            (Symbol::new(&env, "AdminUpdated"), admin),
            (config.token_address, fee),
        );

        Ok(())
    }

    /// Creates an isolated rent savings vault for a tenant.
    /// This establishes their payment rules, designated landlord, target savings goal, and lock periods.
    /// 
    /// # Arguments
    /// * `tenant` - Address of the tenant creating the vault. Must authorize.
    /// * `landlord` - Address of the landlord designated to receive the rent payments.
    /// * `target_goal` - Target rent cost to save towards (e.g., 1200 tokens).
    /// * `lock_until` - UNIX timestamp in seconds before which savings cannot be withdrawn without penalty or restriction.
    /// * `monthly_target` - Optional recommended monthly savings plan contribution.
    /// * `description` - Narrative tag (e.g., "Apt 24B Rent Fund") stored inside contract state.
    pub fn create_vault(
        env: Env,
        tenant: Address,
        landlord: Address,
        target_goal: i128,
        lock_until: u64,
        monthly_target: i128,
        description: String,
    ) -> Result<(), Error> {
        check_paused(&env)?;
        tenant.require_auth();

        if get_vault_opt(&env, &tenant).is_some() {
            return Err(Error::AlreadyInitialized);
        }

        if target_goal <= 0 || monthly_target < 0 {
            return Err(Error::InvalidPlanConfig);
        }

        let vault = SavingsVault {
            tenant: tenant.clone(),
            landlord: landlord.clone(),
            balance: 0,
            target_goal,
            lock_until,
            monthly_savings_target: monthly_target,
            description,
            goal_reached: false,
        };

        set_vault(&env, &tenant, &vault);

        // Emit SavingsCreated event
        env.events().publish(
            (Symbol::new(&env, "SavingsCreated"), tenant.clone()),
            (landlord, target_goal, lock_until),
        );

        Ok(())
    }

    /// Deposits a specified amount of tokens from the tenant's wallet into their Rentar savings vault.
    /// Automatically tracks if the predefined savings target goal has been reached and updates storage state.
    /// 
    /// # Arguments
    /// * `tenant` - Address of the tenant authorizing the deposit.
    /// * `amount` - Amount of tokens to transfer from tenant to the contract vault.
    pub fn deposit(env: Env, tenant: Address, amount: i128) -> Result<(), Error> {
        check_paused(&env)?;
        tenant.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut vault = get_vault_opt(&env, &tenant).ok_or(Error::VaultNotFound)?;
        let config = get_admin_config_opt(&env).ok_or(Error::NotInitialized)?;

        // Perform token transfer from tenant to this contract address
        transfer_tokens(&env, &config.token_address, &tenant, &env.current_contract_address(), amount);

        // Update balance and detect goal attainment
        let original_balance = vault.balance;
        vault.balance = original_balance.checked_add(amount).ok_or(Error::ArithmeticOverflow)?;

        let mut goals_achieved = false;
        if vault.balance >= vault.target_goal && !vault.goal_reached {
            vault.goal_reached = true;
            goals_achieved = true;
        }

        set_vault(&env, &tenant, &vault);

        // Emit DepositMade event
        env.events().publish(
            (Symbol::new(&env, "DepositMade"), tenant.clone()),
            (amount, vault.balance),
        );

        if goals_achieved {
            // Emit SavingsGoalReached event
            env.events().publish(
                (Symbol::new(&env, "SavingsGoalReached"), tenant.clone()),
                (vault.target_goal, vault.balance),
            );
        }

        Ok(())
    }

    /// Withdraws a portion of savings back to the tenant's own address.
    /// This call checks if the designated lock period has expired to protect committed rent savings from emotional spending.
    /// 
    /// # Arguments
    /// * `tenant` - Address of the tenant withdrawing.
    /// * `amount` - Number of tokens to withdraw.
    pub fn withdraw(env: Env, tenant: Address, amount: i128) -> Result<(), Error> {
        check_paused(&env)?;
        tenant.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut vault = get_vault_opt(&env, &tenant).ok_or(Error::VaultNotFound)?;
        let config = get_admin_config_opt(&env).ok_or(Error::NotInitialized)?;

        // Verify lock period conditions are met
        let current_time = env.ledger().timestamp();
        if current_time < vault.lock_until {
            return Err(Error::SavingsLocked);
        }

        if vault.balance < amount {
            return Err(Error::InsufficientFunds);
        }

        vault.balance = vault.balance.checked_sub(amount).ok_or(Error::ArithmeticOverflow);
        if vault.balance < vault.target_goal {
            vault.goal_reached = false;
        }

        set_vault(&env, &tenant, &vault);

        // Transfer funds back to tenant
        transfer_tokens(&env, &config.token_address, &env.current_contract_address(), &tenant, amount);

        // Emit WithdrawalMade event
        env.events().publish(
            (Symbol::new(&env, "WithdrawalMade"), tenant),
            (amount, vault.balance),
        );

        Ok(())
    }

    /// Executes direct rent payment from the accumulated vault savings directly to the landlord.
    /// Deducts any configured system administrative fees and updates the tenant's ledger.
    /// 
    /// # Arguments
    /// * `tenant` - Address of the tenant authorizing the rent execution.
    /// * `amount` - The total amount to pay to the landlord.
    pub fn execute_rent_payment(env: Env, tenant: Address, amount: i128) -> Result<(), Error> {
        check_paused(&env)?;
        tenant.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut vault = get_vault_opt(&env, &tenant).ok_or(Error::VaultNotFound)?;
        let config = get_admin_config_opt(&env).ok_or(Error::NotInitialized)?;

        // Ensure sufficient balance exists inside user vault
        let total_required = amount.checked_add(config.transaction_fee).ok_or(Error::ArithmeticOverflow)?;
        if vault.balance < total_required {
            return Err(Error::InsufficientFunds);
        }

        // Deduct from savings vault balance
        vault.balance = vault.balance.checked_sub(total_required).ok_or(Error::ArithmeticOverflow)?;
        if vault.balance < vault.target_goal {
            vault.goal_reached = false;
        }
        set_vault(&env, &tenant, &vault);

        // Pay landlord
        transfer_tokens(&env, &config.token_address, &env.current_contract_address(), &vault.landlord, amount);

        // Collect fee to admin
        if config.transaction_fee > 0 {
            transfer_tokens(&env, &config.token_address, &env.current_contract_address(), &config.admin, config.transaction_fee);
        }

        // Emit RentPaymentExecuted event
        env.events().publish(
            (Symbol::new(&env, "RentPaymentExecuted"), tenant),
            (vault.landlord, amount, config.transaction_fee),
        );

        Ok(())
    }

    /// Places rent money into a secure escrow within the contract for a landlord.
    /// This guarantees to the landlord that the tenant has paid, while keeping the funds locked until specified conditions or dates are met.
    /// 
    /// # Arguments
    /// * `tenant` - Address of the tenant establishing the escrow.
    /// * `landlord` - Address of the designated landlord.
    /// * `amount` - Amount of rent tokens to commit to escrow.
    /// * `lock_until` - UNIX timestamp before which the escrow cannot be released or claimed.
    pub fn create_escrow(
        env: Env,
        tenant: Address,
        landlord: Address,
        amount: i128,
        lock_until: u64,
    ) -> Result<u64, Error> {
        check_paused(&env)?;
        tenant.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let config = get_admin_config_opt(&env).ok_or(Error::NotInitialized)?;

        // Transfer funds from tenant to contract escrow account
        transfer_tokens(&env, &config.token_address, &tenant, &env.current_contract_address(), amount);

        // Generate dynamic counter-based ID for escrows to manage multiple instances securely
        let mut id_counter: u64 = env.storage().instance().get(&DataKey::EscrowIdCounter).unwrap_or(0);
        id_counter += 1;
        env.storage().instance().set(&DataKey::EscrowIdCounter, &id_counter);

        let escrow = LandlordEscrow {
            landlord: landlord.clone(),
            tenant: tenant.clone(),
            amount,
            lock_until,
            is_released: false,
        };

        let key = DataKey::Escrow(landlord.clone(), id_counter);
        env.storage().persistent().set(&key, &escrow);
        env.storage().persistent().extend_ttl_info(&key, 10000, 100000);

        // Emit SavingsCreated event (or Escrow created notice)
        env.events().publish(
            (Symbol::new(&env, "EscrowCreated"), tenant),
            (landlord, amount, id_counter),
        );

        Ok(id_counter)
    }

    /// Releases escrowed rent funds directly to the designated landlord after lock-up criteria are validated.
    /// 
    /// # Arguments
    /// * `landlord` - Landlord authorized to trigger claim and receive tokens.
    /// * `escrow_id` - ID of the escrow being claimed.
    pub fn release_escrow(env: Env, landlord: Address, escrow_id: u64) -> Result<(), Error> {
        check_paused(&env)?;
        landlord.require_auth();

        let key = DataKey::Escrow(landlord.clone(), escrow_id);
        let mut escrow = env.storage().persistent().get::<DataKey, LandlordEscrow>(&key).ok_or(Error::EscrowNotFound)?;

        if escrow.is_released {
            return Err(Error::EscrowNotFound);
        }

        // Verify timing requirements or general unlock parameters
        let current_time = env.ledger().timestamp();
        if current_time < escrow.lock_until {
            return Err(Error::EscrowLocked);
        }

        escrow.is_released = true;
        env.storage().persistent().set(&key, &escrow);

        let config = get_admin_config_opt(&env).ok_or(Error::NotInitialized)?;

        // Deliver funds to Landlord
        transfer_tokens(&env, &config.token_address, &env.current_contract_address(), &landlord, escrow.amount);

        // Emit EscrowReleased event
        env.events().publish(
            (Symbol::new(&env, "EscrowReleased"), landlord),
            (escrow.tenant, escrow.amount, escrow_id),
        );

        Ok(())
    }

    /// Updates dynamic administrative parameters (new master administrator address and platform-wide transaction fees).
    /// Can only be authorized by the existing administrator.
    /// 
    /// # Arguments
    /// * `new_admin` - Address of the designated successor admin.
    /// * `new_fee` - Updated transaction fee in micro-units.
    pub fn update_admin_config(env: Env, new_admin: Address, new_fee: i128) -> Result<(), Error> {
        let mut config = get_admin_config_opt(&env).ok_or(Error::NotInitialized)?;
        config.admin.require_auth();

        if new_fee < 0 {
            return Err(Error::InvalidPlanConfig);
        }

        config.admin = new_admin.clone();
        config.transaction_fee = new_fee;
        set_admin_config(&env, &config);

        // Emit AdminUpdated event
        env.events().publish(
            (Symbol::new(&env, "AdminUpdated"), new_admin),
            (config.token_address, new_fee),
        );

        Ok(())
    }

    /// Sets the contract's emergency pause state. If set to true, it locks all transfers, deposits, and releases.
    /// Only callable by the current administrator.
    /// 
    /// # Arguments
    /// * `is_paused` - Boolean state.
    pub fn set_pause(env: Env, is_paused: bool) -> Result<(), Error> {
        let mut config = get_admin_config_opt(&env).ok_or(Error::NotInitialized)?;
        config.admin.require_auth();

        config.is_paused = is_paused;
        set_admin_config(&env, &config);

        // Emit AdminUpdated event reflecting the pause state change
        env.events().publish(
            (Symbol::new(&env, "AdminUpdated"), config.admin),
            (config.is_paused, is_paused),
        );

        Ok(())
    }

    /// Query helper to retrieve a tenant's Rentar savings vault state.
    pub fn get_vault(env: Env, tenant: Address) -> Result<SavingsVault, Error> {
        get_vault_opt(&env, &tenant).ok_or(Error::VaultNotFound)
    }

    /// Query helper to retrieve landlord escrow state.
    pub fn get_escrow(env: Env, landlord: Address, escrow_id: u64) -> Result<LandlordEscrow, Error> {
        let key = DataKey::Escrow(landlord, escrow_id);
        env.storage().persistent().get(&key).ok_or(Error::EscrowNotFound)
    }

    /// Query helper to view current administrator configuration details.
    pub fn get_admin_config(env: Env) -> Result<AdminConfig, Error> {
        get_admin_config_opt(&env).ok_or(Error::NotInitialized)
    }
}
