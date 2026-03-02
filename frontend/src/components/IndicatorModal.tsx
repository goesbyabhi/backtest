import React, { useState } from 'react';
import { X } from 'lucide-react';

export interface IndicatorConfig {
    id: string;
    type: 'EMA' | 'RSI' | 'VWAP' | 'MACD' | 'BB' | 'ATR' | 'FVG' | 'DAILY_LEVELS' | 'VP';
    params: Record<string, string | number | boolean>;
    color: string;
}

interface IndicatorModalProps {
    onAdd: (config: IndicatorConfig) => void;
    onClose: () => void;
}

const INDICATOR_DESCRIPTIONS: Record<IndicatorConfig['type'], string> = {
    EMA: 'Exponential Moving Average: A trend-following indicator that gives more weight to recent prices. Use it to identify trend direction and potential support/resistance levels. Best used with multiple EMAs (e.g., 9 & 21) for moving average crossovers.',
    RSI: 'Relative Strength Index: A momentum oscillator that measures the speed and change of price movements. Values above 70 indicate overbought conditions (potential reversal down), while values below 30 indicate oversold conditions (potential reversal up).',
    VWAP: 'Volume Weighted Average Price: Shows the true average price a stock traded at throughout the day, based on volume and price. Highly respected by institutions. Price above VWAP = Bullish bias. Price below VWAP = Bearish bias.',
    MACD: 'Moving Average Convergence Divergence: A trend-following momentum indicator showing the relationship between two moving averages. Look for MACD crossing above its signal line for bullish signals, or crossing below for bearish signals.',
    BB: 'Bollinger Bands: Measures volatility using standard deviations away from a simple moving average. When bands squeeze, expect a breakout. Price touching the upper/lower bands can indicate overextended conditions.',
    ATR: 'Average True Range: A pure volatility indicator that ignores direction. Shows the average price movement over a given period. Excellent for setting dynamic stop-loss levels and profit targets based on current market noise.',
    FVG: 'Fair Value Gaps: Areas of price imbalance where the market repriced aggressively, leaving unfilled orders. These areas act as powerful magnets for future price action and serve as precision entry/exit zones.',
    DAILY_LEVELS: 'Previous Day High & Low: Marks the high and low of the preceding trading session. These are critical psychological boundaries where stops build up. Look for sweeps or rejections at these exact levels.',
    VP: 'Session Volume Profile: Displays trading activity at specific price levels. The Point of Control (POC) marks the highest volume node. The Value Area (VA) highlights where 70% of volume occurred.\n\n⚠️ PERFORMANCE WARNING: Volume Profile is computationally heavy. For best performance, limit your backtest range to recent data (e.g., 1-3 months max) when using this indicator.',
};

