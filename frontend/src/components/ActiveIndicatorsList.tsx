import React from 'react';
import { IndicatorConfig } from './IndicatorModal';
import { Trash2 } from 'lucide-react';

interface ActiveIndicatorsListProps {
    indicators: IndicatorConfig[];
    onRemove: (id: string) => void;
}

export const ActiveIndicatorsList: React.FC<ActiveIndicatorsListProps> = ({ indicators, onRemove }) => {
    return (
        <div className="widget panel">
            <div className="widget-header">ACTIVE INDICATORS ({indicators.length})</div>
            <div className="widget-content">
                {indicators.length === 0 ? (
                    <div className="empty-state">No active indicators.</div>
                ) : (
                    <ul className="indicator-list">
                        {indicators.map(ind => (
                            <li key={ind.id} className="indicator-item">
                                <div className="indicator-info">
                                    <span className="indicator-type">{ind.type.replace('_', ' ').toUpperCase()}</span>
                                    {ind.params && Object.keys(ind.params).length > 0 && (
                                        <span className="indicator-params micro-label">
                                            {Object.entries(ind.params).map(([k, v]) => `${k}:${v}`).join(', ')}
                                        </span>
                                    )}
                                </div>
                                <button
                                    className="icon-btn remove-btn"
                                    onClick={() => onRemove(ind.id)}
                                    title="Remove Indicator"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};
