import React from 'react';

interface TradeHistoryProps {
    trades: any[];
}

export const TradeHistory: React.FC<TradeHistoryProps> = ({ trades }) => {
    return (
        <div className="widget panel trade-history-widget" style={{ height: '100%', borderBottom: 'none' }}>
            <div className="widget-header">TRADE HISTORY</div>
            <div className="widget-content table-container">
                {trades.length === 0 ? (
                    <div className="empty-state">No trades executed yet.</div>
                ) : (
                    <table className="dense-table">
                        <thead>
                            <tr>
                                <th>TIME</th>
                                <th>TYPE</th>
                                <th className="text-right">PRICE</th>
                                <th className="text-right">QTY</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trades.map((t, idx) => (
                                <tr key={idx}>
                                    <td className="value-mono text-xs">
                                        {new Date(t.time * (t.time > 1e11 ? 1 : 1000)).toLocaleString()}
                                    </td>
                                    <td className={t.type === 'BUY' ? 'text-up' : 'text-down'}>
                                        {t.type}
                                    </td>
                                    <td className="value-mono text-right">₹{t.price.toFixed(2)}</td>
                                    <td className="value-mono text-right">{t.qty}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
