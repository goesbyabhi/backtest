import { useEffect, useState, useRef, useCallback } from 'react';
import './App.css';
import { TradingChart } from './components/TradingChart';
import { StrategyEditor } from './components/StrategyEditor';
import { StockSearch } from './components/StockSearch';
import { Play, Pause, PlayCircle } from 'lucide-react';

const DEFAULT_STRATEGY = `def on_candle(candle, portfolio):
    # Example Strategy: Buy if close > open
    if candle['close'] > candle['open']:
        portfolio.buy(1)
    else:
        portfolio.sell(1)
`;

function App() {
  const [data, setData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [lastCandle, setLastCandle] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const wsRef = useRef<WebSocket | null>(null);

  // New States
  const [symbol, setSymbol] = useState<{ value: string, label: string }>({ value: 'RELIANCE.NS', label: 'RELIANCE.NS - Reliance Industries' });
  const [timeframe, setTimeframe] = useState('1D');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [strategyCode, setStrategyCode] = useState(DEFAULT_STRATEGY);
  const [pnl, setPnl] = useState<number | null>(null);
  const [tradeCount, setTradeCount] = useState<number>(0);
  const [tradeMarkers, setTradeMarkers] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Fetch initial data based on selection
    if (symbol?.value) {
      let url = `http://127.0.0.1:8000/api/historical?symbol=${symbol.value}&timeframe=${timeframe}`;
      if (startDate) url += `&start=${startDate}`;
      if (endDate) url += `&end=${endDate}`;

      fetch(url)
        .then(res => res.json())
        .then(d => {
          if (d.data) {
            setData(d.data.slice(0, d.initialCount || 100));
            setTotalRecords(d.data.length);
            setCurrentIndex((d.initialCount || 100) - 1);
          } else {
            setData(d.slice(0, 100));
            setTotalRecords(d.length);
            setCurrentIndex(99);
          }
          setTradeMarkers([]); // Clear markers on data change
          setPnl(null);
          setTradeCount(0);
        })
        .catch(err => console.error("Error fetching historical data:", err));
    }

    // Initialize WebSocket
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/replay');
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'candle') {
        setLastCandle(msg.data);
        if (msg.currentIndex !== undefined) setCurrentIndex(msg.currentIndex);
      } else if (msg.type === 'sync') {
        setData(msg.data);
        setLastCandle(msg.data[msg.data.length - 1]);
        if (msg.currentIndex !== undefined) setCurrentIndex(msg.currentIndex);
      }
    };
    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [symbol, timeframe, startDate, endDate]);

  const togglePlay = () => {
    if (!wsRef.current) return;
    const newIsPlaying = !isPlaying;
    setIsPlaying(newIsPlaying);
    wsRef.current.send(JSON.stringify({
      action: newIsPlaying ? 'play' : 'pause',
      speed: speed
    }));
  };

  const handleSeek = useCallback((idx: number, time?: number) => {
    if (wsRef.current) {
      setIsPlaying(false);
      wsRef.current.send(JSON.stringify({ action: 'seek', index: idx, time: time }));
    }
  }, []);

  const changeSpeed = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (isPlaying && wsRef.current) {
      wsRef.current.send(JSON.stringify({ action: 'play', speed: newSpeed }));
    }
  };

  const runStrategy = async () => {
    if (!symbol?.value) return;

    setIsRunning(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: strategyCode, symbol: symbol.value })
      });
      const result = await res.json();

      if (result.success) {
        setPnl(result.pnl);
        setTradeCount(result.trades ? result.trades.length : 0);

        // Format markers for Lightweight Charts
        if (result.trades) {
          const markers = result.trades.map((t: any) => ({
            time: t.time,
            position: t.type === 'BUY' ? 'belowBar' : 'aboveBar',
            color: t.type === 'BUY' ? '#26a69a' : '#ef5350',
            shape: t.type === 'BUY' ? 'arrowUp' : 'arrowDown',
            text: t.type + ' @ ₹' + t.price.toFixed(2)
          }));
          // Lightweight charts requires markers to be sorted by time
          markers.sort((a: any, b: any) => a.time - b.time);
          setTradeMarkers(markers);
        }
      } else {
        alert(result.error || "Strategy failed to execute.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to backend.");
    }
    setIsRunning(false);
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Backtest Replay Engine</h1>

        <div className="asset-controls" style={{ display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 100, flexWrap: 'wrap' }}>
          <StockSearch
            value={symbol}
            onChange={(val) => setSymbol(val)}
          />
          <select value={timeframe} onChange={e => setTimeframe(e.target.value)} className="dropdown-select">
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="1h">1h</option>
            <option value="1D">1D</option>
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#ccc', fontSize: '14px' }}>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="dropdown-select"
              style={{ width: '130px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#ccc', fontSize: '14px' }}>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="dropdown-select"
              style={{ width: '130px' }}
            />
          </div>
        </div>

        <div className="controls">
          <button className="control-btn" onClick={togglePlay}>
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <div className="speed-controls">
            <span className="speed-label">Speed:</span>
            {[1, 5, 10, 20].map(s => (
              <button
                key={s}
                className={`speed-btn ${speed === s ? 'active' : ''}`}
                onClick={() => changeSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>

          {data.length > 0 && (
            <div className="seek-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem', flex: 1 }}>
              <span className="speed-label">Seek:</span>
              <input
                type="range"
                min={0}
                max={Math.max(0, totalRecords - 1)}
                value={currentIndex}
                onChange={(e) => {
                  if (wsRef.current) {
                    setIsPlaying(false);
                    const newIndex = parseInt(e.target.value);
                    wsRef.current.send(JSON.stringify({ action: 'seek', index: newIndex }));
                  }
                }}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '12px', color: '#888', minWidth: '80px' }}>
                {lastCandle ? new Date(lastCandle.time * (lastCandle.time > 1e11 ? 1 : 1000)).toLocaleDateString() : '--'}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="main-content">
        <div className="chart-area">
          {data.length > 0 ? (
            <TradingChart
              initialData={data}
              lastCandle={lastCandle}
              markers={tradeMarkers}
              onSeek={handleSeek}
            />
          ) : (
            <div className="loading">Loading chart data...</div>
          )}
        </div>
        <div className="sidebar">
          <div className="sidebar-header">
            <h3>Custom Strategy</h3>
            <button className="run-btn" onClick={runStrategy} disabled={isRunning} style={{ opacity: isRunning ? 0.7 : 1 }}>
              <PlayCircle size={16} /> {isRunning ? 'Running...' : 'Run Backtest'}
            </button>
          </div>
          <StrategyEditor
            code={strategyCode}
            onChange={(val: string | undefined) => setStrategyCode(val || '')}
          />
          <div className="results-panel">
            <h4>Results</h4>
            <div className="metric">
              <span>PnL:</span>
              <span className="value" style={{ color: pnl && pnl > 0 ? '#26a69a' : (pnl && pnl < 0 ? '#ef5350' : 'white') }}>
                {pnl !== null ? `₹${pnl.toFixed(2)}` : '--'}
              </span>
            </div>
            <div className="metric">
              <span>Trades Executed:</span> <span className="value">{tradeCount}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
