//!
//! YieldAggregator in Stylus Rust
//!
//! A smart contract that aggregates yield data from multiple DeFi protocols
//! to reduce RPC round-trips and provide efficient portfolio views
//!

// Allow `cargo stylus export-abi` to generate a main function.
#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]

#[macro_use]
extern crate alloc;

use alloc::string::String;
use alloc::vec::Vec;

/// Import items from the SDK. The prelude contains common traits and macros.
use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::sol,
    prelude::*,
    stylus_core::log,
};

/// Import OpenZeppelin Ownable functionality
use openzeppelin_stylus::access::ownable::{self, IOwnable, Ownable};

/// Error types for the contract
#[derive(SolidityError, Debug)]
pub enum Error {
    UnauthorizedAccount(ownable::OwnableUnauthorizedAccount),
    InvalidOwner(ownable::OwnableInvalidOwner),
    InvalidProtocol,
    InvalidToken,
    CallFailed,
}

impl From<ownable::Error> for Error {
    fn from(value: ownable::Error) -> Self {
        match value {
            ownable::Error::UnauthorizedAccount(e) => Error::UnauthorizedAccount(e),
            ownable::Error::InvalidOwner(e) => Error::InvalidOwner(e),
        }
    }
}

// Define the PositionView struct
sol! {
    struct PositionView {
        address owner;
        uint8 protocol; // 0=AAVE, 1=UNIV3, 2=CURVE
        address[] assets;
        uint256[] amounts;
        uint256 apr; // 1e18 precision
        uint256 apy; // 1e18 precision
        int256 accruedUsd; // 1e8 precision
        uint256 updatedAt;
    }
}

// Define the PortfolioSummary struct
sol! {
    struct PortfolioSummary {
        uint256 totalValue;
        uint256 totalAccrued;
        uint256 weightedApy;
        uint256 lastUpdated;
    }
}

// Define events
sol! {
    event PositionUpdated(address indexed owner, uint8 protocol, uint256 totalValue, uint256 apy);
    event ProtocolDataFetched(uint8 protocol, uint256 positionsCount);
}

// Define persistent storage using the Solidity ABI.
sol_storage! {
    #[entrypoint]
    pub struct YieldAggregator {
        Ownable ownable;
        
        // Protocol addresses
        address aave_pool_data_provider;
        address uniswap_position_manager;
        address curve_tricrypto_pool;
        address curve_tricrypto_gauge;
        
        // Price feeds
        mapping(address => address) price_feeds;
        
        // Cached data
        mapping(address => mapping(uint8 => PositionView)) user_positions;
        mapping(address => PortfolioSummary) user_summaries;
        
        // Configuration
        uint256 cache_duration;
        bool enabled;
    }
}

/// Declare that `YieldAggregator` is a contract with the following external methods.
#[public]
#[implements(IOwnable<Error = Error>)]
impl YieldAggregator {
    #[constructor]
    pub fn constructor(&mut self, initial_owner: Address) -> Result<(), Error> {
        // Initialize Ownable with the initial owner
        self.ownable.constructor(initial_owner)?;
        
        // Set default protocol addresses (Arbitrum)
        self.aave_pool_data_provider.set(Address::from_slice(&hex::decode("145dE30c929a065582Bfc8e9C1a8B0b8C3c3b5C3").unwrap()));
        self.uniswap_position_manager.set(Address::from_slice(&hex::decode("C36442b4a4522E871399CD717aBDD847Ab11FE88").unwrap()));
        self.curve_tricrypto_pool.set(Address::from_slice(&hex::decode("960ea3e3C7FB317332d990873d354E18d7645590").unwrap()));
        self.curve_tricrypto_gauge.set(Address::from_slice(&hex::decode("97E2768e8E73511cA874545DC5Ff8067eB19B787").unwrap()));
        
        // Set default price feeds
        self.set_price_feed(Address::from_slice(&hex::decode("82aF49447D8a07e3bd95BD0d56f35241523fBab1").unwrap()), 
                           Address::from_slice(&hex::decode("639Fe6ab55C921f74e7fac1ee960C0b6293ba612").unwrap())); // WETH
        self.set_price_feed(Address::from_slice(&hex::decode("af88d065e77c8cC2239327C5EDb3A432268e5831").unwrap()), 
                           Address::from_slice(&hex::decode("50834F3163758fcC1Df9973b6e91f0F0F0434aD3").unwrap())); // USDC
        
        self.cache_duration.set(U256::from(30)); // 30 seconds
        self.enabled.set(true);
        
        Ok(())
    }

    /// Get positions for a single user across all protocols
    pub fn get_positions(&self, owner: Address) -> Vec<PositionView> {
        if !self.enabled.get() {
            return Vec::new();
        }

        let mut positions = Vec::new();
        
        // Get Aave positions
        if let Some(pos) = self.get_aave_positions(owner) {
            positions.push(pos);
        }
        
        // Get Uniswap positions
        if let Some(pos) = self.get_uniswap_positions(owner) {
            positions.push(pos);
        }
        
        // Get Curve positions
        if let Some(pos) = self.get_curve_positions(owner) {
            positions.push(pos);
        }
        
        positions
    }

