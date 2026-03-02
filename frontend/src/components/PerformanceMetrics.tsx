import React from 'react';

interface PerformanceMetricsProps {
    pnl: number | null;
    trades: any[];
    onClear?: () => void;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ pnl, trades, onClear }) => {
    const tradeCount = trades.length;

    // Since trades are just BUY/SELL points, calculating win rate accurately requires pairing them.
    // For now we'll show basic metrics available.

    return (
        <div className="widget panel flex-col">
            <div className="widget-header">
                <div>PERFORMANCE METRICS</div>
                {onClear && (pnl !== null || tradeCount > 0) && (
                    <button onClick={onClear} className="icon-btn text-xs border" style={{ padding: '0.1rem 0.3rem', fontSize: '10px' }}>CLEAR</button>
                )}
            </div>
            <div className="widget-content compact-metrics flex-1">
                <div className="metric-row">
                    <span>TOTAL PNL</span>
                    <span className={`value-mono ${pnl && pnl > 0 ? 'text-up' : (pnl && pnl < 0 ? 'text-down' : '')}`}>
                        {pnl !== null ? `₹${pnl.toFixed(2)}` : '--'}
                    </span>
                </div>
                <div className="metric-row">
                    <span>TOTAL TRADES</span>
                    <span className="value-mono">{tradeCount}</span>
                </div>
                {/* If we have more metrics in the future we can add them here */}
                {tradeCount > 0 && (
                    <div className="metric-row mt-auto pt-2 border-t">
                        <span className="text-muted text-xs">More analytics coming soon.</span>
                    </div>
                )}
            </div>
        </div>
    );
};
