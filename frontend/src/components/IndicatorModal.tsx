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

export const IndicatorModal: React.FC<IndicatorModalProps> = ({ onAdd, onClose }) => {
    const [selectedType, setSelectedType] = useState<IndicatorConfig['type']>('EMA');

    // Form States
    const [length, setLength] = useState<number>(20);
    const [color, setColor] = useState<string>('#f6c23e');
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
                background: '#1E1E1E', padding: '1.5rem', borderRadius: '8px',
                width: '380px', border: '1px solid #2B2B43', color: '#DDD'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Add Indicator</h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#DDD', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label>Type</label>
                    <select
                        value={selectedType}
                        onChange={e => {
                            const type = e.target.value as IndicatorConfig['type'];
                            setSelectedType(type);
                            if (type === 'EMA') { setLength(20); setColor('#f6c23e'); }
                            if (type === 'RSI') { setLength(14); setColor('#9c27b0'); }
                            if (type === 'VWAP') { setColor('#4e73df'); }
                            if (type === 'MACD') { setFastLength(12); setSlowLength(26); setSignalLength(9); setColor('#2962FF'); }
                            if (type === 'BB') { setLength(20); setMultiplier(2.0); setColor('#2196F3'); }
                            if (type === 'ATR') { setLength(14); setColor('#FF5252'); }
                            if (type === 'FVG') { setColor('#26a69a'); } // uses opacity usually
                            if (type === 'DAILY_LEVELS') { setColor('#ff9800'); } // orange
                            if (type === 'VP') { setColor('#yellow'); setMultiplier(70); } // value area pct
                        }}
                        className="dropdown-select"
                        style={{ width: '100%', padding: '0.5rem', background: '#2B2B43', border: 'none', color: 'white', borderRadius: '4px' }}
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

                {(selectedType === 'EMA' || selectedType === 'RSI' || selectedType === 'ATR' || selectedType === 'BB') && (
                    <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label>Length</label>
                        <input
                            type="number"
                            value={length}
                            onChange={e => setLength(parseInt(e.target.value) || 1)}
                            style={{ padding: '0.5rem', background: '#2B2B43', border: 'none', color: 'white', borderRadius: '4px' }}
                        />
                    </div>
                )}

                {selectedType === 'BB' && (
                    <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label>StdDev Multiplier</label>
                        <input
                            type="number"
                            step="0.1"
                            value={multiplier}
                            onChange={e => setMultiplier(parseFloat(e.target.value) || 1)}
                            style={{ padding: '0.5rem', background: '#2B2B43', border: 'none', color: 'white', borderRadius: '4px' }}
                        />
                    </div>
                )}

                {selectedType === 'VP' && (
                    <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label>Value Area (%)</label>
                        <input
                            type="number"
                            value={multiplier}
                            onChange={e => setMultiplier(parseFloat(e.target.value) || 70)}
                            style={{ padding: '0.5rem', background: '#2B2B43', border: 'none', color: 'white', borderRadius: '4px' }}
                        />
                    </div>
                )}

                {selectedType === 'MACD' && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                            <label>Fast Length</label>
                            <input
                                type="number"
                                value={fastLength}
                                onChange={e => setFastLength(parseInt(e.target.value) || 1)}
                                style={{ padding: '0.5rem', background: '#2B2B43', border: 'none', color: 'white', borderRadius: '4px', width: '100%' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                            <label>Slow Length</label>
                            <input
                                type="number"
                                value={slowLength}
                                onChange={e => setSlowLength(parseInt(e.target.value) || 1)}
                                style={{ padding: '0.5rem', background: '#2B2B43', border: 'none', color: 'white', borderRadius: '4px', width: '100%' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                            <label>Signal</label>
                            <input
                                type="number"
                                value={signalLength}
                                onChange={e => setSignalLength(parseInt(e.target.value) || 1)}
                                style={{ padding: '0.5rem', background: '#2B2B43', border: 'none', color: 'white', borderRadius: '4px', width: '100%' }}
                            />
                        </div>
                    </div>
                )}

                <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label>Base Color</label>
                    <input
                        type="color"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        style={{ width: '100%', height: '40px', padding: '0', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    />
                </div>

                <button
                    onClick={handleAdd}
                    style={{
                        width: '100%', padding: '0.8rem', background: '#26a69a',
                        color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
                    }}
                >
                    Add to Chart
                </button>
            </div>
        </div>
    );
};
