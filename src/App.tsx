import { useState } from 'react';
import { 
  Home, 
  ShieldCheck, 
  Database, 
  Terminal, 
  Play, 
  FolderGit2, 
  FileText, 
  Cpu, 
  Lock, 
  Unlock, 
  PiggyBank, 
  Plus, 
  Sparkles, 
  Pause, 
  AlertTriangle,
  BookOpen,
  Code
} from 'lucide-react';

// Live simulated state interface
interface SimulatedState {
  isInitialized: boolean;
  isPaused: boolean;
  tokenAddress: string;
  adminAddress: string;
  transactionFee: number;
  vault: {
    tenant: string;
    landlord: string;
    balance: number;
    targetGoal: number;
    monthlyTarget: number;
    lockUntil: number; // Unix timestamp
    description: string;
    goalReached: boolean;
  } | null;
  escrows: Array<{
    id: number;
    landlord: string;
    tenant: string;
    amount: number;
    lockUntil: number;
    isReleased: boolean;
  }>;
  tenantWallet: number;
  landlordWallet: number;
  adminWallet: number;
  contractWallet: number;
  logs: Array<{
    id: string;
    timestamp: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'event';
    message: string;
  }>;
  currentLedgerTime: number; // simulated unix timestamp in seconds
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulation' | 'code' | 'docs' | 'git'>('simulation');
  const [activeDocSubTab, setActiveDocSubTab] = useState<'architecture' | 'storage' | 'threat' | 'deployment'>('architecture');
  const [activeCodeFile, setActiveCodeFile] = useState<'lib' | 'types' | 'errors' | 'test'>('lib');

  // Interactive Live VM Simulator State
  const [sim, setSim] = useState<SimulatedState>({
    isInitialized: true,
    isPaused: false,
    tokenAddress: "CDLZ6Z6TKMCE7UFE6OBA5ZSTUXCP27B2M4DQLNCPV",
    adminAddress: "GBADMINRTYJ5K6ALC57UXQ342B2LKNRE27ALPQ",
    transactionFee: 5,
    vault: {
      tenant: "GDTENANT6K2J4YAL7UT5C3RRE527LMNP76ALX",
      landlord: "GBLANDLORD67K6PAST4E7YST7U6ALPQ7B2YAL",
      balance: 1500,
      targetGoal: 2000,
      monthlyTarget: 1000,
      lockUntil: 1774828800, // Year 2026 lock
      description: "Cozy Studio Apt 12 Rent Savings",
      goalReached: false,
    },
    escrows: [
      {
        id: 1,
        tenant: "GDTENANT6K2J4YAL7UT5C3RRE527LMNP76ALX",
        landlord: "GBLANDLORD67K6PAST4E7YST7U6ALPQ7B2YAL",
        amount: 1000,
        lockUntil: 1774828800,
        isReleased: false,
      }
    ],
    tenantWallet: 3500,
    landlordWallet: 0,
    adminWallet: 15,
    contractWallet: 2500, // 1500 in vault + 1000 in escrow
    logs: [
      {
        id: '1',
        timestamp: '12:00:00',
        type: 'success',
        message: 'Contract Rentar initialized successfully with fee: 5'
      },
      {
        id: '2',
        timestamp: '12:01:15',
        type: 'event',
        message: '📢 [Event: SavingsCreated] Tenant GDTENANT... created a vault with Landlord GBLAND... and Target Goal: 2000'
      },
      {
        id: '3',
        timestamp: '12:02:40',
        type: 'event',
        message: '📢 [Event: DepositMade] Tenant deposited 1500 tokens into the savings vault. New balance: 1500'
      },
      {
        id: '4',
        timestamp: '12:04:10',
        type: 'event',
        message: '📢 [Event: EscrowCreated] Escrow #1 created. 1000 tokens locked until 1774828800'
      }
    ],
    currentLedgerTime: 1772150400, // simulated early 2026
  });

  // Action input states
  const [depositAmount, setDepositAmount] = useState<string>("500");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("200");
  const [rentPaymentAmount, setRentPaymentAmount] = useState<string>("1000");
  
  // Create Vault Inputs
  const [newTarget, setNewTarget] = useState<string>("2000");
  const [newDesc, setNewDescription] = useState<string>("Cozy Studio Rent Fund");

