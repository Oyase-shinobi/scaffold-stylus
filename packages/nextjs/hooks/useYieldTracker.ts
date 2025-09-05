import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { yieldTracker } from "../lib/yield-tracker";

const QUERY_KEYS = {
  walletData: (address: string) => ["yield-tracker", "wallet", address],
  multiWalletData: (addresses: string[]) => ["yield-tracker", "multi-wallet", addresses.sort().join("-")],
  protocolBreakdown: (address: string) => ["yield-tracker", "breakdown", address],
} as const;

export function useWalletData(address?: `0x${string}`) {
  return useQuery({
    queryKey: QUERY_KEYS.walletData(address || ""),
    queryFn: () => yieldTracker.getWalletData(address!),
    enabled: !!address,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    retryDelay: 1000,
  });
}

export function useMultiWalletData(addresses: `0x${string}`[]) {
  return useQuery({
    queryKey: QUERY_KEYS.multiWalletData(addresses),
    queryFn: () => yieldTracker.getMultiWalletData(addresses),
    enabled: addresses.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    retryDelay: 1000,
  });
}

export function useProtocolBreakdown(address?: `0x${string}`) {
  return useQuery({
    queryKey: QUERY_KEYS.protocolBreakdown(address || ""),
    queryFn: () => yieldTracker.getProtocolBreakdown(address!),
    enabled: !!address,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    retryDelay: 1000,
  });
}

export function useConnectedWalletData() {
  const { address } = useAccount();
  return useWalletData(address as `0x${string}`);
}

export function useRefreshYieldData() {
  const queryClient = useQueryClient();

  return {
    refreshWalletData: (address: `0x${string}`) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.walletData(address) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.protocolBreakdown(address) });
    },
    refreshMultiWalletData: (addresses: `0x${string}`[]) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.multiWalletData(addresses) });
    },
    refreshAll: () => {
      queryClient.invalidateQueries({ queryKey: ["yield-tracker"] });
      yieldTracker.clearCache();
    },
  };
}

export function usePortfolioSummary(address?: `0x${string}`) {
  const { data: walletData, isLoading, error } = useWalletData(address);

  return {
    summary: walletData?.summary,
    isLoading,
    error,
    totalValue: walletData?.summary.totalValue || 0,
    totalAccrued: walletData?.summary.totalAccrued || 0,
    weightedApy: walletData?.summary.weightedApy || 0,
    positions: walletData?.positions || [],
    lastUpdated: walletData?.summary.lastUpdated,
  };
}

export function useMultiWalletPortfolioSummary(addresses: `0x${string}`[]) {
  const { data: multiWalletData, isLoading, error } = useMultiWalletData(addresses);

  return {
    summary: multiWalletData?.aggregated,
    wallets: multiWalletData?.wallets || [],
    isLoading,
    error,
    totalValue: multiWalletData?.aggregated.totalValue || 0,
    totalAccrued: multiWalletData?.aggregated.totalAccrued || 0,
    weightedApy: multiWalletData?.aggregated.weightedApy || 0,
    allPositions: multiWalletData?.aggregated.positions || [],
    lastUpdated: multiWalletData?.aggregated.lastUpdated,
  };
}
