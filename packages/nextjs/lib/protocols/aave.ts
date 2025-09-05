import { parseAbi, formatUnits } from "viem";
import { client, formatRay, calculateApy } from "../client";
import { AAVE_CONFIG, TOKENS, CHAIN_ID } from "../../config/protocols";
import { Position, Token } from "../../types/positions";
import { getTokenUSDValue } from "../prices";

// Aave v3 PoolDataProvider ABI
const POOL_DATA_PROVIDER_ABI = parseAbi([
  "function getUserReserveData(address asset, address user) view returns (uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled)",
  "function getReserveData(address asset) view returns (uint256 unbacked,uint256 accruedToTreasury,uint256 totalAToken,uint256 totalStableDebt,uint256 totalVariableDebt,uint256 liquidityRate,uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate,uint256 liquidityIndex,uint256 variableBorrowIndex,uint40 lastUpdateTimestamp)",
  "function getReserveTokensAddresses(address asset) view returns (address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress)",
]);

// Aave v3 Pool ABI
const POOL_ABI = parseAbi([
  "function getReserveData(address asset) view returns (uint256 unbacked,uint256 accruedToTreasury,uint256 totalAToken,uint256 totalStableDebt,uint256 totalVariableDebt,uint256 liquidityRate,uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate,uint256 liquidityIndex,uint256 variableBorrowIndex,uint40 lastUpdateTimestamp)",
]);

export async function getAavePositions(userAddress: `0x${string}`, prices: Record<string, any>): Promise<Position[]> {
  const positions: Position[] = [];
  const supportedAssets = [AAVE_CONFIG.WETH, AAVE_CONFIG.USDC, AAVE_CONFIG.USDT, AAVE_CONFIG.WBTC];

  try {
    const providerCode = await client.getBytecode({ address: AAVE_CONFIG.POOL_DATA_PROVIDER });
    if (!providerCode) {
      return positions;
    }

    const userDataPromises = supportedAssets.map(async asset => {
      try {
        const userData = await client.readContract({
          address: AAVE_CONFIG.POOL_DATA_PROVIDER,
          abi: POOL_DATA_PROVIDER_ABI,
          functionName: "getUserReserveData",
          args: [asset, userAddress],
        });

        const reserveData = await client.readContract({
          address: AAVE_CONFIG.POOL_DATA_PROVIDER,
          abi: POOL_DATA_PROVIDER_ABI,
          functionName: "getReserveData",
          args: [asset],
        });

        return { asset, userData, reserveData };
      } catch (error) {
        console.warn(`Error fetching Aave data for asset ${asset}:`, error);
        return null;
      }
    });

    const results = await Promise.all(userDataPromises);

    for (const result of results) {
      if (!result) continue;

      const { asset, userData, reserveData } = result;
      const token = TOKENS[asset];

      if (!token) continue;

      const aTokenBalance = userData[0] as bigint;
      const stableDebt = userData[1] as bigint;
      const variableDebt = userData[2] as bigint;
      const liquidityRateRay = reserveData[5] as bigint; // Supply rate
      const variableBorrowRateRay = reserveData[6] as bigint; // Variable borrow rate

      if (aTokenBalance === 0n && stableDebt === 0n && variableDebt === 0n) {
        continue;
      }

      if (aTokenBalance > 0n) {
        const apr = formatRay(liquidityRateRay);
        const apy = calculateApy(apr);
        const usdValue = getTokenUSDValue(aTokenBalance, asset, prices);

        const supplyPosition: Position = {
          protocol: "AAVE",
          chainId: CHAIN_ID,
          owner: userAddress,
          assets: [
            {
              address: asset,
              symbol: token.symbol,
              decimals: token.decimals,
              amount: aTokenBalance,
              usd: usdValue,
            },
          ],
          apr,
          apy,
          accrued: usdValue * (apy / 365),
          updatedAt: Date.now(),
          metadata: {
            poolAddress: AAVE_CONFIG.POOL,
            positionType: "supply",
          },
        };

        positions.push(supplyPosition);
      }

      if (stableDebt > 0n) {
        const stableBorrowRateRay = userData[5] as bigint;
        const apr = formatRay(stableBorrowRateRay);
        const apy = calculateApy(apr);
        const usdValue = getTokenUSDValue(stableDebt, asset, prices);

        const borrowPosition: Position = {
          protocol: "AAVE",
          chainId: CHAIN_ID,
          owner: userAddress,
          assets: [
            {
              address: asset,
              symbol: token.symbol,
              decimals: token.decimals,
              amount: stableDebt,
              usd: usdValue,
            },
          ],
          apr: -apr,
          apy: -apy,
          accrued: -usdValue * (apy / 365),
          updatedAt: Date.now(),
          metadata: {
            poolAddress: AAVE_CONFIG.POOL,
            positionType: "borrow",
            debtType: "stable",
          },
        };

        positions.push(borrowPosition);
      }

      if (variableDebt > 0n) {
        const apr = formatRay(variableBorrowRateRay);
        const apy = calculateApy(apr);
        const usdValue = getTokenUSDValue(variableDebt, asset, prices);

        const borrowPosition: Position = {
          protocol: "AAVE",
          chainId: CHAIN_ID,
          owner: userAddress,
          assets: [
            {
              address: asset,
              symbol: token.symbol,
              decimals: token.decimals,
              amount: variableDebt,
              usd: usdValue,
            },
          ],
          apr: -apr,
          apy: -apy,
          accrued: -usdValue * (apy / 365), // Daily accrued estimate
          updatedAt: Date.now(),
          metadata: {
            poolAddress: AAVE_CONFIG.POOL,
            positionType: "borrow",
            debtType: "variable",
          },
        };

        positions.push(borrowPosition);
      }
    }

    return positions;
  } catch (error) {
    console.error("Error fetching Aave positions:", error);
    return [];
  }
}

export async function getAaveUserSummary(
  userAddress: `0x${string}`,
  prices: Record<string, any>,
): Promise<{
  totalSupplied: number;
  totalBorrowed: number;
  netPosition: number;
  weightedSupplyApy: number;
  weightedBorrowApy: number;
}> {
  const positions = await getAavePositions(userAddress, prices);

  let totalSupplied = 0;
  let totalBorrowed = 0;
  let weightedSupplyValue = 0;
  let weightedBorrowValue = 0;
  let weightedSupplyApy = 0;
  let weightedBorrowApy = 0;

  for (const position of positions) {
    const positionValue = position.assets.reduce((sum, asset) => sum + (asset.usd || 0), 0);

    if (position.apy && position.apy > 0) {
      totalSupplied += positionValue;
      weightedSupplyValue += positionValue;
      weightedSupplyApy += positionValue * position.apy;
    } else if (position.apy && position.apy < 0) {
      totalBorrowed += positionValue;
      weightedBorrowValue += positionValue;
      weightedBorrowApy += positionValue * Math.abs(position.apy);
    }
  }

  return {
    totalSupplied,
    totalBorrowed,
    netPosition: totalSupplied - totalBorrowed,
    weightedSupplyApy: weightedSupplyValue > 0 ? weightedSupplyApy / weightedSupplyValue : 0,
    weightedBorrowApy: weightedBorrowValue > 0 ? weightedBorrowApy / weightedBorrowValue : 0,
  };
}