export const IndicatorModal: React.FC<IndicatorModalProps> = ({ onAdd, onClose }) => {
    const [selectedType, setSelectedType] = useState<IndicatorConfig['type']>('EMA');

    // Form States
    const [length, setLength] = useState<number>(20);
    const [color, setColor] = useState<string>('#ff8c00');
    const [fastLength, setFastLength] = useState<number>(12);
    const [slowLength, setSlowLength] = useState<number>(26);
    const [signalLength, setSignalLength] = useState<number>(9);
    const [multiplier, setMultiplier] = useState<number>(2.0);

    const handleAdd = () => {
        const id = `${selectedType.toLowerCase()}_${Date.now()}`;
        let params: Record<string, string | number | boolean> = {};

        if (selectedType === 'EMA') params = { length };
        if (selectedType === 'RSI') params = { length };
        if (selectedType === 'ATR') params = { length };
        if (selectedType === 'MACD') params = { fast: fastLength, slow: slowLength, signal: signalLength };
        if (selectedType === 'BB') params = { length, multiplier };
        if (selectedType === 'VP') params = { value_area: multiplier }; // reuse multiplier state for now
        if (selectedType === 'VWAP' || selectedType === 'FVG' || selectedType === 'DAILY_LEVELS') params = {};

        const config: IndicatorConfig = {
            id,
            type: selectedType,
            params,
            color
        };
        onAdd(config);
        onClose();
    };

    return (
        <div className="modal-backdrop" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <div className="modal-content" style={{
                background: 'var(--bg-panel)', padding: '1.5rem', borderRadius: '0',
                width: '420px', border: '1px solid var(--border)', color: 'var(--text-main)',
                fontFamily: 'monospace'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--accent)' }}>ADD INDICATOR</h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="micro-label">Type</label>
                    <select
                        value={selectedType}
                        onChange={e => {
                            const type = e.target.value as IndicatorConfig['type'];
                            setSelectedType(type);
                            if (type === 'EMA') { setLength(20); setColor('#ff8c00'); }
                            if (type === 'RSI') { setLength(14); setColor('#9c27b0'); }
                            if (type === 'VWAP') { setColor('#4e73df'); }
                            if (type === 'MACD') { setFastLength(12); setSlowLength(26); setSignalLength(9); setColor('#2962FF'); }
                            if (type === 'BB') { setLength(20); setMultiplier(2.0); setColor('#2196F3'); }
                            if (type === 'ATR') { setLength(14); setColor('#FF5252'); }
                            if (type === 'FVG') { setColor('#00E676'); } // uses opacity usually
                            if (type === 'DAILY_LEVELS') { setColor('#ff9800'); } // orange
                            if (type === 'VP') { setColor('#ff8c00'); setMultiplier(70); } // value area pct
                        }}
                        className="dropdown-select"
                        style={{ width: '100%', padding: '0.4rem', background: '#111', border: '1px solid var(--border)', color: 'white', borderRadius: '0' }}
                    >
                        <option value="EMA">Moving Average Exponential (EMA)</option>
                        <option value="RSI">Relative Strength Index (RSI)</option>
                        <option value="VWAP">Volume Weighted Average Price (VWAP)</option>
                        <option value="MACD">Moving Average Convergence Divergence (MACD)</option>
                        <option value="BB">Bollinger Bands (BB)</option>
                        <option value="ATR">Average True Range (ATR)</option>
                        <option value="FVG">Fair Value Gaps (FVG)</option>
                        <option value="DAILY_LEVELS">Previous Day High & Low</option>
                        <option value="VP">Session Volume Profile (VP)</option>
                    </select>
                </div>

                <div style={{
                    marginBottom: '1.5rem',
                    padding: '0.75rem',
                    background: 'rgba(255, 140, 0, 0.05)',
                    borderLeft: '2px solid var(--accent)',
                    fontSize: '0.8rem',
                    lineHeight: '1.4',
                    color: '#ccc'
                }}>
                    <strong>ABOUT:</strong> {INDICATOR_DESCRIPTIONS[selectedType]}
                </div>

                {(selectedType === 'EMA' || selectedType === 'RSI' || selectedType === 'ATR' || selectedType === 'BB') && (
                    <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label className="micro-label">Length</label>
                        <input
                            type="number"
                            value={length}
                            onChange={e => setLength(parseInt(e.target.value) || 1)}
                            style={{ padding: '0.4rem', background: '#111', border: '1px solid var(--border)', color: 'white', borderRadius: '0', fontFamily: 'monospace' }}
                        />
                    </div>
                )}

                {selectedType === 'BB' && (
                    <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label className="micro-label">StdDev Multiplier</label>
                        <input
                            type="number"
                            step="0.1"
                            value={multiplier}
                            onChange={e => setMultiplier(parseFloat(e.target.value) || 1)}
                            style={{ padding: '0.4rem', background: '#111', border: '1px solid var(--border)', color: 'white', borderRadius: '0', fontFamily: 'monospace' }}
                        />
                    </div>
                )}

                {selectedType === 'VP' && (
                    <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label className="micro-label">Value Area (%)</label>
                        <input
                            type="number"
                            value={multiplier}
                            onChange={e => setMultiplier(parseFloat(e.target.value) || 70)}
                            style={{ padding: '0.4rem', background: '#111', border: '1px solid var(--border)', color: 'white', borderRadius: '0', fontFamily: 'monospace' }}
                        />
                    </div>
                )}

                {selectedType === 'MACD' && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                            <label className="micro-label">Fast Length</label>
                            <input
                                type="number"
                                value={fastLength}
                                onChange={e => setFastLength(parseInt(e.target.value) || 1)}
                                style={{ padding: '0.4rem', background: '#111', border: '1px solid var(--border)', color: 'white', borderRadius: '0', width: '100%', fontFamily: 'monospace' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                            <label className="micro-label">Slow Length</label>
                            <input
                                type="number"
                                value={slowLength}
                                onChange={e => setSlowLength(parseInt(e.target.value) || 1)}
                                style={{ padding: '0.4rem', background: '#111', border: '1px solid var(--border)', color: 'white', borderRadius: '0', width: '100%', fontFamily: 'monospace' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                            <label className="micro-label">Signal</label>
                            <input
                                type="number"
                                value={signalLength}
                                onChange={e => setSignalLength(parseInt(e.target.value) || 1)}
                                style={{ padding: '0.4rem', background: '#111', border: '1px solid var(--border)', color: 'white', borderRadius: '0', width: '100%', fontFamily: 'monospace' }}
                            />
                        </div>
                    </div>
                )}

                <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="micro-label">Base Color</label>
                    <input
                        type="color"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        style={{ width: '100%', height: '30px', padding: '0', background: 'transparent', border: '1px solid var(--border)', cursor: 'pointer' }}
                    />
                </div>

                <button
                    onClick={handleAdd}
                    style={{
                        width: '100%', padding: '0.5rem', background: 'var(--accent)',
                        color: '#000', border: 'none', borderRadius: '0', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.9rem'
                    }}
                >
                    Add to Chart
                </button>
            </div>
        </div>
    );
};
