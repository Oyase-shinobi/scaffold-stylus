"use client";

import { usePortfolioSummary } from "../../hooks/useYieldTracker";
import { formatUSDValue, formatPercentage } from "../../lib/prices";
import { LoadingState, ErrorState } from "./LoadingState";

interface PortfolioSummaryProps {
  address?: `0x${string}`;
  className?: string;
}

export function PortfolioSummary({ address, className = "" }: PortfolioSummaryProps) {
  const { totalValue, totalAccrued, weightedApy, positions, isLoading, error, lastUpdated } =
    usePortfolioSummary(address);

  if (isLoading) {
    return (
      <div
        className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 sm:p-6 shadow-xl border border-slate-700 ${className}`}
      >
        <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-white">Portfolio Overview</h3>
        <LoadingState isLoading={true} message="Fetching portfolio data..." showProgress={true} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 sm:p-6 shadow-xl border border-slate-700 ${className}`}
      >
        <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-white">Portfolio Overview</h3>
        <ErrorState error={error} />
      </div>
    );
  }

  return (
    <div
      className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 sm:p-6 shadow-xl border border-slate-700 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Portfolio Overview</h2>
        <div className="text-xs sm:text-sm text-slate-400">
          Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "Never"}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* Total Portfolio Value */}
        <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-xl p-4 sm:p-6 border border-blue-700/30">
          <div className="text-xs sm:text-sm text-slate-300 mb-1 sm:mb-2 font-medium">Total Portfolio Value</div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-400">{formatUSDValue(totalValue)}</div>
          <div className="text-xs text-slate-400 mt-1 sm:mt-2">
            {positions.length} position{positions.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Total Accrued */}
        <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-xl p-4 sm:p-6 border border-green-700/30">
          <div className="text-xs sm:text-sm text-slate-300 mb-1 sm:mb-2 font-medium">Total Accrued</div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-400">{formatUSDValue(totalAccrued)}</div>
          <div className="text-xs text-slate-400 mt-1 sm:mt-2">Unclaimed rewards</div>
        </div>

        {/* Weighted APY */}
        <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 rounded-xl p-4 sm:p-6 border border-yellow-700/30 sm:col-span-2 lg:col-span-1">
          <div className="text-xs sm:text-sm text-slate-300 mb-1 sm:mb-2 font-medium">Weighted APY</div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-400">
            {formatPercentage(weightedApy)}
          </div>
          <div className="text-xs text-slate-400 mt-1 sm:mt-2">Average yield</div>
        </div>
      </div>

      {positions.length === 0 && (
        <div className="text-center py-8 sm:py-12 text-slate-400">
          <div className="text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6">📊</div>
          <div className="text-lg sm:text-xl font-medium mb-2 sm:mb-3 text-white">No positions found</div>
          <div className="text-xs sm:text-sm px-4">
            Connect your wallet to view your DeFi positions across Aave, Uniswap, and Curve.
          </div>
        </div>
      )}
    </div>
  );
}