    /// Get positions for multiple users
    pub fn get_positions_multi(&self, owners: Vec<Address>) -> Vec<PositionView> {
        if !self.enabled.get() {
            return Vec::new();
        }

        let mut all_positions = Vec::new();
        
        for owner in owners {
            let positions = self.get_positions(owner);
            all_positions.extend(positions);
        }
        
        all_positions
    }

    /// Get portfolio summary for a user
    pub fn get_portfolio_summary(&self, owner: Address) -> PortfolioSummary {
        if !self.enabled.get() {
            return PortfolioSummary {
                totalValue: U256::ZERO,
                totalAccrued: U256::ZERO,
                weightedApy: U256::ZERO,
                lastUpdated: U256::ZERO,
            };
        }

        let positions = self.get_positions(owner);
        self.calculate_portfolio_summary(positions)
    }

    /// Get portfolio summary for multiple users
    pub fn get_portfolio_summary_multi(&self, owners: Vec<Address>) -> PortfolioSummary {
        if !self.enabled.get() {
            return PortfolioSummary {
                totalValue: U256::ZERO,
                totalAccrued: U256::ZERO,
                weightedApy: U256::ZERO,
                lastUpdated: U256::ZERO,
            };
        }

        let mut all_positions = Vec::new();
        
        for owner in owners {
            let positions = self.get_positions(owner);
            all_positions.extend(positions);
        }
        
        self.calculate_portfolio_summary(all_positions)
    }

    /// Set price feed for a token
    pub fn set_price_feed(&mut self, token: Address, feed: Address) -> Result<(), Error> {
        self.ownable.only_owner()?;
        self.price_feeds.insert(token, feed);
        Ok(())
    }

    /// Set protocol addresses
    pub fn set_protocol_addresses(&mut self, aave: Address, uniswap: Address, curve_pool: Address, curve_gauge: Address) -> Result<(), Error> {
        self.ownable.only_owner()?;
        self.aave_pool_data_provider.set(aave);
        self.uniswap_position_manager.set(uniswap);
        self.curve_tricrypto_pool.set(curve_pool);
        self.curve_tricrypto_gauge.set(curve_gauge);
        Ok(())
    }

    /// Toggle aggregator enabled state
    pub fn set_enabled(&mut self, enabled: bool) -> Result<(), Error> {
        self.ownable.only_owner()?;
        self.enabled.set(enabled);
        Ok(())
    }

    /// Get token price from Chainlink feed
    fn get_token_price(&self, token: Address) -> Result<U256, Error> {
        let feed = self.price_feeds.get(token);
        if feed == Address::ZERO {
            return Err(Error::InvalidToken);
        }

        // Chainlink Aggregator interface
        let abi = sol! {
            function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
        };

        let result = self.vm().static_call(feed, abi.latestRoundData.abi(), &[])?;
        let decoded = abi.latestRoundData.decode(&result)?;
        
        Ok(U256::from(decoded.answer))
    }

    /// Get Aave positions for a user
    fn get_aave_positions(&self, owner: Address) -> Option<PositionView> {
        let data_provider = self.aave_pool_data_provider.get();
        
        // Aave PoolDataProvider interface
        let abi = sol! {
            function getUserReserveData(address asset, address user) view returns (uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled);
        };

        // Check WETH position
        let weth = Address::from_slice(&hex::decode("82aF49447D8a07e3bd95BD0d56f35241523fBab1").unwrap());
        
        if let Ok(result) = self.vm().static_call(data_provider, abi.getUserReserveData.abi(), &abi.getUserReserveData.encode(&[weth, owner])) {
            if let Ok(decoded) = abi.getUserReserveData.decode(&result) {
                let a_token_balance = decoded.currentATokenBalance;
                
                if a_token_balance > U256::ZERO {
                    let price = self.get_token_price(weth).unwrap_or(U256::ZERO);
                    let value = a_token_balance * price / U256::from(10).pow(U256::from(18));
                    
                    return Some(PositionView {
                        owner,
                        protocol: 0, // AAVE
                        assets: vec![weth],
                        amounts: vec![a_token_balance],
                        apr: decoded.liquidityRate,
                        apy: decoded.liquidityRate, // Simplified
                        accruedUsd: value.into(),
                        updatedAt: U256::from(self.vm().block_timestamp()),
                    });
                }
            }
        }
        
        None
    }

