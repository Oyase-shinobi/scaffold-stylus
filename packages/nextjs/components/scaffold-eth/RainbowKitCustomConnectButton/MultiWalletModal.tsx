"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { XMarkIcon, PlusIcon, TrashIcon, CheckIcon } from "@heroicons/react/24/outline";

interface MultiWalletInfo {
  address: string;
  label: string;
  isActive: boolean;
  lastUsed: Date;
  balance?: string;
}

interface MultiWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletsChange?: (wallets: MultiWalletInfo[]) => void;
}

export const MultiWalletModal = ({ isOpen, onClose, onWalletsChange }: MultiWalletModalProps) => {
  const [savedWallets, setSavedWallets] = useState<MultiWalletInfo[]>([]);
  const [walletLabel, setWalletLabel] = useState("");
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const { address, isConnected } = useAccount();
  const { connectors } = useConnect();

  // Load saved wallets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('multi-wallets');
    if (saved) {
      try {
        const parsedWallets = JSON.parse(saved).map((wallet: any) => ({
          ...wallet,
          lastUsed: new Date(wallet.lastUsed)
        }));
        setSavedWallets(parsedWallets);
        onWalletsChange?.(parsedWallets);
      } catch (error) {
        console.error('Error loading saved wallets:', error);
      }
    }
  }, [onWalletsChange]);

  // Update wallets when current address changes
  useEffect(() => {
    if (address && isConnected) {
      const updatedWallets = savedWallets.map(wallet => ({
        ...wallet,
        isActive: wallet.address === address,
        lastUsed: wallet.address === address ? new Date() : wallet.lastUsed,
      }));

      // Add current wallet if not already saved
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
      localStorage.setItem('multi-wallets', JSON.stringify(updatedWallets));
      onWalletsChange?.(updatedWallets);
    }
  }, [address, isConnected, onWalletsChange]);

  const handleSaveWallet = () => {
    if (!address || !walletLabel.trim()) return;

    const updatedWallets = savedWallets.map(wallet =>
      wallet.address === address
        ? { ...wallet, label: walletLabel.trim() }
        : wallet
    );

    setSavedWallets(updatedWallets);
    localStorage.setItem('multi-wallets', JSON.stringify(updatedWallets));
    onWalletsChange?.(updatedWallets);
    setWalletLabel("");
    setShowAddWallet(false);
  };

  const handleRemoveWallet = (addressToRemove: string) => {
    const updatedWallets = savedWallets.filter(wallet => wallet.address !== addressToRemove);
    setSavedWallets(updatedWallets);
    localStorage.setItem('multi-wallets', JSON.stringify(updatedWallets));
    onWalletsChange?.(updatedWallets);
  };

  const handleAddManualWallet = () => {
    if (!manualAddress.trim()) return;

    // Basic address validation
    if (!manualAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert("Please enter a valid Ethereum address (0x...)");
      return;
    }

    // Check if wallet already exists
    if (savedWallets.find(w => w.address.toLowerCase() === manualAddress.toLowerCase())) {
      alert("This wallet is already added");
      return;
    }

    const newWallet: MultiWalletInfo = {
      address: manualAddress,
      label: `Wallet ${savedWallets.length + 1}`,
      isActive: false,
      lastUsed: new Date(),
    };

    const updatedWallets = [...savedWallets, newWallet];
    setSavedWallets(updatedWallets);
    localStorage.setItem('multi-wallets', JSON.stringify(updatedWallets));
    onWalletsChange?.(updatedWallets);

    setManualAddress("");
    setShowManualInput(false);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Multi Wallet Manager</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">

          {/* Add/Edit Wallet Label */}
          {showAddWallet && address && (
            <div className="bg-white/5 rounded-lg p-4 mb-6">
              <p className="text-sm text-white mb-3">Wallet Label</p>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={walletLabel}
                  onChange={(e) => setWalletLabel(e.target.value)}
                  placeholder="Enter wallet label..."
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm placeholder-gray-400"
                  maxLength={20}
                />
                <button
                  onClick={handleSaveWallet}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowAddWallet(false);
                    setWalletLabel("");
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Add Wallet Section */}
          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-white font-medium">Add Wallet Address</p>
              <button
                onClick={() => setShowManualInput(!showManualInput)}
                className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                {showManualInput ? "Cancel" : "Add Wallet"}
              </button>
            </div>

            {showManualInput && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Wallet Address</label>
                  <input
                    type="text"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddManualWallet}
                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckIcon className="h-4 w-4" />
                    Add Wallet
                  </button>
                  <button
                    onClick={() => {
                      setShowManualInput(false);
                      setManualAddress("");
                    }}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Wallet List */}
          {savedWallets.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-300">Wallet List ({savedWallets.length})</p>
                <div className="text-xs text-gray-500">
                  {savedWallets.filter(w => w.isActive).length} active
                </div>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {savedWallets.map((wallet) => (
                  <div
                    key={wallet.address}
                    className={`p-3 rounded-lg border transition-colors ${wallet.isActive
                      ? 'bg-green-500/20 border-green-400/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white text-sm font-medium truncate">{wallet.label}</span>
                          {wallet.isActive && (
                            <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-xs font-mono">{formatAddress(wallet.address)}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => copyToClipboard(wallet.address)}
                          className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                          title="Copy address"
                        >
                          📋
                        </button>
                        <button
                          onClick={() => handleRemoveWallet(wallet.address)}
                          className="p-1.5 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400 transition-colors"
                          title="Remove wallet"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-700">
          <p className="text-xs text-gray-400">
            {savedWallets.length} wallet{savedWallets.length !== 1 ? 's' : ''} connected
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
