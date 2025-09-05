import { Protocol } from "../../types/positions";

export function getProtocolConfigKey(protocol: string): Protocol | null {
  const protocolMap: Record<string, Protocol> = {
    aave: "AAVE",
    uniswap: "UNISWAP_V3",
    curve: "CURVE",
    AAVE: "AAVE",
    UNISWAP_V3: "UNISWAP_V3",
    CURVE: "CURVE",
  };

  return protocolMap[protocol.toLowerCase()] || null;
}

export function isSupportedProtocol(protocol: string): boolean {
  return getProtocolConfigKey(protocol) !== null;
}

export function getProtocolDisplayName(protocol: string): string {
  const displayNames: Record<string, string> = {
    AAVE: "Aave",
    UNISWAP_V3: "Uniswap V3",
    CURVE: "Curve",
  };

  const configKey = getProtocolConfigKey(protocol);
  return configKey ? displayNames[configKey] : protocol;
}

export function getProtocolIcon(protocol: string): string {
  const icons: Record<string, string> = {
    AAVE: "🏦",
    UNISWAP_V3: "🦄",
    CURVE: "📈",
  };

  const configKey = getProtocolConfigKey(protocol);
  return configKey ? icons[configKey] : "📊";
}
