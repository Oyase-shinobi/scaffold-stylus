import { client } from "./client";
import { CURVE_CONFIG, AAVE_CONFIG, UNISWAP_CONFIG, PRICE_FEEDS } from "../config/protocols";

export async function testContractAddresses() {
  console.log("🔍 Testing contract addresses on Arbitrum...");

  const contracts = [
    { name: "Curve Tricrypto Pool", address: CURVE_CONFIG.TRICRYPTO },
    { name: "Curve Tricrypto Gauge", address: CURVE_CONFIG.TRICRYPTO_GAUGE },
    { name: "Aave Pool Data Provider", address: AAVE_CONFIG.POOL_DATA_PROVIDER },
    { name: "Aave Pool", address: AAVE_CONFIG.POOL },
    { name: "Uniswap Position Manager", address: UNISWAP_CONFIG.NONFUNGIBLE_POSITION_MANAGER },
  ];

  console.log("\n📊 Testing Price Feeds:");
  const priceFeeds = [
    { name: "WETH Price Feed", address: PRICE_FEEDS.WETH },
    { name: "USDC Price Feed", address: PRICE_FEEDS.USDC },
    { name: "WBTC Price Feed", address: PRICE_FEEDS.WBTC },
  ];

  for (const feed of priceFeeds) {
    try {
      const code = await client.getBytecode({ address: feed.address });
      if (code) {
        console.log(`✅ ${feed.name}: ${feed.address} - EXISTS`);
      } else {
        console.log(`❌ ${feed.name}: ${feed.address} - NOT FOUND`);
      }
    } catch (error) {
      console.log(`❌ ${feed.name}: ${feed.address} - ERROR: ${error}`);
    }
  }

  for (const contract of contracts) {
    try {
      const code = await client.getBytecode({ address: contract.address });
      if (code) {
        console.log(`✅ ${contract.name}: ${contract.address} - EXISTS`);
      } else {
        console.log(`❌ ${contract.name}: ${contract.address} - NOT FOUND`);
      }
    } catch (error) {
      console.log(`❌ ${contract.name}: ${contract.address} - ERROR: ${error}`);
    }
  }
}

// Test specific functions
export async function testCurveFunctions() {
  console.log("🔍 Testing Curve contract functions...");

  const poolAddress = CURVE_CONFIG.TRICRYPTO;
  const gaugeAddress = CURVE_CONFIG.TRICRYPTO_GAUGE;

  try {
    // Test pool functions
    const poolCode = await client.getBytecode({ address: poolAddress });
    if (poolCode) {
      console.log(`✅ Pool contract exists: ${poolAddress}`);

      // Test balanceOf function
      try {
        const balance = await client.readContract({
          address: poolAddress,
          abi: ["function balanceOf(address) view returns (uint256)"],
          functionName: "balanceOf",
          args: ["0x0000000000000000000000000000000000000000"],
        });
        console.log(`✅ Pool balanceOf function works`);
      } catch (error) {
        console.log(`❌ Pool balanceOf function failed: ${error}`);
      }
    } else {
      console.log(`❌ Pool contract not found: ${poolAddress}`);
    }

    // Test gauge functions
    const gaugeCode = await client.getBytecode({ address: gaugeAddress });
    if (gaugeCode) {
      console.log(`✅ Gauge contract exists: ${gaugeAddress}`);

      // Test balanceOf function
      try {
        const balance = await client.readContract({
          address: gaugeAddress,
          abi: ["function balanceOf(address) view returns (uint256)"],
          functionName: "balanceOf",
          args: ["0x0000000000000000000000000000000000000000"],
        });
        console.log(`✅ Gauge balanceOf function works`);
      } catch (error) {
        console.log(`❌ Gauge balanceOf function failed: ${error}`);
      }
    } else {
      console.log(`❌ Gauge contract not found: ${gaugeAddress}`);
    }
  } catch (error) {
    console.log(`❌ Error testing Curve functions: ${error}`);
  }
}
