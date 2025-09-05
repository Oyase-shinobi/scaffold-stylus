import { Position } from "../types/positions";

// Test wallets with known DeFi positions on Arbitrum
export const TEST_WALLETS = [
  // Wallet with Aave positions
  "0x2FAF487A441AFeD3D3342d8730Bd51114a491327" as `0x${string}`,

  // Wallet with Uniswap positions
  "0x4d7C363DED4B3b4e1F954494d2Bc3955e49699cC" as `0x${string}`,

  // Wallet with Curve positions
  "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D" as `0x${string}`,

  // Large DeFi wallet (likely has multiple positions)
  "0x28C6c06298d514Db089934071355E5743bf21d60" as `0x${string}`,

  // Another large wallet
  "0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549" as `0x${string}`,
] as const;

// Mock positions for testing when RPC calls fail
export const MOCK_POSITIONS: Position[] = [
  {
    protocol: "AAVE",
    chainId: 42161,
    owner: "0x2FAF487A441AFeD3D3342d8730Bd51114a491327" as `0x${string}`,
    assets: [
      {
        address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
        symbol: "WETH",
        decimals: 18,
        amount: BigInt("1000000000000000000"), // 1 WETH
        usd: 2500,
      },
    ],
    apr: 0.045,
    apy: 0.046,
    accrued: 3.15,
    updatedAt: Date.now(),
    metadata: {
      poolAddress: "0x794a61358D6845594F94dc1DB02A252b5b4814aD" as `0x${string}`,
      positionType: "supply",
    },
  },
  {
    protocol: "UNISWAP_V3",
    chainId: 42161,
    owner: "0x4d7C363DED4B3b4e1F954494d2Bc3955e49699cC" as `0x${string}`,
    assets: [
      {
        address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
        symbol: "WETH",
        decimals: 18,
        amount: BigInt("500000000000000000"), // 0.5 WETH
        usd: 1250,
      },
      {
        address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
        symbol: "USDC",
        decimals: 6,
        amount: BigInt("1250000000"), // 1250 USDC
        usd: 1250,
      },
    ],
    apr: 0.12,
    apy: 0.127,
    accrued: 8.22,
    updatedAt: Date.now(),
    metadata: {
      positionId: "12345",
      poolAddress: "0xC31E54c7a869B9FcBEcc14363CF510d1c41fa443" as `0x${string}`,
      fee: 3000,
      liquidity: "1000000000000000000",
      token0: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
      token1: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
    },
  },
  {
    protocol: "CURVE",
    chainId: 42161,
    owner: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D" as `0x${string}`,
    assets: [
      {
        address: "0x7f90122BF0700F9E7e1F688fe926940E8839F353" as `0x${string}`,
        symbol: "3CRV",
        decimals: 18,
        amount: BigInt("5000000000000000000"), // 5 LP tokens
        usd: 5000,
      },
    ],
    apr: 0.08,
    apy: 0.083,
    accrued: 11.42,
    updatedAt: Date.now(),
    metadata: {
      poolAddress: "0x7f90122BF0700F9E7e1F688fe926940E8839F353" as `0x${string}`,
      positionType: "lp",
      virtualPrice: "1000000000000000000",
    },
  },
];

// Function to get mock data for testing
export function getMockWalletData(address: `0x${string}`) {
  const positions = MOCK_POSITIONS.filter(p => p.owner === address);

  const totalValue = positions.reduce((sum, pos) => sum + pos.assets.reduce((s, asset) => s + (asset.usd || 0), 0), 0);

  const totalAccrued = positions.reduce((sum, pos) => sum + (pos.accrued || 0), 0);

  const weightedApy =
    positions.reduce((sum, pos) => {
      const posValue = pos.assets.reduce((s, asset) => s + (asset.usd || 0), 0);
      return sum + posValue * (pos.apy || 0);
    }, 0) / (totalValue || 1);

  return {
    address,
    positions,
    summary: {
      totalValue,
      totalAccrued,
      weightedApy,
      positions,
      lastUpdated: Date.now(),
    },
  };
}
