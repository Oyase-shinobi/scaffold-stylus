import { client } from "./client";
import { getTokenPrices, formatUSDValue, formatPercentage } from "./prices";
import { getAavePositions } from "./protocols/aave";
import { getUniswapPositions } from "./protocols/uniswap";
import { getCurvePositions } from "./protocols/curve";
import { Position, WalletData, PortfolioSummary, MultiWalletData } from "../types/positions";
import { getMockWalletData, TEST_WALLETS } from "./test-data";
import { LOCAL_TEST_WALLET } from "./local-test-setup";

export class YieldTracker {
  private static instance: YieldTracker;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private priceCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60 * 1000; // 1 minute
  private readonly PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100; // Limit cache size

  private constructor() {}

  static getInstance(): YieldTracker {
    if (!YieldTracker.instance) {
      YieldTracker.instance = new YieldTracker();
    }
    return YieldTracker.instance;
  }

  private getCacheKey(userAddress: string, protocols: string[]): string {
    return `${userAddress}-${protocols.sort().join("-")}`;
  }

  private isCacheValid(key: string, cacheType: "data" | "price" = "data"): boolean {
    const cache = cacheType === "price" ? this.priceCache : this.cache;
    const duration = cacheType === "price" ? this.PRICE_CACHE_DURATION : this.CACHE_DURATION;
    const cached = cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < duration;
  }

  private setCache(key: string, data: any, cacheType: "data" | "price" = "data"): void {
    const cache = cacheType === "price" ? this.priceCache : this.cache;

    // Limit cache size
    if (cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }

    cache.set(key, { data, timestamp: Date.now() });
  }

  private getCachedData(key: string, cacheType: "data" | "price" = "data"): any | null {
    const cache = cacheType === "price" ? this.priceCache : this.cache;
    const cached = cache.get(key);
    return cached ? cached.data : null;
  }

  async getWalletData(userAddress: `0x${string}`): Promise<WalletData> {
    const cacheKey = this.getCacheKey(userAddress, ["all"]);
    if (this.isCacheValid(cacheKey)) {
      console.log("Using cached data for:", userAddress);
      return this.getCachedData(cacheKey)!;
    }

    try {
      console.log("Fetching wallet data for:", userAddress);

      // Check if we're on local network and this is the local test wallet
      const isLocalNetwork = await this.isLocalNetwork();
      const isLocalTestWallet = userAddress.toLowerCase() === LOCAL_TEST_WALLET.toLowerCase();

      if (isLocalNetwork && isLocalTestWallet) {
        console.log("Using local mock data for test wallet");
        const localMockData = this.getLocalMockData(userAddress);
        this.setCache(cacheKey, localMockData);
        return localMockData;
      }

      const supportedTokens = [
        "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
        "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
        "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USDT
        "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // WBTC
      ] as `0x${string}`[];

      // Check price cache first
      const priceCacheKey = `prices-${supportedTokens.sort().join("-")}`;
      let prices: Record<string, any>;

      if (this.isCacheValid(priceCacheKey, "price")) {
        console.log("Using cached prices");
        prices = this.getCachedData(priceCacheKey, "price")!;
      } else {
        console.log("Fetching token prices...");
        prices = await getTokenPrices(supportedTokens);
        this.setCache(priceCacheKey, prices, "price");
        console.log("Token prices fetched and cached:", Object.keys(prices));
      }

      console.log("Fetching protocol positions in parallel...");

      // Fetch all protocol positions in parallel for better performance
      const [aavePositions, uniswapPositions, curvePositions] = await Promise.allSettled([
        getAavePositions(userAddress, prices).catch(error => {
          console.error("Error fetching Aave positions:", error);
          return [];
        }),
        getUniswapPositions(userAddress, prices).catch(error => {
          console.error("Error fetching Uniswap positions:", error);
          return [];
        }),
        getCurvePositions(userAddress, prices).catch(error => {
          console.error("Error fetching Curve positions:", error);
          return [];
        }),
      ]);

      const allPositions = [
        ...(aavePositions.status === "fulfilled" ? aavePositions.value : []),
        ...(uniswapPositions.status === "fulfilled" ? uniswapPositions.value : []),
        ...(curvePositions.status === "fulfilled" ? curvePositions.value : []),
      ];

      console.log("Total positions:", allPositions.length);

      if (allPositions.length === 0 && TEST_WALLETS.includes(userAddress)) {
        console.log("Using mock data for test wallet:", userAddress);
        const mockData = getMockWalletData(userAddress);
        this.setCache(cacheKey, mockData);
        return mockData;
      }

      const summary = this.calculatePortfolioSummary(allPositions);
      const walletData = { address: userAddress, positions: allPositions, summary };
      this.setCache(cacheKey, walletData);
      return walletData;
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      if (TEST_WALLETS.includes(userAddress)) {
        console.log("Returning mock data due to error for test wallet:", userAddress);
        return getMockWalletData(userAddress);
      }
      return {
        address: userAddress,
        positions: [],
        summary: { totalValue: 0, totalAccrued: 0, weightedApy: 0, positions: [], lastUpdated: Date.now() },
      };
    }
  }