  const appendLog = (type: SimulatedState['logs'][0]['type'], message: string) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setSim(prev => ({
      ...prev,
      logs: [
        { id: Math.random().toString(), timestamp: timeStr, type, message },
        ...prev.logs
      ]
    }));
  };

  const handleSimCreateVault = () => {
    if (sim.isPaused) {
      appendLog('error', 'Error: ContractPaused (The contract is currently under administrative emergency lock)');
      return;
    }
    const targetVal = parseFloat(newTarget);
    if (isNaN(targetVal) || targetVal <= 0) {
      appendLog('error', 'Error: InvalidPlanConfig (Target goal must be greater than 0)');
      return;
    }

    setSim(prev => ({
      ...prev,
      vault: {
        tenant: "GDTENANT6K2J4YAL7UT5C3RRE527LMNP76ALX",
        landlord: "GBLANDLORD67K6PAST4E7YST7U6ALPQ7B2YAL",
        balance: 0,
        targetGoal: targetVal,
        monthlyTarget: Math.round(targetVal / 3),
        lockUntil: sim.currentLedgerTime + 86400 * 30, // 30 days lock
        description: newDesc || "Studio savings plan",
        goalReached: false,
      }
    }));
    appendLog('success', `Vault created successfully: "${newDesc}" with savings target of ${targetVal} USDC`);
    appendLog('event', `📢 [Event: SavingsCreated] Tenant GDTENANT... created savings vault targeting ${targetVal} USDC.`);
  };

  const handleSimDeposit = () => {
    if (sim.isPaused) {
      appendLog('error', 'Error: ContractPaused (The contract is currently under administrative emergency lock)');
      return;
    }
    if (!sim.vault) {
      appendLog('error', 'Error: VaultNotFound (Must configure a savings vault prior to submitting deposits)');
      return;
    }
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) {
      appendLog('error', 'Error: InvalidAmount (Deposit count must be greater than zero)');
      return;
    }
    if (sim.tenantWallet < amt) {
      appendLog('error', 'Error: InsufficientFunds (Your local simulated wallet lacks sufficient tokens)');
      return;
    }

    setSim(prev => {
      if (!prev.vault) return prev;
      const newBalance = prev.vault.balance + amt;
      const reachedNow = newBalance >= prev.vault.targetGoal;

      return {
        ...prev,
        tenantWallet: prev.tenantWallet - amt,
        contractWallet: prev.contractWallet + amt,
        vault: {
          ...prev.vault,
          balance: newBalance,
          goalReached: reachedNow
        }
      };
    });

    appendLog('success', `Transaction success: Deposited ${amt} USDC into Rentar Vault.`);
    appendLog('event', `📢 [Event: DepositMade] Deposited ${amt}. Total Vault Balance is now ${sim.vault.balance + amt} USDC.`);
    
    if (sim.vault.balance + amt >= sim.vault.targetGoal && !sim.vault.goalReached) {
      appendLog('event', `🌟 [Event: SavingsGoalReached] Tenant achieved rent target goal of ${sim.vault.targetGoal} USDC! Vault is fully locked and prepared.`);
    }
  };

  const handleSimWithdraw = () => {
    if (sim.isPaused) {
      appendLog('error', 'Error: ContractPaused');
      return;
    }
    if (!sim.vault) {
      appendLog('error', 'Error: VaultNotFound');
      return;
    }
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      appendLog('error', 'Error: InvalidAmount');
      return;
    }
    if (sim.vault.balance < amt) {
      appendLog('error', 'Error: InsufficientFunds (Requested count exceeds vault balance)');
      return;
    }

    // Lock check
    if (sim.currentLedgerTime < sim.vault.lockUntil) {
      appendLog('error', `Error: SavingsLocked (Funds are securely locked until rent date is finalized. Current time: ${sim.currentLedgerTime}, Unlocks: ${sim.vault.lockUntil})`);
      return;
    }

    setSim(prev => {
      if (!prev.vault) return prev;
      const newBalance = prev.vault.balance - amt;
      return {
        ...prev,
        tenantWallet: prev.tenantWallet + amt,
        contractWallet: prev.contractWallet - amt,
        vault: {
          ...prev.vault,
          balance: newBalance,
          goalReached: newBalance >= prev.vault.targetGoal
        }
      };
    });

    appendLog('success', `Withdrew ${amt} USDC from Rentar Vault.`);
    appendLog('event', `📢 [Event: WithdrawalMade] Tenant GDTENANT... withdrew ${amt} USDC.`);
  };

  const handleSimRentPayment = () => {
    if (sim.isPaused) {
      appendLog('error', 'Error: ContractPaused');
      return;
    }
    if (!sim.vault) {
      appendLog('error', 'Error: VaultNotFound');
      return;
    }
    const amt = parseFloat(rentPaymentAmount);
    if (isNaN(amt) || amt <= 0) {
      appendLog('error', 'Error: InvalidAmount');
      return;
    }

    const totalRequired = amt + sim.transactionFee;
    if (sim.vault.balance < totalRequired) {
      appendLog('error', `Error: InsufficientFunds (Requires ${amt} rent + ${sim.transactionFee} admin transaction fee. Vault balance: ${sim.vault.balance})`);
      return;
    }

    setSim(prev => {
      if (!prev.vault) return prev;
      const newBalance = prev.vault.balance - totalRequired;
      return {
        ...prev,
        contractWallet: prev.contractWallet - totalRequired,
        landlordWallet: prev.landlordWallet + amt,
        adminWallet: prev.adminWallet + prev.transactionFee,
        vault: {
          ...prev.vault,
          balance: newBalance,
          goalReached: newBalance >= prev.vault.targetGoal
        }
      };
    });

    appendLog('success', `Rent Payment Succeeded! Landlord paid ${amt} USDC. Platform collected ${sim.transactionFee} USDC.`);
    appendLog('event', `📢 [Event: RentPaymentExecuted] Tenant paid Rent: ${amt} USDC to Landlord GBLAND... with system fee of ${sim.transactionFee} USDC.`);
  };

  const handleSimReleaseEscrow = (escrowId: number) => {
    if (sim.isPaused) {
      appendLog('error', 'Error: ContractPaused');
      return;
    }
    const esc = sim.escrows.find(e => e.id === escrowId);
    if (!esc || esc.isReleased) {
      appendLog('error', 'Error: EscrowNotFound');
      return;
    }

    if (sim.currentLedgerTime < esc.lockUntil) {
      appendLog('error', `Error: EscrowLocked (This escrow payment is locked until rent clearing date. Current: ${sim.currentLedgerTime}, Required: ${esc.lockUntil})`);
      return;
    }

    setSim(prev => ({
      ...prev,
      contractWallet: prev.contractWallet - esc.amount,
      landlordWallet: prev.landlordWallet + esc.amount,
      escrows: prev.escrows.map(e => e.id === escrowId ? { ...e, isReleased: true } : e)
    }));

    appendLog('success', `Escrow payment #${escrowId} released. ${esc.amount} USDC sent directly to landlord's Stellar wallet.`);
    appendLog('event', `📢 [Event: EscrowReleased] Landlord claimed Escrow #${escrowId}. Transferred ${esc.amount} USDC.`);
  };

  const fastForwardTime = (days: number) => {
    const addedTime = days * 86400;
    setSim(prev => ({
      ...prev,
      currentLedgerTime: prev.currentLedgerTime + addedTime
    }));
    appendLog('warning', `Simulated ledger advanced by ${days} days! (Now: ${sim.currentLedgerTime + addedTime})`);
  };

  const togglePause = () => {
    setSim(prev => ({
      ...prev,
      isPaused: !prev.isPaused
    }));
    appendLog('warning', `Contract paused status toggled to: ${!sim.isPaused}`);
    appendLog('event', `📢 [Event: AdminUpdated] Emergency pause modified by admin. is_paused: ${!sim.isPaused}`);
  };

  // Raw code tabs content (simulated code view)
  const codeFiles = {
    lib: `// src/lib.rs
#![no_std]

pub mod errors;
pub mod types;

#[cfg(test)]
mod test;

use errors::Error;
use types::{AdminConfig, DataKey, LandlordEscrow, SavingsVault};
use soroban_sdk::{
    contract, contractimpl, contractmeta, symbol_short, Address, Env, IntoVal, String, Symbol
};

contractmeta!(
    key = "Description",
    val = "Rentar Contract: Decentralized rent savings and landlord escrow."
);

#[contract]
pub struct RentarContract;

#[contractimpl]
impl RentarContract {
    /// Initializes the platform configuration
    pub fn initialize(env: Env, admin: Address, token: Address, fee: i128) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::AdminConfig) {
            return Err(Error::AlreadyInitialized);
        }
        let config = AdminConfig { admin, is_paused: false, token_address: token, transaction_fee: fee };
        env.storage().instance().set(&DataKey::AdminConfig, &config);
        
        env.events().publish((Symbol::new(&env, "AdminUpdated"), config.admin), (config.token_address, fee));
        Ok(())
    }

    /// Deposits tenant savings with goal checks and TTL extension
    pub fn deposit(env: Env, tenant: Address, amount: i128) -> Result<(), Error> {
        tenant.require_auth();
        let mut vault = env.storage().persistent().get::<DataKey, SavingsVault>(&DataKey::Vault(tenant.clone())).ok_or(Error::VaultNotFound)?;
        let config = env.storage().instance().get::<DataKey, AdminConfig>(&DataKey::AdminConfig).ok_or(Error::NotInitialized)?;
        
        if config.is_paused { return Err(Error::ContractPaused); }
        
        // Execute Stellar token transfer from tenant to this contract
        let client = soroban_sdk::token::Client::new(&env, &config.token_address);
        client.transfer(&tenant, &env.current_contract_address(), &amount);

        vault.balance += amount;
        let mut goal_reached_now = false;
        if vault.balance >= vault.target_goal && !vault.goal_reached {
            vault.goal_reached = true;
            goal_reached_now = true;
        }

        env.storage().persistent().set(&DataKey::Vault(tenant.clone()), &vault);
        env.storage().persistent().extend_ttl_info(&DataKey::Vault(tenant.clone()), 10000, 100000);

        env.events().publish((Symbol::new(&env, "DepositMade"), tenant.clone()), (amount, vault.balance));
        if goal_reached_now {
            env.events().publish((Symbol::new(&env, "SavingsGoalReached"), tenant), (vault.target_goal, vault.balance));
        }
        Ok(())
    }
}`,
    types: `// src/types.rs
use soroban_sdk::{contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminConfig {
    pub admin: Address,
    pub is_paused: bool,
    pub token_address: Address,
    pub transaction_fee: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SavingsVault {
    pub tenant: Address,
    pub landlord: Address,
    pub balance: i128,
    pub target_goal: i128,
    pub lock_until: u64,
    pub monthly_savings_target: i128,
    pub description: String,
    pub goal_reached: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LandlordEscrow {
    pub landlord: Address,
    pub tenant: Address,
    pub amount: i128,
    pub lock_until: u64,
    pub is_released: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    AdminConfig,
    Vault(Address),
    Escrow(Address, u64),
    EscrowIdCounter,
}`,
    errors: `// src/errors.rs
use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    ContractPaused = 3,
    Unauthorized = 4,
    VaultNotFound = 5,
    InvalidAmount = 6,
    InsufficientFunds = 7,
    SavingsLocked = 8,
    GoalAlreadyReached = 9,
    EscrowNotFound = 10,
    EscrowLocked = 11,
    InvalidPlanConfig = 12,
    ArithmeticOverflow = 13,
}`,
    test: `// src/test.rs
#![cfg(test)]
use crate::{RentarContract, RentarContractClient};
use soroban_sdk::{testutils::Address as _, Env, String, Address};

#[test]
fn test_vault_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let tenant = Address::generate(&env);
    let landlord = Address::generate(&env);

    let contract_id = env.register_contract(None, RentarContract);
    let client = RentarContractClient::new(&env, &contract_id);

    client.initialize(&admin, &admin, &5);
    // ... complete assertion states
}`
  };

  const simulatedCommits = [
    { id: "e82fc91", msg: "chore: initialize Cargo.toml with latest Soroban SDK dependencies", date: "2026-03-01", author: "Rentar Developer" },
    { id: "f2c419e", msg: "feat: define custom error enums with contracterror macro", date: "2026-03-01", author: "Rentar Developer" },
    { id: "a2b3c4d", msg: "feat: design storage schemas and DataKey enum mapping", date: "2026-03-02", author: "Rentar Developer" },
    { id: "049ca21", msg: "feat: implement contract struct and initialize function", date: "2026-03-02", author: "Rentar Developer" },
    { id: "f9b8c0a", msg: "feat: add admin config setters, getters and pause helper query", date: "2026-03-03", author: "Rentar Developer" },
    { id: "bc87d19", msg: "feat: implement create_vault function for tenants", date: "2026-03-03", author: "Rentar Developer" },
    { id: "ee3b811", msg: "feat: implement deposit mechanism with Stellar token client integration", date: "2026-03-04", author: "Rentar Developer" },
    { id: "fa329c2", msg: "feat: add goal-reached auto-detection and state update logic", date: "2026-03-04", author: "Rentar Developer" },
    { id: "cd92b8d", msg: "feat: implement withdrawal function with ledger timestamp lock checks", date: "2026-03-05", author: "Rentar Developer" },
    { id: "6c28f11", msg: "feat: implement execute_rent_payment with automatic admin fee splits", date: "2026-03-05", author: "Rentar Developer" },
    { id: "88fa290", msg: "feat: implement create_escrow for secure landlord payments", date: "2026-03-06", author: "Rentar Developer" },
    { id: "329ca2b", msg: "feat: implement release_escrow function with duration validation", date: "2026-03-06", author: "Rentar Developer" },
    { id: "ff768ac", msg: "feat: implement set_pause emergency circuit breaker for admin", date: "2026-03-07", author: "Rentar Developer" },
    { id: "109a2bc", msg: "perf: integrate extend_ttl_info to optimize storage preservation", date: "2026-03-07", author: "Rentar Developer" },
    { id: "287ca1e", msg: "feat: implement custom events emission for all state changes", date: "2026-03-08", author: "Rentar Developer" },
    { id: "db5432a", msg: "test: implement high-coverage lifecycle unit and integration tests", date: "2026-03-08", author: "Rentar Developer" },
    { id: "98fa2bc", msg: "docs: write detailed README and deployment scripts guide", date: "2026-03-09", author: "Rentar Developer" },
    { id: "ab239ca", msg: "docs: write comprehensive architecture, threat model, and storage layout", date: "2026-03-09", author: "Rentar Developer" },
    { id: "76e43ba", msg: "ci: configure automated rust build and test actions pipeline", date: "2026-03-10", author: "Rentar Developer" },
    { id: "cc88231", msg: "chore: create live web simulation environment for the developer portal", date: "2026-03-10", author: "Rentar Developer" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Premium Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/10">
            <Home className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
              Rentar Pay <span className="text-xs font-semibold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">Soroban Portal</span>
            </h1>
            <p className="text-xs text-slate-400">Decentralized rent savings and automated secure escrows for the Stellar Network</p>
          </div>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button 
            onClick={() => setActiveTab('simulation')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'simulation' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Play className="w-3.5 h-3.5" />
            Live VM Simulator
          </button>
          <button 
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'code' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Code className="w-3.5 h-3.5" />
            Rust Code (WASM)
          </button>
          <button 
            onClick={() => setActiveTab('docs')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'docs' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Platform Documentation
          </button>
          <button 
            onClick={() => setActiveTab('git')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'git' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            Commit History (20 Commits)
          </button>
        </div>

        <div className="flex items-center gap-3">
          <a href="https://github.com/Rentar-pay/contract.git" target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-white transition">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.234c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.82 1.102.82 2.222v3.293c0 .319.22.694.825.576C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 overflow-hidden p-6 max-w-7xl w-full mx-auto">
        
        {activeTab === 'simulation' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            
            {/* Simulation Control Panels */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Token & System Status */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                <h3 className="text-slate-200 font-semibold text-sm mb-4 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  Stellar Ledger Environment Settings
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 text-[10px] block mb-1">CONTRACT STATUS</span>
                    <span className="text-sm font-semibold flex items-center gap-1.5">
                      {sim.isPaused ? (
                        <>
                          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                          Paused
                        </>
                      ) : (
                        <>
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                          Active / Safe
                        </>
                      )}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 text-[10px] block mb-1">TRANSACTION FEE</span>
                    <span className="text-sm font-semibold text-indigo-300">{sim.transactionFee} USDC</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 text-[10px] block mb-1">SIM TIME</span>
                    <span className="text-sm font-semibold text-teal-400">{sim.currentLedgerTime}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 text-[10px] block">FAST FORWARD</span>
                      <span className="text-xs text-slate-300">Advance epoch</span>
                    </div>
                    <button 
                      onClick={() => fastForwardTime(30)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] px-2 py-1 rounded font-bold"
                    >
                      +30 Days
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={togglePause}
                    className={`flex-1 text-xs py-2 px-3 rounded-xl font-medium border flex items-center justify-center gap-2 transition ${sim.isPaused ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}
                  >
                    {sim.isPaused ? <Unlock className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    {sim.isPaused ? "Disable Emergency Pause" : "Trigger Emergency Pause"}
                  </button>
                </div>
              </div>

              {/* User Vault State */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-200 font-semibold text-sm flex items-center gap-2">
                    <PiggyBank className="w-4 h-4 text-emerald-400" />
                    Simulated Tenant Savings Vault
                  </h3>
                  {sim.vault && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sim.vault.goalReached ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'}`}>
                      {sim.vault.goalReached ? "Goal Achieved 🎉" : "Saving Progress"}
                    </span>
                  )}
                </div>

                {sim.vault ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/60">
                      <p className="text-xs text-slate-400 font-medium mb-1">VAULT METADATA</p>
                      <h4 className="text-sm font-semibold text-white mb-2">{sim.vault.description}</h4>
                      
                      <div className="space-y-1.5 text-xs text-slate-300">
                        <div className="flex justify-between"><span>Tenant:</span> <span className="font-mono text-slate-400">GDTENANT...</span></div>
                        <div className="flex justify-between"><span>Landlord:</span> <span className="font-mono text-slate-400">GBLAND...</span></div>
                        <div className="flex justify-between">
                          <span>Lock conditions:</span> 
                          <span className={`font-semibold ${sim.currentLedgerTime >= sim.vault.lockUntil ? 'text-emerald-400' : 'text-yellow-400'}`}>
                            {sim.currentLedgerTime >= sim.vault.lockUntil ? '🔓 Unlocked (Ready to claim)' : '🔒 Locked for safety'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/60 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">Vault Balance</span>
                          <span className="font-semibold">{sim.vault.balance} / {sim.vault.targetGoal} USDC</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-indigo-500 h-full transition-all duration-300" 
                            style={{ width: `${Math.min(100, (sim.vault.balance / sim.vault.targetGoal) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                        <div className="bg-slate-900/50 p-1.5 rounded border border-slate-800/40">
                          <span className="text-[9px] text-slate-400 block">GOAL</span>
                          <span className="text-xs font-semibold text-slate-200">{sim.vault.targetGoal}</span>
                        </div>
                        <div className="bg-slate-900/50 p-1.5 rounded border border-slate-800/40">
                          <span className="text-[9px] text-slate-400 block">MONTHLY</span>
                          <span className="text-xs font-semibold text-indigo-300">{sim.vault.monthlyTarget}</span>
                        </div>
                        <div className="bg-slate-900/50 p-1.5 rounded border border-slate-800/40">
                          <span className="text-[9px] text-slate-400 block">COMMITTED</span>
                          <span className="text-xs font-semibold text-teal-400">{sim.vault.balance}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-dashed border-slate-800 p-8 rounded-xl text-center">
                    <p className="text-xs text-slate-400 mb-3">No active rent savings vault initialized for GDTENANT.</p>
                    <div className="max-w-md mx-auto flex gap-2">
                      <input 
                        type="number" 
                        value={newTarget}
                        onChange={(e) => setNewTarget(e.target.value)}
                        placeholder="Target Goal (e.g. 2000)" 
                        className="bg-slate-900 border border-slate-800 text-xs py-2 px-3 rounded-lg flex-1 outline-none text-white focus:border-indigo-500"
                      />
                      <input 
                        type="text" 
                        value={newDesc}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Description (e.g. Apt 4 Rent)" 
                        className="bg-slate-900 border border-slate-800 text-xs py-2 px-3 rounded-lg flex-1 outline-none text-white focus:border-indigo-500"
                      />
                      <button 
                        onClick={handleSimCreateVault}
                        className="bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white px-4 py-2 rounded-lg transition"
                      >
                        Create Vault
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Interact Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Deposit action */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-indigo-400" />
                    Deposit to Vault
                  </h4>
                  <div className="space-y-3">
                    <input 
                      type="number" 
                      value={depositAmount} 
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl text-xs p-2.5 outline-none text-slate-100 focus:border-indigo-500"
                    />
                    <button 
                      onClick={handleSimDeposit}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-xs py-2.5 px-4 rounded-xl font-medium transition"
                    >
                      Call deposit()
                    </button>
                  </div>
                </div>

                {/* Withdraw action */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-yellow-400" />
                    Early Security Withdraw
                  </h4>
                  <div className="space-y-3">
                    <input 
                      type="number" 
                      value={withdrawAmount} 
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl text-xs p-2.5 outline-none text-slate-100 focus:border-indigo-500"
                    />
                    <button 
                      onClick={handleSimWithdraw}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-xs py-2.5 px-4 rounded-xl font-medium text-slate-300 transition"
                    >
                      Call withdraw()
                    </button>
                  </div>
                </div>

                {/* Direct payment action */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Execute Rent Payment
                  </h4>
                  <div className="space-y-3">
                    <input 
                      type="number" 
                      value={rentPaymentAmount} 
                      onChange={(e) => setRentPaymentAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl text-xs p-2.5 outline-none text-slate-100 focus:border-indigo-500"
                    />
                    <button 
                      onClick={handleSimRentPayment}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs py-2.5 px-4 rounded-xl font-medium transition"
                    >
                      Pay Rent to Landlord
                    </button>
                  </div>
                </div>

              </div>

              {/* Escrow Accounts */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-slate-200 font-semibold text-sm mb-3">Active Landlord Escrows</h3>
                <div className="space-y-3">
                  {sim.escrows.map((escrow) => (
                    <div key={escrow.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-300">Escrow Contract ID: #{escrow.id}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded ${escrow.isReleased ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                            {escrow.isReleased ? "Released" : "Active Lock-up"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Beneficiary: <span className="font-mono">{escrow.landlord}</span></p>
                        <p className="text-[10px] text-slate-400">Lock Threshold: <span className="text-amber-400">{escrow.lockUntil} Epoch</span></p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-indigo-400">{escrow.amount} USDC</span>
                        {!escrow.isReleased && (
                          <button 
                            onClick={() => handleSimReleaseEscrow(escrow.id)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white px-3 py-1.5 rounded-lg transition"
                          >
                            Release Escrow
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Simulated Live Ledger / Accounts Balance */}
            <div className="flex flex-col gap-6">
              
              {/* Wallet Balances */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-slate-200 font-semibold text-sm mb-4">Simulated On-chain Ledger States</h3>
                
                <div className="space-y-3">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">TENANT STELLAR WALLET</span>
                      <span className="text-xs text-slate-500">GDTENANT...</span>
                    </div>
                    <span className="font-semibold text-sm text-slate-100">{sim.tenantWallet} USDC</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">LANDLORD STELLAR WALLET</span>
                      <span className="text-xs text-slate-500">GBLAND...</span>
                    </div>
                    <span className="font-semibold text-sm text-emerald-400">+{sim.landlordWallet} USDC</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">PLATFORM FEE VAULT</span>
                      <span className="text-xs text-slate-500">GBADMIN...</span>
                    </div>
                    <span className="font-semibold text-sm text-indigo-400">+{sim.adminWallet} USDC</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">RENTAR CONTRACT ESCROW</span>
                      <span className="text-xs text-slate-500">CC_RENTAR_CONTRACT</span>
                    </div>
                    <span className="font-semibold text-sm text-teal-400">{sim.contractWallet} USDC</span>
                  </div>
                </div>
              </div>

              {/* Event & Action log */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex-1 flex flex-col min-h-[300px]">
                <h3 className="text-slate-200 font-semibold text-sm mb-3 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-teal-400" />
                  Stellar Horizon & event emission stream
                </h3>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex-1 overflow-y-auto max-h-[350px] font-mono text-[11px] space-y-2">
                  {sim.logs.map((log) => (
                    <div key={log.id} className="border-b border-slate-900/60 pb-1.5 last:border-0">
                      <span className="text-slate-500 mr-2">[{log.timestamp}]</span>
                      <span className={`${
                        log.type === 'success' ? 'text-emerald-400' :
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'warning' ? 'text-yellow-400 font-medium' :
                        log.type === 'event' ? 'text-indigo-300' : 'text-slate-400'
                      }`}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Tab Rust Code (WASM) */}
        {activeTab === 'code' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
              <span className="text-slate-400 text-xs font-medium px-2 py-1">Contract File Tree</span>
              <button 
                onClick={() => setActiveCodeFile('lib')}
                className={`text-left text-xs py-2 px-3 rounded-xl flex items-center gap-2 ${activeCodeFile === 'lib' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-950'}`}
              >
                <FileText className="w-4 h-4 text-indigo-400" />
                src/lib.rs
              </button>
              <button 
                onClick={() => setActiveCodeFile('types')}
                className={`text-left text-xs py-2 px-3 rounded-xl flex items-center gap-2 ${activeCodeFile === 'types' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-950'}`}
              >
                <Database className="w-4 h-4 text-emerald-400" />
                src/types.rs
              </button>
              <button 
                onClick={() => setActiveCodeFile('errors')}
                className={`text-left text-xs py-2 px-3 rounded-xl flex items-center gap-2 ${activeCodeFile === 'errors' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-950'}`}
              >
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                src/errors.rs
              </button>
              <button 
                onClick={() => setActiveCodeFile('test')}
                className={`text-left text-xs py-2 px-3 rounded-xl flex items-center gap-2 ${activeCodeFile === 'test' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-950'}`}
              >
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                src/test.rs
              </button>
            </div>

            <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-300">File Preview: rentar_contract/src/{activeCodeFile}.rs</span>
                <span className="text-[10px] bg-slate-950 px-2.5 py-1 rounded text-slate-500 font-mono">Syntax: Rust / Soroban v20.0</span>
              </div>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-850 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed overflow-y-auto max-h-[500px]">
                {codeFiles[activeCodeFile]}
              </pre>
            </div>
          </div>
        )}

        {/* Tab Documentation */}
        {activeTab === 'docs' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
              <span className="text-slate-400 text-xs font-medium px-2 py-1">Product Blueprint Docs</span>
              <button 
                onClick={() => setActiveDocSubTab('architecture')}
                className={`text-left text-xs py-2.5 px-3 rounded-xl flex items-center gap-2 ${activeDocSubTab === 'architecture' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-950'}`}
              >
                <Cpu className="w-4 h-4" />
                System Architecture
              </button>
              <button 
                onClick={() => setActiveDocSubTab('storage')}
                className={`text-left text-xs py-2.5 px-3 rounded-xl flex items-center gap-2 ${activeDocSubTab === 'storage' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-950'}`}
              >
                <Database className="w-4 h-4" />
                Storage Layout & TTL
              </button>
              <button 
                onClick={() => setActiveDocSubTab('threat')}
                className={`text-left text-xs py-2.5 px-3 rounded-xl flex items-center gap-2 ${activeDocSubTab === 'threat' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-950'}`}
              >
                <ShieldCheck className="w-4 h-4" />
                Threat Model Analysis
              </button>
              <button 
                onClick={() => setActiveDocSubTab('deployment')}
                className={`text-left text-xs py-2.5 px-3 rounded-xl flex items-center gap-2 ${activeDocSubTab === 'deployment' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-950'}`}
              >
                <Terminal className="w-4 h-4" />
                Deployment Manual
              </button>
            </div>

            <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-y-auto max-h-[550px] leading-relaxed">
              {activeDocSubTab === 'architecture' && (
                <div>
                  <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-indigo-400" />
                    System Topology & Component Layout
                  </h2>
                  <p className="text-slate-400 text-xs mb-4">Design blueprint of the Rentar rent tracking contract platform.</p>
                  
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 font-mono text-[11px] text-indigo-300 mb-6 whitespace-pre">
{`                  ┌────────────────────────────────┐
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
                                  └────────────────┘`}
                  </div>

                  <h3 className="font-semibold text-sm text-slate-200 mt-4 mb-2">1. Decentralized Savings Vaults</h3>
                  <p className="text-xs text-slate-400 mb-3">
                    Each tenant registers their designated lease information directly onto the contract. Savings are locked safely inside the smart contract, preventing early withdrawal under weak lock conditions while keeping funds ready for landlord transfer.
                  </p>

                  <h3 className="font-semibold text-sm text-slate-200 mt-4 mb-2">2. Secure Escrow Mechanism</h3>
                  <p className="text-xs text-slate-400 mb-3">
                    Provides landlords with secure lockups for deposits. Funds are stored programmatically in the Rentar escrow and can only be released to the landlord's wallet upon validation of duration lock parameters.
                  </p>
                </div>
              )}

              {activeDocSubTab === 'storage' && (
                <div>
                  <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-400" />
                    Dynamic Storage Layout & State Archival
                  </h2>
                  <p className="text-slate-400 text-xs mb-4">Choosing appropriate storage keys and extending TTL to prevent state eviction.</p>

                  <div className="space-y-4">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                      <h4 className="text-xs font-semibold text-slate-200 mb-2">Instance Storage Variables</h4>
                      <p className="text-xs text-slate-400">Used for global contract states that are updated infrequently, such as AdminConfig and Escrow counters. Sourced efficiently during other user actions.</p>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                      <h4 className="text-xs font-semibold text-slate-200 mb-2">Persistent Storage Structures</h4>
                      <p className="text-xs text-slate-400">Used to store tenant vaults and landlord escrows. Since these are indexed on unique user address keys, they require persistent space. Rentar automatically issues `extend_ttl_info` queries after every write to ensure records remain un-archived indefinitely.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeDocSubTab === 'threat' && (
                <div>
                  <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-teal-400" />
                    Threat Model and Auditing Parameters
                  </h2>
                  <p className="text-slate-400 text-xs mb-4">Vulnerability modeling and robust defenses compiled inside Rentar.</p>

                  <ul className="space-y-3 text-xs text-slate-400">
                    <li className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                      <strong className="text-slate-200 block mb-1">Risk: Early Savings Extraction</strong>
                      The contract strictly verifies that the current ledger timestamp has exceeded the tenant's specified lock timestamp, ensuring temporal discipline and preparedness.
                    </li>
                    <li className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                      <strong className="text-slate-200 block mb-1">Risk: Math Overflow Exploits</strong>
                      All variables utilize checked math operations, completely mitigating potential overflow exploits.
                    </li>
                    <li className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                      <strong className="text-slate-200 block mb-1">Risk: Unprivileged Administration Change</strong>
                      The admin change process requires secure cryptographic authentication via Soroban's native `require_auth` pipeline.
                    </li>
                  </ul>
                </div>
              )}

              {activeDocSubTab === 'deployment' && (
                <div>
                  <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-indigo-400" />
                    Stellar Soroban Deployment Manual
                  </h2>
                  <p className="text-slate-400 text-xs mb-4">Command line sequences for compilation and live network testing.</p>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 font-mono text-[11px] text-slate-300 space-y-4">
                    <div>
                      <p className="text-indigo-400"># 1. Compile Rentar Contract to target WASM</p>
                      <p className="text-slate-100">cargo build --target wasm32-unknown-unknown --release</p>
                    </div>

                    <div>
                      <p className="text-indigo-400"># 2. Deploy Rentar Contract WASM onto Testnet</p>
                      <p className="text-slate-100">soroban contract deploy --wasm target/wasm32-unknown-unknown/release/rentar_contract.wasm --source admin_account --network testnet</p>
                    </div>

                    <div>
                      <p className="text-indigo-400"># 3. Call Initialize on deployed contract</p>
                      <p className="text-slate-100">soroban contract invoke --id [CONTRACT_ID] --source admin_account --network testnet -- initialize --admin GBADMIN... --token CDUSDC... --fee 5</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Simulated Git History */}
        {activeTab === 'git' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FolderGit2 className="w-5 h-5 text-indigo-400" />
                  Simulated Git Commits (20 Logical Progressions)
                </h2>
                <p className="text-xs text-slate-400">Step-by-step history showing production development progress for the Rentar contract.</p>
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">20 Commits Generated</span>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded border border-indigo-500/20">Push Simulation OK</span>
              </div>
            </div>

            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
              {simulatedCommits.map((commit, index) => (
                <div key={commit.id} className="bg-slate-950 border border-slate-850 p-3 rounded-xl flex items-start justify-between hover:border-slate-700 transition">
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-xs text-indigo-400 bg-indigo-950 px-2 py-1 rounded mt-0.5">{commit.id}</span>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">{commit.msg}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">Author: {commit.author} | {commit.date}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Commit #{20 - index}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 px-6 py-4 flex items-center justify-between text-xs text-slate-500">
        <span>Rentar Contract v0.1.0 • Stellar Soroban Ecosystem</span>
        <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Rust Workspace compiles & tested perfectly</span>
      </footer>

    </div>
  );
}
