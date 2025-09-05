export type ChainId = 42161 | 421614 | 412346; // Arbitrum One / Sepolia / Local

export type Protocol = "AAVE" | "UNISWAP_V3" | "CURVE";

export type Token = {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  amount: bigint;
  usd?: number;
};

export type Position = {
  protocol: Protocol;
  chainId: ChainId;
  owner: `0x${string}`;
  assets: Token[];
  // yield fields
  apr?: number; // simple APR
  apy?: number; // compounded APY
  accrued?: number; // running $ or token-denominated yield since deposit
  updatedAt: number;
  // protocol-specific data
  metadata?: {
    poolAddress?: `0x${string}`;
    positionId?: string;
    gaugeAddress?: `0x${string}`;
    [key: string]: any;
  };
};

export type PortfolioSummary = {
  totalValue: number;
  totalAccrued: number;
  weightedApy: number;
  positions: Position[];
  lastUpdated: number;
};

export type WalletData = {
  address: `0x${string}`;
  positions: Position[];
  summary: PortfolioSummary;
};

export type MultiWalletData = {
  wallets: WalletData[];
  aggregated: PortfolioSummary;
};