  private async isLocalNetwork(): Promise<boolean> {
    try {
      const chainId = await client.getChainId();
      return chainId === 412346; // Local Arbitrum chain ID
    } catch (error) {
      console.error("Error checking network:", error);
      return false;
    }
  }

  private getLocalMockData(userAddress: `0x${string}`): WalletData {
    console.log("Creating local mock data for:", userAddress);

    const now = Date.now();
    const positions: Position[] = [
      {
        protocol: "AAVE",
        chainId: 412346,
        owner: userAddress,
        assets: [
          {
            address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
            symbol: "WETH",
            decimals: 18,
            amount: BigInt("1500000000000000000"), // 1.5 WETH
            usd: 3750, // 1.5 * $2500
          },
        ],
        apr: 0.045,
        apy: 0.046,
        accrued: 45.5,
        updatedAt: now,
        metadata: {
          poolAddress: "0x794a61358D6845594F94dc1DB02A252b5b4814aD" as `0x${string}`,
          positionType: "supply",
          reserveData: {
            liquidityRate: "45000000000000000000000000",
            variableBorrowRate: "32000000000000000000000000",
          },
        },
      },
      {
        protocol: "AAVE",
        chainId: 412346,
        owner: userAddress,
        assets: [
          {
            address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
            symbol: "USDC",
            decimals: 6,
            amount: BigInt("1000000000"), // 1000 USDC
            usd: 1000,
          },
        ],
        apr: 0.032,
        apy: 0.033,
        accrued: -12.5, // Negative for borrow
        updatedAt: now,
        metadata: {
          poolAddress: "0x794a61358D6845594F94dc1DB02A252b5b4814aD" as `0x${string}`,
          positionType: "borrow",
          reserveData: {
            liquidityRate: "45000000000000000000000000",
            variableBorrowRate: "32000000000000000000000000",
          },
        },
      },
      {
        protocol: "UNISWAP_V3",
        chainId: 412346,
        owner: userAddress,
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
        accrued: 75.25,
        updatedAt: now,
        metadata: {
          tokenId: "12345",
          token0: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
          token1: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
          fee: 3000,
          tickLower: -887220,
          tickUpper: 887220,
          liquidity: "1000000000000000000",
          positionType: "lp",
        },
      },
      {
        protocol: "CURVE",
        chainId: 412346,
        owner: userAddress,
        assets: [
          {
            address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f" as `0x${string}`,
            symbol: "WBTC",
            decimals: 8,
            amount: BigInt("10000000"), // 0.1 WBTC
            usd: 4500,
          },
        ],
        apr: 0.08,
        apy: 0.083,
        accrued: 17.25,
        updatedAt: now,
        metadata: {
          poolAddress: "0x7f90122BF0700F9E7e1F688fe926940E8839F353" as `0x${string}`,
          positionType: "lp",
          virtualPrice: "1000000000000000000",
        },
      },
    ];

    const summary = this.calculatePortfolioSummary(positions);
    return {
      address: userAddress,
      positions,
      summary,
    };
  }

