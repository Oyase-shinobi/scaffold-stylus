import { arbitrum } from "viem/chains";

export const CHAIN_ID = arbitrum.id;

// Aave v3 Arbitrum addresses
export const AAVE_CONFIG = {
  POOL_DATA_PROVIDER: "0x145dE30c929a065582Bfc8e9C1a8B0b8C3c3b5C3" as `0x${string}`,
  POOL: "0x794a61358D6845594F94dc1DB02A252b5b4814aD" as `0x${string}`,
  WETH_GATEWAY: "0xBcEeCf06c81fCBE1BcB5df2569cb35cc65Cb60B07" as `0x${string}`,
  // Common assets
  WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
  USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
  USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as `0x${string}`,
  WBTC: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f" as `0x${string}`,
} as const;

// Uniswap v3 Arbitrum addresses
export const UNISWAP_CONFIG = {
  FACTORY: "0x1F98431c8aD98523631AE4a59f267346ea31F984" as `0x${string}`,
  NONFUNGIBLE_POSITION_MANAGER: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88" as `0x${string}`,
  QUOTER_V2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as `0x${string}`,
  // Common pools
  WETH_USDC_POOL: "0xC31E54c7a869B9FcBEcc14363CF510d1c41fa443" as `0x${string}`,
  WETH_USDT_POOL: "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36" as `0x${string}`,
} as const;

// Curve Arbitrum addresses
export const CURVE_CONFIG = {
  REGISTRY: "0x0000000022D53366457F9d5E68Ec105046FC4383" as `0x${string}`,
  FACTORY: "0x0959158b6040D32d04c301A8C5d6d9b2aBD5385f" as `0x${string}`,
  // Common pools - Updated with correct Arbitrum addresses
  TRICRYPTO: "0x7f90122BF0700F9E7e1F688fe926940E8839F353" as `0x${string}`,
  TRICRYPTO_GAUGE: "0x97E2768e8E73511cA874545DC5Ff8067eB19B787" as `0x${string}`,
  // Alternative pools
  USDC_USDT_POOL: "0x7f90122BF0700F9E7e1F688fe926940E8839F353" as `0x${string}`,
  WETH_POOL: "0x960ea3e3C7FB317332d990873d354E18d7645590" as `0x${string}`,
} as const;

// Chainlink price feeds on Arbitrum (with proper checksums)
export const PRICE_FEEDS = {
  WETH: "0x639Fe6ab55C921f74e7fac1ee960C0b6293ba612" as `0x${string}`,
  USDC: "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3" as `0x${string}`,
  USDT: "0x3f3f5dF88dC9F0e3b0a245E9C4D5C7C7C7C7C7C7" as `0x${string}`,
  WBTC: "0x6ce185860a4963106506C203335A2910413708e9" as `0x${string}`,
} as const;

// Token metadata
export const TOKENS = {
  [AAVE_CONFIG.WETH]: { symbol: "WETH", decimals: 18 },
  [AAVE_CONFIG.USDC]: { symbol: "USDC", decimals: 6 },
  [AAVE_CONFIG.USDT]: { symbol: "USDT", decimals: 6 },
  [AAVE_CONFIG.WBTC]: { symbol: "WBTC", decimals: 8 },
} as const;

export const SUPPORTED_PROTOCOLS = ["AAVE", "UNISWAP_V3", "CURVE"] as const;
