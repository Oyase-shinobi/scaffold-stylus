import { parseAbi, getAddress } from "viem";
import { client } from "./client";
import { PRICE_FEEDS, TOKENS } from "../config/protocols";

// Chainlink Aggregator ABI
const AGGREGATOR_ABI = parseAbi([
  "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() external view returns (uint8)",
]);

export type PriceData = {
  price: number;
  decimals: number;
  updatedAt: number;
};

export type TokenPrices = Record<string, PriceData>;

// Cache for price data
let priceCache: TokenPrices = {};
let lastCacheUpdate = 0;
const CACHE_DURATION = 30 * 1000; // 30 seconds

export async function getTokenPrice(tokenAddress: `0x${string}`): Promise<PriceData | null> {
  // Map token addresses to price feed addresses
  const tokenToFeedMap: Record<string, `0x${string}`> = {
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1": PRICE_FEEDS.WETH, // WETH
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831": PRICE_FEEDS.USDC, // USDC
    // "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9": PRICE_FEEDS.USDT, // USDT - skipping for now
    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f": PRICE_FEEDS.WBTC, // WBTC
  };

  const feedAddress = tokenToFeedMap[tokenAddress];

  if (!feedAddress) {
    console.warn(`No price feed found for token: ${tokenAddress}`);
    return null;
  }

  try {
    // Ensure proper checksum address
    const checksumAddress = getAddress(feedAddress);

    const [roundData, decimals] = await Promise.all([
      client.readContract({
        address: checksumAddress,
        abi: AGGREGATOR_ABI,
        functionName: "latestRoundData",
      }),
      client.readContract({
        address: checksumAddress,
        abi: AGGREGATOR_ABI,
        functionName: "decimals",
      }),
    ]);

    // roundData is a tuple: [roundId, answer, startedAt, updatedAt, answeredInRound]
    const price = Number(roundData[1]) / Math.pow(10, decimals);
    const updatedAt = Number(roundData[3]) * 1000; // Convert to milliseconds

    return {
      price,
      decimals,
      updatedAt,
    };
  } catch (error) {
    console.error(`Error fetching price for ${tokenAddress}:`, error);
    return null;
  }
}

export async function getTokenPrices(tokenAddresses: `0x${string}`[]): Promise<TokenPrices> {
  const now = Date.now();

  // Return cached data if still valid
  if (now - lastCacheUpdate < CACHE_DURATION && Object.keys(priceCache).length > 0) {
    return priceCache;
  }

  // Map token addresses to price feed addresses
  const tokenToFeedMap: Record<string, `0x${string}`> = {
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1": PRICE_FEEDS.WETH, // WETH
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831": PRICE_FEEDS.USDC, // USDC
    // "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9": PRICE_FEEDS.USDT, // USDT - skipping for now
    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f": PRICE_FEEDS.WBTC, // WBTC
  };

  // Filter out tokens without price feeds
  const validTokens = tokenAddresses.filter(addr => tokenToFeedMap[addr]);

  if (validTokens.length === 0) {
    console.warn("No valid tokens found for price fetching, using fallback prices");
    // Return fallback prices
    return {
      "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1": { price: 2500, decimals: 8, updatedAt: now }, // WETH
      "0xaf88d065e77c8cC2239327C5EDb3A432268e5831": { price: 1, decimals: 8, updatedAt: now }, // USDC
      "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f": { price: 45000, decimals: 8, updatedAt: now }, // WBTC
    };
  }

  try {
    // Batch fetch all prices
    const pricePromises = validTokens.map(async tokenAddress => {
      const price = await getTokenPrice(tokenAddress);
      return { tokenAddress, price };
    });

    const results = await Promise.all(pricePromises);

    // Build price cache
    const newCache: TokenPrices = {};
    results.forEach(({ tokenAddress, price }) => {
      if (price) {
        newCache[tokenAddress] = price;
      }
    });

    priceCache = newCache;
    lastCacheUpdate = now;

    return newCache;
  } catch (error) {
    console.error("Error fetching token prices:", error);
    console.warn("Using fallback prices due to error");
    // Return fallback prices on error
    return {
      "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1": { price: 2500, decimals: 8, updatedAt: now }, // WETH
      "0xaf88d065e77c8cC2239327C5EDb3A432268e5831": { price: 1, decimals: 8, updatedAt: now }, // USDC
      "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f": { price: 45000, decimals: 8, updatedAt: now }, // WBTC
    };
  }
}

export function getTokenUSDValue(amount: bigint, tokenAddress: `0x${string}`, prices: TokenPrices): number {
  const price = prices[tokenAddress];
  if (!price) return 0;

  const token = TOKENS[tokenAddress];
  if (!token) return 0;

  const tokenAmount = Number(amount) / Math.pow(10, token.decimals);
  return tokenAmount * price.price;
}

export function formatUSDValue(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  } else {
    return `$${value.toFixed(2)}`;
  }
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}