  async getMultiWalletData(walletAddresses: `0x${string}`[]): Promise<MultiWalletData> {
    const cacheKey = this.getCacheKey(`multi-${walletAddresses.sort().join("-")}`, ["all"]);

    if (this.isCacheValid(cacheKey)) {
      console.log("Using cached multi-wallet data");
      return this.getCachedData(cacheKey)!;
    }

    try {
      console.log("Fetching multi-wallet data for:", walletAddresses.length, "wallets");

      // Use Promise.allSettled for better error handling
      const walletDataPromises = walletAddresses.map(address =>
        this.getWalletData(address).catch(error => {
          console.error(`Failed to fetch data for wallet ${address}:`, error);
          // Return empty wallet data for failed requests
          return {
            address,
            positions: [],
            summary: {
              totalValue: 0,
              totalAccrued: 0,
              weightedApy: 0,
              positionCount: 0,
              positions: [],
              lastUpdated: Date.now(),
            },
          } as WalletData;
        }),
      );

      const wallets = await Promise.all(walletDataPromises);

      // Aggregate all positions
      const allPositions = wallets.flatMap(wallet => wallet.positions);
      const aggregated = this.calculatePortfolioSummary(allPositions);

      const multiWalletData: MultiWalletData = {
        wallets,
        aggregated,
      };

      this.setCache(cacheKey, multiWalletData);
      console.log("Multi-wallet data cached");
      return multiWalletData;
    } catch (error) {
      console.error("Error fetching multi-wallet data:", error);
      return {
        wallets: [],
        aggregated: {
          totalValue: 0,
          totalAccrued: 0,
          weightedApy: 0,
          positions: [],
          lastUpdated: Date.now(),
        },
      };
    }
  }

  private calculatePortfolioSummary(positions: Position[]): PortfolioSummary {
    let totalValue = 0;
    let totalAccrued = 0;
    let weightedValue = 0;
    let weightedApy = 0;

    for (const position of positions) {
      const positionValue = position.assets.reduce((sum, asset) => sum + (asset.usd || 0), 0);
      totalValue += positionValue;
      totalAccrued += position.accrued || 0;

      if (position.apy && positionValue > 0) {
        weightedValue += positionValue;
        weightedApy += positionValue * position.apy;
      }
    }

    return {
      totalValue,
      totalAccrued,
      weightedApy: weightedValue > 0 ? weightedApy / weightedValue : 0,
      positions,
      lastUpdated: Date.now(),
    };
  }

  async getProtocolBreakdown(userAddress: `0x${string}`): Promise<{
    aave: { positions: Position[]; summary: any };
    uniswap: { positions: Position[]; summary: any };
    curve: { positions: Position[]; summary: any };
  }> {
    const cacheKey = this.getCacheKey(userAddress, ["breakdown"]);

    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }

    try {
      const supportedTokens = [
        "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
        "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
        "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USDT
        "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // WBTC
      ] as `0x${string}`[];

      const prices = await getTokenPrices(supportedTokens);

      const [aavePositions, uniswapPositions, curvePositions] = await Promise.all([
        getAavePositions(userAddress, prices),
        getUniswapPositions(userAddress, prices),
        getCurvePositions(userAddress, prices),
      ]);

      const [aaveSummary, uniswapSummary, curveSummary] = await Promise.all([
        // getAaveUserSummary(userAddress, prices), // Mocked
        // getUniswapUserSummary(userAddress, prices), // Mocked
        // getCurveUserSummary(userAddress, prices), // Mocked
        { totalValue: 0, totalAccrued: 0, weightedApy: 0, positions: [], lastUpdated: Date.now() },
        { totalValue: 0, totalAccrued: 0, weightedApy: 0, positions: [], lastUpdated: Date.now() },
        { totalValue: 0, totalAccrued: 0, weightedApy: 0, positions: [], lastUpdated: Date.now() },
      ]);

      const breakdown = {
        aave: { positions: aavePositions, summary: aaveSummary },
        uniswap: { positions: uniswapPositions, summary: uniswapSummary },
        curve: { positions: curvePositions, summary: curveSummary },
      };

      this.setCache(cacheKey, breakdown);
      return breakdown;
    } catch (error) {
      console.error("Error fetching protocol breakdown:", error);
      return {
        aave: { positions: [], summary: {} },
        uniswap: { positions: [], summary: {} },
        curve: { positions: [], summary: {} },
      };
    }
  }

  // Utility methods for formatting
  formatPortfolioValue(value: number): string {
    return formatUSDValue(value);
  }

  formatApy(apy: number): string {
    return formatPercentage(apy);
  }

  formatAccrued(accrued: number): string {
    return formatUSDValue(accrued);
  }

  // Clear cache (useful for testing or manual refresh)
  clearCache(): void {
    this.cache.clear();
    this.priceCache.clear();
    console.log("Cache cleared");
  }

  getCacheStats(): { dataCacheSize: number; priceCacheSize: number } {
    return {
      dataCacheSize: this.cache.size,
      priceCacheSize: this.priceCache.size,
    };
  }
}

// Export singleton instance
export const yieldTracker = YieldTracker.getInstance();
