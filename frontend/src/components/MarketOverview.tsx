import React from 'react';

interface MarketOverviewProps {
    symbol: string;
    lastCandle: any | null;
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({ symbol, lastCandle }) => {
    if (!lastCandle) {
        return (
            <div className="widget panel">
                <div className="widget-header">MARKET OVERVIEW</div>
                <div className="loading">Waiting for data...</div>
            </div>
        );
    }

    const isUp = lastCandle.close >= lastCandle.open;
    const colorClass = isUp ? 'text-up' : 'text-down';

    return (
        <div className="widget panel">
            <div className="widget-header">MARKET OVERVIEW - {symbol}</div>
            <div className="widget-content compact-metrics">
                <div className="metric-row">
                    <span>TIME</span>
                    <span className="value-mono">{new Date(lastCandle.time * (lastCandle.time > 1e11 ? 1 : 1000)).toLocaleString()}</span>
                </div>
                <div className="metric-row">
                    <span>OPEN</span>
                    <span className="value-mono">{lastCandle.open.toFixed(2)}</span>
                </div>
                <div className="metric-row">
                    <span>HIGH</span>
                    <span className="value-mono">{lastCandle.high.toFixed(2)}</span>
                </div>
                <div className="metric-row">
                    <span>LOW</span>
                    <span className="value-mono">{lastCandle.low.toFixed(2)}</span>
                </div>
                <div className="metric-row">
                    <span>CLOSE</span>
                    <span className={`value-mono ${colorClass}`}>{lastCandle.close.toFixed(2)}</span>
                </div>
                <div className="metric-row">
                    <span>VOLUME</span>
                    <span className="value-mono">{lastCandle.volume ? lastCandle.volume.toLocaleString() : '--'}</span>
                </div>
            </div>
        </div>
    );
};
