from fastapi import FastAPI, WebSocket, Request
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import pandas as pd
import numpy as np
import json
from engine import BacktestEngine
from data_provider import DataProvider

app = FastAPI(title="Backtest Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global storage for simplicity in this prototype
active_data_streams = {}

@app.get("/api/search")
def search_symbols(q: str = ''):
    """Returns a list of matching symbols from the DataProvider."""
    return DataProvider.search_symbols(q)

from typing import Optional

@app.get("/api/historical")
async def get_historical_data(symbol: str = 'RELIANCE.NS', timeframe: str = '1D', start: Optional[str] = None, end: Optional[str] = None):
    """Fetches real historical data using yfinance via DataProvider."""
    # Run synchronous yfinance IO in a threadpool
    loop = asyncio.get_event_loop()
    data = await loop.run_in_executor(None, DataProvider.get_historical_data, symbol, timeframe, start, end)
    
    active_data_streams['current'] = data
    # Return everything to the frontend so it can calculate ranges, but let frontend slice it initially
    return {"data": data, "initialCount": 100}

@app.post("/api/backtest")
async def run_backtest(request: Request):
    payload = await request.json()
    strategy_code = payload.get('code', '')
    symbol = payload.get('symbol', 'AAPL')
    
    data = active_data_streams.get('current', [])
    if not data:
        return {"error": "No data available. Fetch historical data first."}
        
    engine = BacktestEngine(initial_capital=10000.0)
    results = engine.run_strategy(strategy_code, data, symbol)
    return results

@app.websocket("/ws/replay")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    current_index = 100
    
    try:
        data_records = active_data_streams.get('current', [])
        total_records = len(data_records)
        
        playing = False
        speed = 1.0
        
        while True:
            # Check for new messages without blocking forever if we are playing
            try:
                # If playing, only wait for a short time before sending the next candle.
                # If not playing, wait indefinitely for a 'play' command.
                timeout = (1.0 / speed) if playing else None
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=timeout)
                cmd = json.loads(msg)
                
                if cmd.get('action') == 'play':
                    playing = True
                    speed = float(cmd.get('speed', 1))
                elif cmd.get('action') == 'pause':
                    playing = False
                elif cmd.get('action') == 'seek':
                    playing = False
                    data_records = active_data_streams.get('current', [])
                    total_records = len(data_records)
                    
                    if 'time' in cmd:
                        target_time = float(cmd['time'])
                        # Find index where time matches
                        new_idx = next((i for i, d in enumerate(data_records) if d['time'] >= target_time), current_index)
                    else:
                        new_idx = int(cmd.get('index', current_index))
                    
                    current_index = max(0, min(new_idx, total_records - 1))
                    
                    # Instead of just waiting, send bulk data immediately to resync the chart
                    await websocket.send_text(json.dumps({
                        "type": "sync",
                        "data": data_records[:current_index + 1],
                        "currentIndex": current_index
                    }))
                    
            except asyncio.TimeoutError:
                # Timeout means no new message arrived, which is expected while playing.
                pass
            
            # Send next candle if playing
            if playing:
                data_records = active_data_streams.get('current', [])
                total_records = len(data_records)
                
                if current_index < total_records:
                    await websocket.send_text(json.dumps({
                        "type": "candle",
                        "data": data_records[current_index],
                        "currentIndex": current_index
                    }))
                    current_index += 1
                else:
                    playing = False # End of replay
    except Exception as e:
        print("WebSocket disconnected")
