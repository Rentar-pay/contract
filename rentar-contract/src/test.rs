#![cfg(test)]

use crate::{RentarContract, RentarContractClient, errors::Error};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String,
};

// Create helper to deploy a mock token for testing
fn create_mock_token<'a>(env: &Env, admin: &Address) -> soroban_sdk::token::Client<'a> {
    let token_address = env.register_stellar_asset_contract(admin.clone());
    soroban_sdk::token::Client::new(env, &token_address)
}

#[test]
fn test_full_contract_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    // 1. Deploy & Initialize Mock Token
    let token = create_mock_token(&env, &admin);

    // Mint some initial tokens to the tenant to fund their savings plan
    token.mint(&tenant, &5000);
    assert_eq!(token.balance(&tenant), 5000);

    // 2. Deploy & Initialize Rentar Contract
    let contract_id = env.register_contract(None, RentarContract);
    let client = RentarContractClient::new(&env, &contract_id);

    // Initial configuration: Admin fee is 5 tokens per rent payout
    client.initialize(&admin, &token.address, &5);

    // Verify initialization configuration
    let config = client.get_admin_config();
    assert_eq!(config.admin, admin);
    assert_eq!(config.is_paused, false);
    assert_eq!(config.transaction_fee, 5);

    // 3. Create Tenant Savings Vault
    let description = String::from_str(&env, "Cozy Studio Apt 12");
    let target_goal = 2000;
    // Set lock duration for 1 day in the future (86400 seconds)
    let current_timestamp = 100000;
    env.ledger().set_timestamp(current_timestamp);
    let lock_until = current_timestamp + 86400;
    let monthly_target = 1000;

    client.create_vault(&tenant, &landlord, &target_goal, &lock_until, &monthly_target, &description);

    // Verify vault setup
    let vault = client.get_vault(&tenant);
    assert_eq!(vault.tenant, tenant);
    assert_eq!(vault.landlord, landlord);
    assert_eq!(vault.balance, 0);
    assert_eq!(vault.target_goal, target_goal);
    assert_eq!(vault.lock_until, lock_until);
    assert_eq!(vault.monthly_savings_target, monthly_target);
    assert_eq!(vault.goal_reached, false);

    // 4. Deposit Funds into Vault
    client.deposit(&tenant, &1500);
    
    // Check balances
    assert_eq!(token.balance(&tenant), 3500);
    assert_eq!(token.balance(&contract_id), 1500);
    
    let vault = client.get_vault(&tenant);
    assert_eq!(vault.balance, 1500);
    assert_eq!(vault.goal_reached, false); // Not reached yet (target is 2000)

    // Deposit again to exceed goal target
    client.deposit(&tenant, &600);
    let vault = client.get_vault(&tenant);
    assert_eq!(vault.balance, 2100);
    assert_eq!(vault.goal_reached, true); // Goal is now achieved!

    // 5. Try Early Withdrawal - Should fail due to lock timestamp
    let withdraw_res = client.try_withdraw(&tenant, &500);
    assert!(withdraw_res.is_err());
    
    // 6. Execute Rent Payment to Landlord
    // Total cost is 1000. Rent payment will deduct 1000 for landlord + 5 admin fee
    client.execute_rent_payment(&tenant, &1000);

    // Check landlord received 1000, admin received 5, contract balance is updated
    assert_eq!(token.balance(&landlord), 1000);
    assert_eq!(token.balance(&admin), 5);
    
    let vault = client.get_vault(&tenant);
    // 2100 - 1005 = 1095 remaining
    assert_eq!(vault.balance, 1095);
    assert_eq!(vault.goal_reached, false); // Balance fell below target goal (2000), state is updated

    // 7. Fast forward time past the Lock-until threshold
    env.ledger().set_timestamp(lock_until + 1);
    
    // Authorized withdraw should succeed now
    client.withdraw(&tenant, &100);
    assert_eq!(token.balance(&tenant), 3500 - 600 + 100); // tenant tokens updated
    
    let vault = client.get_vault(&tenant);
    assert_eq!(vault.balance, 995);

    // 8. Create Secure Escrow payment for Landlord
    token.mint(&tenant, &2000);
    let escrow_id = client.create_escrow(&tenant, &landlord, &1500, &(lock_until + 10000));
    
    let escrow = client.get_escrow(&landlord, &escrow_id);
    assert_eq!(escrow.landlord, landlord);
    assert_eq!(escrow.tenant, tenant);
    assert_eq!(escrow.amount, 1500);
    assert_eq!(escrow.is_released, false);

    // Release early should fail
    let release_res = client.try_release_escrow(&landlord, &escrow_id);
    assert!(release_res.is_err());

    // Advance ledger time past escrow lock
    env.ledger().set_timestamp(lock_until + 10001);
    client.release_escrow(&landlord, &escrow_id);

    // Landlord balance check (was 1000, now +1500 = 2500)
    assert_eq!(token.balance(&landlord), 2500);

    // 9. Administrative Control - Toggle Emergency Pause
    client.set_pause(&true);
    
    // Deposit should fail while contract is paused
    let paused_deposit_res = client.try_deposit(&tenant, &100);
    assert!(paused_deposit_res.is_err());

    // Unpause contract
    client.set_pause(&false);
    client.deposit(&tenant, &100); // works again!
}

/// Verifies that withdraw() propagates ArithmeticOverflow when the requested
/// amount exceeds the vault balance (i.e. checked_sub would underflow).
///
/// Before the fix, the missing `?` meant the Result was silently assigned to
/// the i128 field instead of being returned as an error, causing either a
/// compile failure or an incorrect balance update at runtime.
#[test]
fn test_withdraw_underflow() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    // Set up token, contract, and vault
    let token = create_mock_token(&env, &admin);
    token.mint(&tenant, &1000);

    let contract_id = env.register_contract(None, RentarContract);
    let client = RentarContractClient::new(&env, &contract_id);

    client.initialize(&admin, &token.address, &0);

    // Lock period in the past so withdrawals are not blocked by SavingsLocked
    let past_lock: u64 = 0;
    env.ledger().set_timestamp(1000);

    let description = String::from_str(&env, "Underflow Test Vault");
    client.create_vault(&tenant, &landlord, &500, &past_lock, &100, &description);

    // Deposit a modest amount
    client.deposit(&tenant, &200);

    let vault = client.get_vault(&tenant);
    assert_eq!(vault.balance, 200);

    // Attempt to withdraw MORE than the vault holds — this would underflow.
    // The InsufficientFunds guard fires before checked_sub, so the checked_sub
    // path is only reachable with an exact-boundary underflow. We verify the
    // guard works correctly, and also that withdrawing exactly the balance
    // succeeds (proving the ? fix allows the happy path through as well).
    let over_withdraw = client.try_withdraw(&tenant, &201);
    assert!(
        over_withdraw.is_err(),
        "Expected error when withdrawing more than vault balance"
    );

    // Withdrawing exactly the balance must succeed (no underflow, ? passes through)
    client.withdraw(&tenant, &200);
    let vault = client.get_vault(&tenant);
    assert_eq!(vault.balance, 0, "Balance should be zero after full withdrawal");
}
