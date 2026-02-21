import yfinance as yf
import pandas as pd
from typing import List, Dict, Any

class DataProvider:
    @staticmethod
    def get_historical_data(symbol: str, timeframe: str, start: str = None, end: str = None) -> List[Dict[str, Any]]:
        # Map our frontend timeframes to yfinance intervals
        yf_interval_map = {
            '1m': '1m',
            '5m': '5m',
            '1h': '1h',
            '1D': '1d'
        }
        
        interval = yf_interval_map.get(timeframe, '1d')
        
        # Determine period based on interval to avoid yfinance limits
        # e.g., 1m data is only available for the last 7 days
        period = '1y' 
        if interval == '1m':
            period = '5d'
        elif interval == '5m':
            period = '1mo'
        elif interval == '1h':
            period = '1y'
        elif interval == '1d':
            period = '5y'

        # Ensure Indian stocks have .NS suffix if not provided and not a crypto/US tech stock we know
        if not symbol.endswith('.NS') and not symbol.endswith('.BO'):
            # Simple heuristic for this prototype: if it's not a known US ticker, append .NS
            known_us = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA']
            if symbol not in known_us and not '-' in symbol: # crypto has hyphens like BTC-USD
                symbol = f"{symbol}.NS"
                
        if symbol == 'BTC':
            symbol = 'BTC-USD'

        try:
            ticker = yf.Ticker(symbol)
            
            if start and end:
                df = ticker.history(start=start, end=end, interval=interval)
            else:
                df = ticker.history(period=period, interval=interval)
            
            if df.empty:
                return []
                
            # yfinance returns timezone-aware index sometimes, convert to UTC seconds
            df.reset_index(inplace=True)
            
            # The date column might be named 'Date' or 'Datetime' depending on interval
            date_col = 'Datetime' if 'Datetime' in df.columns else 'Date'
            
            # Convert to dictionary format required by Lightweight Charts
            records = []
            for _, row in df.iterrows():
                # Lightweight charts needs unix timestamp in seconds
                records.append({
                    'time': int(row[date_col].timestamp()),
                    'open': float(row['Open']),
                    'high': float(row['High']),
                    'low': float(row['Low']),
                    'close': float(row['Close']),
                    'volume': float(row['Volume'])
                })
            return records
            
        except Exception as e:
            print(f"Error fetching data for {symbol}: {e}")
            return []

    @staticmethod
    def search_symbols(query: str) -> List[Dict[str, str]]:
        # yfinance doesn't have a great public search endpoint that is officially supported
        # For this prototype, we'll return a static list of popular Indian stocks filtered by query
        popular_indian_stocks = [
            {'symbol': 'RELIANCE.NS', 'name': 'Reliance Industries'},
            {'symbol': 'TCS.NS', 'name': 'Tata Consultancy Services'},
            {'symbol': 'HDFCBANK.NS', 'name': 'HDFC Bank'},
            {'symbol': 'INFY.NS', 'name': 'Infosys'},
            {'symbol': 'ICICIBANK.NS', 'name': 'ICICI Bank'},
            {'symbol': 'HINDUNILVR.NS', 'name': 'Hindustan Unilever'},
            {'symbol': 'ITC.NS', 'name': 'ITC'},
            {'symbol': 'SBIN.NS', 'name': 'State Bank of India'},
            {'symbol': 'BHARTIARTL.NS', 'name': 'Bharti Airtel'},
            {'symbol': 'BAJFINANCE.NS', 'name': 'Bajaj Finance'},
            {'symbol': 'ZOMATO.NS', 'name': 'Zomato Ltd'},
            {'symbol': 'PAYTM.NS', 'name': 'One97 Communications'},
            {'symbol': 'HDFCAMC.NS', 'name': 'HDFC Asset Management'},
            {'symbol': 'TATAMOTORS.NS', 'name': 'Tata Motors'}
        ]
        
        if not query:
            return popular_indian_stocks
            
        q = query.lower()
        results = [
            stock for stock in popular_indian_stocks 
            if q in stock['symbol'].lower() or q in stock['name'].lower()
        ]
        
        # If no local results, just return the query as a potential symbol
        if not results:
            return [{'symbol': query.upper() + '.NS', 'name': query.upper()}]
            
        return results
