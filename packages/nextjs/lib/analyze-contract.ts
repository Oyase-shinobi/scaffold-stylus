import { client } from "./client";
import { getAddress } from "viem";

export async function analyzeContract(contractAddress: string) {
  try {
    const checksumAddress = getAddress(contractAddress);
    const code = await client.getBytecode({ address: checksumAddress });
    if (!code) {
      return;
    }
    const balance = await client.getBalance({ address: checksumAddress });

    try {
      const name = await client.readContract({
        address: checksumAddress,
        abi: ["function name() view returns (string)"],
        functionName: "name",
      });
    } catch (error) {
      console.log("No name() function found");
    }

    try {
      const symbol = await client.readContract({
        address: checksumAddress,
        abi: ["function symbol() view returns (string)"],
        functionName: "symbol",
      });
    } catch (error) {
      console.log("No symbol() function found");
    }

    try {
      const decimals = await client.readContract({
        address: checksumAddress,
        abi: ["function decimals() view returns (uint8)"],
        functionName: "decimals",
      });
    } catch (error) {
      console.log("No decimals() function found");
    }
    try {
      const totalSupply = await client.readContract({
        address: checksumAddress,
        abi: ["function totalSupply() view returns (uint256)"],
        functionName: "totalSupply",
      });
    } catch (error) {
      console.log("No totalSupply() function found");
    }
  } catch (error) {
    console.error("❌ Error analyzing contract:", error);
  }
}

export async function analyzeWallet(walletAddress: string) {
  try {
    const checksumAddress = getAddress(walletAddress);
    const balance = await client.getBalance({ address: checksumAddress });
    const nonce = await client.getTransactionCount({ address: checksumAddress });

    try {
      const blockNumber = await client.getBlockNumber();
      const recentBlock = await client.getBlock({ blockNumber: blockNumber, includeTransactions: true });
      const walletTxs = recentBlock.transactions.filter(tx => tx.from === checksumAddress || tx.to === checksumAddress);
    } catch (error) {
      console.log("Could not fetch recent transactions");
    }
  } catch (error) {
    console.error("❌ Error analyzing wallet:", error);
  }
}
