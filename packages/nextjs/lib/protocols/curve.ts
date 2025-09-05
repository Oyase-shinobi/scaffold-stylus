import { parseAbi } from "viem";
import { client } from "../client";
import { CHAIN_ID } from "../../config/protocols";
import { CURVE_CONFIG } from "../../config/protocols";
import { Position } from "../../types/positions";
import { getTokenUSDValue } from "../prices";

// Curve Gauge ABI
const GAUGE_ABI = parseAbi([
  "function balanceOf(address user) view returns (uint256)",
  "function working_supply() view returns (uint256)",
  "function working_balance(address user) view returns (uint256)",
  "function inflation_rate() view returns (uint256)",
  "function gauge_relative_weight(uint256 time) view returns (uint256)",
  "function claimable_tokens(address user) view returns (uint256)",
  "function claimable_reward(address user, address reward_token) view returns (uint256)",
]);

// Curve Pool ABI
const POOL_ABI = parseAbi([
  "function balanceOf(address user) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function get_virtual_price() view returns (uint256)",
  "function coins(uint256 i) view returns (address)",
  "function coin_count() view returns (uint256)",
]);

// Curve Registry ABI (for future use)
// const REGISTRY_ABI = parseAbi([
//   "function get_gauge(address pool) view returns (address)",
//   "function get_lp_token(address pool) view returns (address)",
// ]);

export async function getCurvePositions(userAddress: `0x${string}`, prices: Record<string, any>): Promise<Position[]> {
  const positions: Position[] = [];

  try {
    const poolAddress = CURVE_CONFIG.TRICRYPTO;
    const gaugeAddress = CURVE_CONFIG.TRICRYPTO_GAUGE;
    const poolCode = await client.getBytecode({ address: poolAddress });
    const gaugeCode = await client.getBytecode({ address: gaugeAddress });

    if (!poolCode || !gaugeCode) {
      console.warn(`Curve contracts not found: pool=${poolAddress}, gauge=${gaugeAddress}`);
      return positions;
    }

    let lpBalance = 0n;
    try {
      lpBalance = await client.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: "balanceOf",
        args: [userAddress],
      });
    } catch (error) {
      console.warn(`Error getting LP balance for ${poolAddress}:`, error);
      return positions;
    }

    let gaugeBalance = 0n;
    try {
      gaugeBalance = await client.readContract({
        address: gaugeAddress,
        abi: GAUGE_ABI,
        functionName: "balanceOf",
        args: [userAddress],
      });
    } catch (error) {
      console.warn(`Error getting gauge balance for ${gaugeAddress}:`, error);
    }

    let workingBalance = 0n;
    try {
      workingBalance = await client.readContract({
        address: gaugeAddress,
        abi: GAUGE_ABI,
        functionName: "working_balance",
        args: [userAddress],
      });
    } catch (error) {
      console.warn(`Error getting working balance for ${gaugeAddress}:`, error);
    }

    let inflationRate = 0n;
    let relativeWeight = 0n;
    try {
      [inflationRate, relativeWeight] = await Promise.all([
        client.readContract({
          address: gaugeAddress,
          abi: GAUGE_ABI,
          functionName: "inflation_rate",
          args: [],
        }),
        client.readContract({
          address: gaugeAddress,
          abi: GAUGE_ABI,
          functionName: "gauge_relative_weight",
          args: [BigInt(Math.floor(Date.now() / 1000))],
        }),
      ]);
    } catch (error) {
      console.warn(`Error getting inflation/weight for ${gaugeAddress}:`, error);
    }

    let claimableTokens = 0n;
    try {
      claimableTokens = await client.readContract({
        address: gaugeAddress,
        abi: GAUGE_ABI,
        functionName: "claimable_tokens",
        args: [userAddress],
      });
    } catch (error) {
      console.warn(`Error getting claimable tokens for ${gaugeAddress}:`, error);
    }

    let virtualPrice = 1n * 10n ** 18n; // Default to 1:1
    try {
      virtualPrice = await client.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: "get_virtual_price",
        args: [],
      });
    } catch (error) {
      console.warn(`Error getting virtual price for ${poolAddress}:`, error);
    }

    if (lpBalance > 0n) {
      const lpValue = (Number(lpBalance) * Number(virtualPrice)) / 1e18;
      const usdValue = lpValue;

      const position: Position = {
        protocol: "CURVE",
        chainId: CHAIN_ID,
        owner: userAddress,
        assets: [
          {
            address: poolAddress,
            symbol: "3CRV",
            decimals: 18,
            amount: lpBalance,
            usd: usdValue,
          },
        ],
        apr: 0,
        apy: 0,
        accrued: 0,
        updatedAt: Date.now(),
        metadata: {
          poolAddress,
          positionType: "lp",
          virtualPrice: virtualPrice.toString(),
        },
      };

      positions.push(position);
    }

    if (gaugeBalance > 0n) {
      let workingSupply = 0n;
      try {
        workingSupply = await client.readContract({
          address: gaugeAddress,
          abi: GAUGE_ABI,
          functionName: "working_supply",
          args: [],
        });
      } catch (error) {
        console.warn(`Error getting working supply for ${gaugeAddress}:`, error);
        return positions;
      }

      const userShare = workingSupply > 0n ? Number(workingBalance) / Number(workingSupply) : 0;
      const gaugeShare = Number(relativeWeight) / 1e18;

      const dailyEmissions = Number(inflationRate) / 1e18 / 365;
      const userDailyRewards = dailyEmissions * gaugeShare * userShare;
      const apr = userDailyRewards * 365;
      const apy = Math.pow(1 + userDailyRewards, 365) - 1;

      const claimableUSD = getTokenUSDValue(claimableTokens, CURVE_CONFIG.TRICRYPTO, prices);

      const gaugePosition: Position = {
        protocol: "CURVE",
        chainId: CHAIN_ID,
        owner: userAddress,
        assets: [
          {
            address: gaugeAddress,
            symbol: "3CRV-Gauge",
            decimals: 18,
            amount: gaugeBalance,
            usd: 0,
          },
        ],
        apr,
        apy,
        accrued: claimableUSD,
        updatedAt: Date.now(),
        metadata: {
          gaugeAddress,
          positionType: "gauge",
          workingBalance: workingBalance.toString(),
          workingSupply: workingSupply.toString(),
          inflationRate: inflationRate.toString(),
          relativeWeight: relativeWeight.toString(),
        },
      };

      positions.push(gaugePosition);
    }

    return positions;
  } catch (error) {
    console.error("Error fetching Curve positions:", error);
    return [];
  }
}

export async function getCurveUserSummary(
  userAddress: `0x${string}`,
  prices: Record<string, any>,
): Promise<{
  totalLpValue: number;
  totalStaked: number;
  totalRewards: number;
  weightedApy: number;
}> {
  const positions = await getCurvePositions(userAddress, prices);

  let totalLpValue = 0;
  let totalStaked = 0;
  let totalRewards = 0;
  let weightedValue = 0;
  let weightedApy = 0;

  for (const position of positions) {
    const positionValue = position.assets.reduce((sum, asset) => sum + (asset.usd || 0), 0);
    totalRewards += position.accrued || 0;

    if (position.metadata?.positionType === "lp") {
      totalLpValue += positionValue;
    } else if (position.metadata?.positionType === "gauge") {
      totalStaked += positionValue;
    }

    weightedValue += positionValue;
    if (position.apy) {
      weightedApy += positionValue * position.apy;
    }
  }

  return {
    totalLpValue,
    totalStaked,
    totalRewards,
    weightedApy: weightedValue > 0 ? weightedApy / weightedValue : 0,
  };
}
