"use client";

import { useProtocolBreakdown } from '~~/hooks/useYieldTracker';
import { formatUSDValue, formatPercentage } from '~~/lib/prices';
import { Position } from '~~/types/positions';
import { getProtocolConfigKey } from '~~/lib/utils/protocol-utils';

interface ProtocolBreakdownProps {
  address?: `0x${string}`;
  className?: string;
}

const PROTOCOL_CONFIG = {
  AAVE: {
    name: 'Aave',
    color: 'from-blue-500/10 to-blue-600/5',
    borderColor: 'border-blue-500/20',
    textColor: 'text-blue-600',
    icon: '🏦',
  },
  UNISWAP_V3: {
    name: 'Uniswap V3',
    color: 'from-pink-500/10 to-pink-600/5',
    borderColor: 'border-pink-500/20',
    textColor: 'text-pink-600',
    icon: '🦄',
  },
  CURVE: {
    name: 'Curve',
    color: 'from-green-500/10 to-green-600/5',
    borderColor: 'border-green-500/20',
    textColor: 'text-green-600',
    icon: '📈',
  },
} as const;

function PositionCard({ position }: { position: Position }) {
  const protocol = PROTOCOL_CONFIG[position.protocol];

  if (!protocol) {
    console.warn(`No configuration found for protocol: ${position.protocol}`);
    return null;
  }

  const positionValue = position.assets.reduce((sum, asset) => sum + (asset.usd || 0), 0);

  return (
    <div className={`bg-gradient-to-br ${protocol.color} rounded-lg p-3 sm:p-4 border ${protocol.borderColor}`}>
      <div className="flex justify-between items-start mb-2 sm:mb-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-base sm:text-lg">{protocol.icon}</span>
          <span className={`font-medium text-xs sm:text-sm ${protocol.textColor}`}>{protocol.name}</span>
        </div>
        <div className="text-right">
          <div className="text-xs sm:text-sm font-medium">{formatUSDValue(positionValue)}</div>
          {position.apy && (
            <div className={`text-xs ${position.apy > 0 ? 'text-success' : 'text-error'}`}>
              {formatPercentage(Math.abs(position.apy))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1 sm:space-y-2">
        {position.assets.map((asset, index) => (
          <div key={index} className="flex justify-between items-center text-xs sm:text-sm">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="font-medium">{asset.symbol}</span>
              <span className="text-base-content/60">
                {Number(asset.amount) / Math.pow(10, asset.decimals)}
              </span>
            </div>
            <div className="text-base-content/60">{formatUSDValue(asset.usd || 0)}</div>
          </div>
        ))}
      </div>

      {position.accrued && position.accrued > 0 && (
        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-base-300">
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="text-base-content/60">Accrued</span>
            <span className="text-success font-medium">{formatUSDValue(position.accrued)}</span>
          </div>
        </div>
      )}

      {position.metadata?.positionType && (
        <div className="mt-1 sm:mt-2">
          <span className="inline-block px-2 py-1 text-xs bg-base-300 rounded-full">
            {position.metadata.positionType}
          </span>
        </div>
      )}
    </div>
  );
}

export function ProtocolBreakdown({ address, className = '' }: ProtocolBreakdownProps) {
  const { data: breakdown, isLoading } = useProtocolBreakdown(address);

  if (isLoading) {
    return (
      <div className={`bg-base-100 rounded-lg p-4 sm:p-6 shadow-lg ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 sm:h-8 bg-base-300 rounded mb-4 sm:mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 sm:h-32 bg-base-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const allPositions = [
    ...(breakdown?.aave.positions || []),
    ...(breakdown?.uniswap.positions || []),
    ...(breakdown?.curve.positions || []),
  ];

  const protocolStats = {
    aave: {
      positions: breakdown?.aave.positions || [],
      totalValue: (breakdown?.aave.positions || []).reduce((sum, pos) =>
        sum + pos.assets.reduce((s, asset) => s + (asset.usd || 0), 0), 0
      ),
      summary: breakdown?.aave.summary,
    },
    uniswap: {
      positions: breakdown?.uniswap.positions || [],
      totalValue: (breakdown?.uniswap.positions || []).reduce((sum, pos) =>
        sum + pos.assets.reduce((s, asset) => s + (asset.usd || 0), 0), 0
      ),
      summary: breakdown?.uniswap.summary,
    },
    curve: {
      positions: breakdown?.curve.positions || [],
      totalValue: (breakdown?.curve.positions || []).reduce((sum, pos) =>
        sum + pos.assets.reduce((s, asset) => s + (asset.usd || 0), 0), 0
      ),
      summary: breakdown?.curve.summary,
    },
  };

  // Debug: Log available protocols and their positions
  if (process.env.NODE_ENV === 'development') {
    console.log('Available protocols:', Object.keys(protocolStats));
    console.log('All positions:', allPositions.map(p => ({ protocol: p.protocol, assets: p.assets.length })));
  }

  return (
    <div className={`bg-base-100 rounded-lg p-4 sm:p-6 shadow-lg ${className}`}>
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Protocol Breakdown</h2>

      {/* Protocol Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {Object.entries(protocolStats)
          .map(([protocol, stats]) => {
            // Use utility function to get protocol config key
            const protocolKey = getProtocolConfigKey(protocol);
            const config = protocolKey ? PROTOCOL_CONFIG[protocolKey] : null;

            if (!config) {
              console.warn(`No configuration found for protocol: ${protocol}`);
              return null;
            }

            return (
              <div key={protocol} className={`bg-gradient-to-br ${config.color} rounded-lg p-3 sm:p-4 border ${config.borderColor}`}>
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <span className="text-base sm:text-lg">{config.icon}</span>
                  <span className={`font-medium text-sm sm:text-base ${config.textColor}`}>{config.name}</span>
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold">{formatUSDValue(stats.totalValue)}</div>
                <div className="text-xs sm:text-sm text-base-content/60">
                  {stats.positions.length} position{stats.positions.length !== 1 ? 's' : ''}
                </div>
              </div>
            );
          })
          .filter(Boolean)}
      </div>

      {/* Individual Positions */}
      {allPositions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {allPositions
            .map((position, index) => (
              <PositionCard key={`${position.protocol}-${index}`} position={position} />
            ))
            .filter(Boolean)}
        </div>
      ) : (
        <div className="text-center py-6 sm:py-8 text-base-content/60">
          <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🔍</div>
          <div className="text-base sm:text-lg font-medium mb-1 sm:mb-2">No positions found</div>
          <div className="text-xs sm:text-sm px-4">
            No active positions found across Aave, Uniswap, or Curve protocols.
          </div>
        </div>
      )}
    </div>
  );
}
