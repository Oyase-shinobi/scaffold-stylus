"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

interface MultiWalletInfo {
  address: string;
  label: string;
  isActive: boolean;
  lastUsed: Date;
  balance?: string;
}

export const useMultiWallet = () => {
  const [savedWallets, setSavedWallets] = useState<MultiWalletInfo[]>([]);
  const { address, isConnected } = useAccount();

  useEffect(() => {
    const saved = localStorage.getItem("multi-wallets");
    if (saved) {
      try {
        const parsedWallets = JSON.parse(saved).map((wallet: any) => ({
          ...wallet,
          lastUsed: new Date(wallet.lastUsed),
        }));
        setSavedWallets(parsedWallets);
      } catch (error) {
        console.error("Error loading saved wallets:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (address && isConnected) {
      const updatedWallets = savedWallets.map(wallet => ({
        ...wallet,
        isActive: wallet.address === address,
        lastUsed: wallet.address === address ? new Date() : wallet.lastUsed,
      }));

      if (!updatedWallets.find(w => w.address === address)) {
        const newWallet: MultiWalletInfo = {
          address,
          label: `Wallet ${updatedWallets.length + 1}`,
          isActive: true,
          lastUsed: new Date(),
        };
        updatedWallets.push(newWallet);
      }

      setSavedWallets(updatedWallets);
      localStorage.setItem("multi-wallets", JSON.stringify(updatedWallets));
    }
  }, [address, isConnected, savedWallets]);

  const updateWallets = (wallets: MultiWalletInfo[]) => {
    setSavedWallets(wallets);
    localStorage.setItem("multi-wallets", JSON.stringify(wallets));
  };

  const getActiveWallets = () => {
    return savedWallets.filter(wallet => wallet.isActive);
  };

  const getAllWalletAddresses = () => {
    return savedWallets.map(wallet => wallet.address as `0x${string}`);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return {
    savedWallets,
    updateWallets,
    getActiveWallets,
    getAllWalletAddresses,
    formatAddress,
    currentAddress: address,
    isConnected,
  };
};
