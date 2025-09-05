import { client } from "./client";
import { createMockPositions } from "./mock-protocols";

// Local test wallet
export const LOCAL_TEST_WALLET = "0x3f1Eae7D46d88F08fc2F8ed27FCb2AB183EB2d0E" as `0x${string}`;

// Local test tokens
export const LOCAL_TOKENS = {
  WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
  USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
  WBTC: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f" as `0x${string}`,
};

// Local protocol addresses (mock)
export const LOCAL_PROTOCOLS = {
  AAVE_POOL: "0x794a61358D6845594F94dc1DB02A252b5b4814aD" as `0x${string}`,
  UNISWAP_POSITION_MANAGER: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88" as `0x${string}`,
  CURVE_POOL: "0x7f90122BF0700F9E7e1F688fe926940E8839F353" as `0x${string}`,
};

export async function setupLocalTestEnvironment() {
  console.log("🔧 Setting up local test environment...");

  try {
    // 1. Check if local chain is running
    const blockNumber = await client.getBlockNumber();
    console.log("✅ Local chain connected, block:", blockNumber);

    // 2. Check wallet balance
    const balance = await client.getBalance({ address: LOCAL_TEST_WALLET });
    console.log("💰 Wallet balance:", (Number(balance) / 1e18).toFixed(4), "ETH");

    // 3. Create mock positions
    await createMockPositions(LOCAL_TEST_WALLET);

    // 4. Setup test data
    await setupTestData();

    console.log("✅ Local test environment setup complete!");
    return true;
  } catch (error) {
    console.error("❌ Error setting up local test environment:", error);
    return false;
  }
}

async function setupTestData() {
  console.log("📊 Setting up test data...");

  // Create comprehensive test data
  const testData = {
    wallet: LOCAL_TEST_WALLET,
    positions: [
      {
        protocol: "AAVE",
        type: "supply",
        asset: LOCAL_TOKENS.WETH,
        amount: "1.5",
        apy: 0.045,
        value: 3750, // 1.5 ETH * $2500
      },
      {
        protocol: "AAVE",
        type: "borrow",
        asset: LOCAL_TOKENS.USDC,
        amount: "1000",
        apy: 0.032,
        value: 1000,
      },
      {
        protocol: "UNISWAP_V3",
        type: "lp",
        assets: [LOCAL_TOKENS.WETH, LOCAL_TOKENS.USDC],
        amount: "0.5",
        apy: 0.12,
        value: 1250,
      },
      {
        protocol: "CURVE",
        type: "lp",
        asset: LOCAL_TOKENS.WBTC,
        amount: "0.1",
        apy: 0.08,
        value: 4500,
      },
    ],
    summary: {
      totalValue: 10500,
      totalAccrued: 125.5,
      weightedApy: 0.067,
    },
  };

  console.log("📋 Test data created:", testData);
  return testData;
}

export async function getLocalWalletData() {
  console.log("🔍 Fetching local wallet data...");

  try {
    // Get real wallet data
    const balance = await client.getBalance({ address: LOCAL_TEST_WALLET });
    const nonce = await client.getTransactionCount({ address: LOCAL_TEST_WALLET });

    // Get recent transactions
    const blockNumber = await client.getBlockNumber();
    const recentBlock = await client.getBlock({
      blockNumber: blockNumber,
      includeTransactions: true,
    });

    const walletTxs = recentBlock.transactions.filter(
      tx => tx.from === LOCAL_TEST_WALLET || tx.to === LOCAL_TEST_WALLET,
    );

    return {
      address: LOCAL_TEST_WALLET,
      balance: (Number(balance) / 1e18).toFixed(4),
      nonce,
      recentTransactions: walletTxs.length,
      blockNumber,
    };
  } catch (error) {
    console.error("❌ Error fetching local wallet data:", error);
    return null;
  }
}

export async function simulateRealTimeUpdates() {
  console.log("⏰ Starting real-time data simulation...");

  // Simulate real-time updates every 30 seconds
  setInterval(async () => {
    try {
      const blockNumber = await client.getBlockNumber();
      console.log(`🔄 Real-time update - Block: ${blockNumber}, Time: ${new Date().toLocaleTimeString()}`);

      // Simulate changing APY values
      const mockApyChanges = {
        aave: 0.045 + (Math.random() - 0.5) * 0.01, // ±0.5% change
        uniswap: 0.12 + (Math.random() - 0.5) * 0.02, // ±1% change
        curve: 0.08 + (Math.random() - 0.5) * 0.005, // ±0.25% change
      };

      console.log("📈 APY Updates:", mockApyChanges);
    } catch (error) {
      console.error("❌ Error in real-time update:", error);
    }
  }, 30000); // 30 seconds

  console.log("✅ Real-time simulation started");
}