    /// Get Uniswap positions for a user
    fn get_uniswap_positions(&self, owner: Address) -> Option<PositionView> {
        let position_manager = self.uniswap_position_manager.get();
        
        // Uniswap PositionManager interface
        let abi = sol! {
            function balanceOf(address owner) view returns (uint256);
            function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256);
            function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1);
        };

        // Check if user has positions
        if let Ok(result) = self.vm().static_call(position_manager, abi.balanceOf.abi(), &abi.balanceOf.encode(&[owner])) {
            if let Ok(decoded) = abi.balanceOf.decode(&result) {
                if decoded > U256::ZERO {
                    // For simplicity, just return a placeholder position
                    return Some(PositionView {
                        owner,
                        protocol: 1, // UNISWAP_V3
                        assets: vec![Address::ZERO, Address::ZERO],
                        amounts: vec![U256::ZERO, U256::ZERO],
                        apr: U256::ZERO,
                        apy: U256::ZERO,
                        accruedUsd: 0,
                        updatedAt: U256::from(self.vm().block_timestamp()),
                    });
                }
            }
        }
        
        None
    }

    /// Get Curve positions for a user
    fn get_curve_positions(&self, owner: Address) -> Option<PositionView> {
        let pool = self.curve_tricrypto_pool.get();
        let gauge = self.curve_tricrypto_gauge.get();
        
        // Curve Pool interface
        let pool_abi = sol! {
            function balanceOf(address user) view returns (uint256);
            function get_virtual_price() view returns (uint256);
        };

        // Check LP balance
        if let Ok(result) = self.vm().static_call(pool, pool_abi.balanceOf.abi(), &pool_abi.balanceOf.encode(&[owner])) {
            if let Ok(decoded) = pool_abi.balanceOf.decode(&result) {
                if decoded > U256::ZERO {
                    // Get virtual price
                    if let Ok(vp_result) = self.vm().static_call(pool, pool_abi.get_virtual_price.abi(), &pool_abi.get_virtual_price.encode(&[])) {
                        if let Ok(vp_decoded) = pool_abi.get_virtual_price.decode(&vp_result) {
                            let value = decoded * vp_decoded / U256::from(10).pow(U256::from(18));
                            
                            return Some(PositionView {
                                owner,
                                protocol: 2, // CURVE
                                assets: vec![pool],
                                amounts: vec![decoded],
                                apr: U256::ZERO,
                                apy: U256::ZERO,
                                accruedUsd: value.into(),
                                updatedAt: U256::from(self.vm().block_timestamp()),
                            });
                        }
                    }
                }
            }
        }
        
        None
    }

    /// Calculate portfolio summary from positions
    fn calculate_portfolio_summary(&self, positions: Vec<PositionView>) -> PortfolioSummary {
        let mut total_value = U256::ZERO;
        let mut total_accrued = U256::ZERO;
        let mut weighted_value = U256::ZERO;
        let mut weighted_apy = U256::ZERO;
        
        for position in positions {
            let position_value = position.accruedUsd.into();
            total_value += position_value;
            total_accrued += position.accruedUsd.into();
            
            if position.apy > U256::ZERO && position_value > U256::ZERO {
                weighted_value += position_value;
                weighted_apy += position_value * position.apy;
            }
        }
        
        let final_apy = if weighted_value > U256::ZERO {
            weighted_apy / weighted_value
        } else {
            U256::ZERO
        };
        
        PortfolioSummary {
            totalValue: total_value,
            totalAccrued: total_accrued,
            weightedApy: final_apy,
            lastUpdated: U256::from(self.vm().block_timestamp()),
        }
    }
}

/// Implementation of the IOwnable interface
#[public]
impl IOwnable for YieldAggregator {
    type Error = Error;

    fn owner(&self) -> Address {
        self.ownable.owner()
    }

    fn transfer_ownership(&mut self, new_owner: Address) -> Result<(), Self::Error> {
        Ok(self.ownable.transfer_ownership(new_owner)?)
    }

    fn renounce_ownership(&mut self) -> Result<(), Self::Error> {
        Ok(self.ownable.renounce_ownership()?)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use stylus_sdk::testing::*;

    #[no_mangle]
    pub unsafe extern "C" fn emit_log(_pointer: *const u8, _len: usize, _: usize) {}
    #[no_mangle]
    pub unsafe extern "C" fn msg_sender(_sender: *mut u8) {}

    #[test]
    fn test_yield_aggregator() {
        let vm = TestVM::default();
        let mut contract = YieldAggregator::from(&vm);

        // Test initialization
        let owner_addr = Address::from([1u8; 20]);
        let _ = contract.constructor(owner_addr);

        assert_eq!(contract.owner(), owner_addr);
        assert_eq!(contract.enabled(), true);

        // Test getting positions for empty user
        let test_user = Address::from([2u8; 20]);
        let positions = contract.get_positions(test_user);
        assert_eq!(positions.len(), 0);

        // Test portfolio summary for empty user
        let summary = contract.get_portfolio_summary(test_user);
        assert_eq!(summary.totalValue, U256::ZERO);
        assert_eq!(summary.totalAccrued, U256::ZERO);
        assert_eq!(summary.weightedApy, U256::ZERO);
    }
}
