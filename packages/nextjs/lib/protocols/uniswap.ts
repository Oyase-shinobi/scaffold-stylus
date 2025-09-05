import { parseAbi } from "viem";
import { client } from "../client";
import { CHAIN_ID } from "../../config/protocols";
import { UNISWAP_CONFIG, TOKENS } from "../../config/protocols";
import { Position } from "../../types/positions";
import { getTokenUSDValue } from "../prices";

// Uniswap v3 NonfungiblePositionManager ABI
const POSITION_MANAGER_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)",
  "function collect(uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max) returns (uint256 amount0, uint256 amount1)",
]);

// Uniswap v3 Pool ABI (for future use)
// const POOL_ABI = parseAbi([
//   "function token0() view returns (address)",
//   "function token1() view returns (address)",
//   "function fee() view returns (uint24)",
//   "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
//   "function liquidity() view returns (uint128)",
//   "function feeGrowthGlobal0X128() view returns (uint256)",
//   "function feeGrowthGlobal1X128() view returns (uint256)",
// ]);

// Uniswap v3 Quoter V2 ABI (for future use)
// const QUOTER_ABI = parseAbi([
//   "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) view returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
// ]);

export async function getUniswapPositions(
  userAddress: `0x${string}`,
  prices: Record<string, any>,
): Promise<Position[]> {
  const positions: Position[] = [];

  try {
    const balance = await client.readContract({
      address: UNISWAP_CONFIG.NONFUNGIBLE_POSITION_MANAGER,
      abi: POSITION_MANAGER_ABI,
      functionName: "balanceOf",
      args: [userAddress],
    });

    if (balance === 0n) {
      return positions;
    }

    const positionIds: bigint[] = [];
    for (let i = 0; i < Number(balance); i++) {
      try {
        const tokenId = await client.readContract({
          address: UNISWAP_CONFIG.NONFUNGIBLE_POSITION_MANAGER,
          abi: POSITION_MANAGER_ABI,
          functionName: "tokenOfOwnerByIndex",
          args: [userAddress, BigInt(i)],
        });
        positionIds.push(tokenId);
      } catch (error) {
        console.warn(`Error fetching position ID ${i}:`, error);
      }
    }

    const positionPromises = positionIds.map(async tokenId => {
      try {
        const positionData = await client.readContract({
          address: UNISWAP_CONFIG.NONFUNGIBLE_POSITION_MANAGER,
          abi: POSITION_MANAGER_ABI,
          functionName: "positions",
          args: [tokenId],
        });

        return { tokenId, positionData };
      } catch (error) {
        console.warn(`Error fetching position ${tokenId}:`, error);
        return null;
      }
    });

    const positionResults = await Promise.all(positionPromises);

    for (const result of positionResults) {
      if (!result) continue;

      const { tokenId, positionData } = result;
      const liquidity = positionData[7] as bigint;
      const tokensOwed0 = positionData[10] as bigint;
      const tokensOwed1 = positionData[11] as bigint;

      if (liquidity === 0n) continue;

      const token0 = positionData[2] as `0x${string}`;
      const token1 = positionData[3] as `0x${string}`;
      const fee = positionData[4] as number;
      const token0Info = TOKENS[token0];
      const token1Info = TOKENS[token1];

      if (!token0Info || !token1Info) continue;

      const fees0USD = getTokenUSDValue(tokensOwed0, token0, prices);
      const fees1USD = getTokenUSDValue(tokensOwed1, token1, prices);
      const totalFeesUSD = fees0USD + fees1USD;
      const estimatedPositionValue = totalFeesUSD * 100; // Rough estimate
      const dailyFeeRate = totalFeesUSD / estimatedPositionValue;
      const apr = dailyFeeRate * 365;
      const apy = Math.pow(1 + dailyFeeRate, 365) - 1;

      const position: Position = {
        protocol: "UNISWAP_V3",
        chainId: CHAIN_ID,
        owner: userAddress,
        assets: [
          {
            address: token0,
            symbol: token0Info.symbol,
            decimals: token0Info.decimals,
            amount: tokensOwed0,
            usd: fees0USD,
          },
          {
            address: token1,
            symbol: token1Info.symbol,
            decimals: token1Info.decimals,
            amount: tokensOwed1,
            usd: fees1USD,
          },
        ],
        apr,
        apy,
        accrued: totalFeesUSD,
        updatedAt: Date.now(),
        metadata: {
          positionId: tokenId.toString(),
          poolAddress: UNISWAP_CONFIG.NONFUNGIBLE_POSITION_MANAGER,
          fee: fee,
          liquidity: liquidity.toString(),
          token0,
          token1,
        },
      };

      positions.push(position);
    }

    return positions;
  } catch (error) {
    console.error("Error fetching Uniswap positions:", error);
    return [];
  }
}

export async function getUniswapUserSummary(
  userAddress: `0x${string}`,
  prices: Record<string, any>,
): Promise<{
  totalPositions: number;
  totalFees: number;
  weightedApy: number;
}> {
  const positions = await getUniswapPositions(userAddress, prices);

  let totalFees = 0;
  let totalValue = 0;
  let weightedApy = 0;

  for (const position of positions) {
    const positionValue = position.assets.reduce((sum, asset) => sum + (asset.usd || 0), 0);
    totalFees += position.accrued || 0;
    totalValue += positionValue;

    if (position.apy) {
      weightedApy += positionValue * position.apy;
    }
  }

  return {
    totalPositions: positions.length,
    totalFees,
    weightedApy: totalValue > 0 ? weightedApy / totalValue : 0,
  };
}
