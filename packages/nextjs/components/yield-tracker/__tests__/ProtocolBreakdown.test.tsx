import { render, screen } from '@testing-library/react';
import { ProtocolBreakdown } from '../ProtocolBreakdown';

// Mock the hooks
jest.mock('../../../hooks/useYieldTracker', () => ({
  useProtocolBreakdown: () => ({
    data: {
      aave: { positions: [], summary: {} },
      uniswap: { positions: [], summary: {} },
      curve: { positions: [], summary: {} },
    },
    isLoading: false,
  }),
}));

describe('ProtocolBreakdown', () => {
  it('should render without crashing', () => {
    render(<ProtocolBreakdown />);
    expect(screen.getByText('Protocol Breakdown')).toBeInTheDocument();
  });

  it('should handle missing protocol configuration gracefully', () => {
    // This test ensures the component doesn't crash when protocol config is missing
    render(<ProtocolBreakdown />);

    // Should render the "No positions found" message
    expect(screen.getByText('No positions found')).toBeInTheDocument();
  });
});
