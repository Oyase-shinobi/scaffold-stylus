import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";

const getRpcUrl = () => {
  const rpcUrl = process.env.NEXT_PUBLIC_ARBI_RPC || "https://arb1.arbitrum.io/rpc";
  return rpcUrl;
};

export const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(getRpcUrl()),
});

export const client = createPublicClient({
  chain: arbitrum,
  transport: http(getRpcUrl()),
  batch: {
    multicall: true,
  },
});

export const SECONDS_PER_YEAR = 365n * 24n * 60n * 60n;
export const RAY = 10n ** 27n; // Aave uses ray precision (1e27)
export const WAD = 10n ** 18n; // Standard precision (1e18)

export const formatRay = (value: bigint): number => {
  return Number(value) / Number(RAY);
};

export const formatWad = (value: bigint): number => {
  return Number(value) / Number(WAD);
};

export const calculateApy = (apr: number): number => {
  const secondsPerYear = 365 * 24 * 60 * 60;
  return Math.pow(1 + apr / secondsPerYear, secondsPerYear) - 1;
};

export const calculateApr = (apy: number): number => {
  const secondsPerYear = 365 * 24 * 60 * 60;
  return secondsPerYear * (Math.pow(1 + apy, 1 / secondsPerYear) - 1);
};
