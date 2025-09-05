"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { PortfolioSummary } from "~~/components/yield-tracker/PortfolioSummary";
import { ProtocolBreakdown } from "~~/components/yield-tracker/ProtocolBreakdown";
import { useRefreshYieldData } from "~~/hooks/useYieldTracker";
import { useMultiWallet } from "~~/hooks/useMultiWallet";
import { TEST_WALLETS } from "~~/lib/test-data";

export default function YieldTrackerPage() {
  const { address: connectedAddress } = useAccount();
  const [demoMode, setDemoMode] = useState(false);
  const { refreshAll } = useRefreshYieldData();
  const { savedWallets, getAllWalletAddresses, formatAddress } = useMultiWallet();

  const selectedWallets = demoMode
    ? TEST_WALLETS.slice(0, 3)
    : savedWallets.length > 0
      ? getAllWalletAddresses()
      : connectedAddress
        ? [connectedAddress as `0x${string}`]
        : [];

  const handleDemoMode = () => {
    setDemoMode(!demoMode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2">
            Cross-Protocol Yield Tracker
          </h1>
          <p className="text-slate-300 text-sm sm:text-base md:text-lg px-4">
            Track your DeFi positions across Aave, Uniswap v3, and Curve on Arbitrum
          </p>
        </div>

        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 gap-4">
          <div className="text-xs sm:text-sm text-slate-300 text-center lg:text-left">
            {selectedWallets.length > 0 ? (
              <>
                Tracking {selectedWallets.length} wallet{selectedWallets.length !== 1 ? "s" : ""}
                {demoMode && <span className="ml-2 text-yellow-400">(Demo Mode)</span>}
              </>
            ) : (
              "No wallets selected"
            )}
          </div>
          <div className="flex flex-wrap gap-3 sm:gap-4 justify-center lg:justify-end">
            <button
              onClick={handleDemoMode}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-colors ${demoMode ? "bg-yellow-600 hover:bg-yellow-700 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"
                }`}
            >
              {demoMode ? "Exit Demo" : "Demo Mode"}
            </button>
            <button
              onClick={refreshAll}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm sm:text-base font-medium transition-colors"
            >
              Refresh Data
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-1 order-1">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 sm:p-6 shadow-xl border border-slate-700">
              <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-white">Wallet Selection</h3>

              {savedWallets.length > 0 ? (
                <div className="space-y-3">
                  {savedWallets.map(wallet => (
                    <div
                      key={wallet.address}
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-lg border gap-2 sm:gap-0 ${wallet.isActive ? "bg-green-500/10 border-green-400/50" : "bg-slate-800/50 border-slate-600"
                        }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-xs sm:text-sm text-slate-400 font-medium">
                          {wallet.isActive ? "Active" : "Connected"}
                        </span>
                        <span className="font-mono text-sm text-white">{formatAddress(wallet.address)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{wallet.label}</span>
                        {wallet.isActive && <span className="text-green-400 text-xs sm:text-sm font-medium">✓</span>}
                      </div>
                    </div>
                  ))}

                  {savedWallets.length > 1 && (
                    <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-xs text-blue-400 text-center">
                        📊 Tracking {savedWallets.length} wallets combined
                      </p>
                    </div>
                  )}
                </div>
              ) : connectedAddress ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-slate-800/50 rounded-lg border border-slate-600 gap-2 sm:gap-0">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xs sm:text-sm text-slate-400 font-medium">Connected</span>
                    <span className="font-mono text-sm text-white">{formatAddress(connectedAddress)}</span>
                  </div>
                  <span className="text-green-400 text-xs sm:text-sm font-medium text-center sm:text-right">
                    ✓ Active
                  </span>
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8 text-slate-400">
                  <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">👛</div>
                  <div className="text-xs sm:text-sm font-medium">No wallet connected</div>
                  <div className="text-xs mt-1 sm:mt-2">Connect your wallet to start tracking positions</div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 order-2 space-y-6 lg:space-y-8">
            <PortfolioSummary address={selectedWallets.length > 0 ? selectedWallets[0] : undefined} />
            <ProtocolBreakdown address={selectedWallets.length > 0 ? selectedWallets[0] : undefined} />
          </div>
        </div>

        <div className="mt-8 sm:mt-12 text-center text-xs sm:text-sm text-slate-400 px-4">
          <p className="mb-2">Data is fetched directly from on-chain contracts. Prices from Chainlink feeds.</p>
          <p className="mb-4">Supported protocols: Aave v3, Uniswap v3, Curve • Network: Arbitrum</p>
          {selectedWallets.length === 0 && (
            <div className="mt-4 sm:mt-6 p-4 sm:p-6 bg-slate-800/50 rounded-xl border border-slate-700 max-w-2xl mx-auto">
              <p className="font-medium mb-3 text-white text-sm sm:text-base">💡 Getting Started</p>
              <p className="mb-3 text-slate-300 text-xs sm:text-sm">To see live data:</p>
              <ul className="text-left max-w-md mx-auto text-slate-300 text-xs sm:text-sm space-y-1">
                <li>• Connect a wallet with DeFi positions on Arbitrum</li>
                <li>• Or click &quot;Demo Mode&quot; to see sample data</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
