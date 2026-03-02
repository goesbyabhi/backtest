import yfinance as yf
import pandas as pd
import numpy as np
from typing import List, Dict, Any

class DataProvider:
    @staticmethod
    def get_historical_data(symbol: str, timeframe: str, start: str = None, end: str = None, indicators_json: str = None) -> List[Dict[str, Any]]:
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
            
            # Calculate Indicators dynamically
            indicator_keys = []
            if indicators_json:
                try:
                    import json
                    indicators = json.loads(indicators_json)
                    for ind in indicators:
                        ind_id = ind.get('id')
                        ind_type = ind.get('type')
                        params = ind.get('params', {})
                        
                        if ind_type == 'EMA':
                            indicator_keys.append(ind_id)
                            length = int(params.get('length', 20))
                            df[ind_id] = df['Close'].ewm(span=length, adjust=False).mean()
                        elif ind_type == 'RSI':
                            indicator_keys.append(ind_id)
                            length = int(params.get('length', 14))
                            delta = df['Close'].diff()
                            gain = (delta.where(delta > 0, 0)).rolling(window=length).mean()
                            loss = (-delta.where(delta < 0, 0)).rolling(window=length).mean()
                            rs = gain / loss
                            df[ind_id] = 100 - (100 / (1 + rs))
                        elif ind_type == 'VWAP':
                            indicator_keys.append(ind_id)
                            if 'Typical_Price' not in df.columns:
                                df['Typical_Price'] = (df['High'] + df['Low'] + df['Close']) / 3
                                df['Typical_Volume'] = df['Typical_Price'] * df['Volume']
                            
                            if interval in ['1m', '5m', '1h']:
                                if 'Date_Only' not in df.columns:
                                    df['Date_Only'] = df[date_col].dt.date
                                    df['Day_Typical_Vol'] = df.groupby('Date_Only')['Typical_Volume'].cumsum()
                                    df['Day_Vol'] = df.groupby('Date_Only')['Volume'].cumsum()
                                df[ind_id] = df['Day_Typical_Vol'] / df['Day_Vol']
                            else:
                                if 'Cum_Typical_Vol' not in df.columns:
                                    df['Cum_Typical_Vol'] = df['Typical_Volume'].cumsum()
                                    df['Cum_Vol'] = df['Volume'].cumsum()
                                df[ind_id] = df['Cum_Typical_Vol'] / df['Cum_Vol']
                        elif ind_type == 'MACD':
                            indicator_keys.extend([f"{ind_id}_macd", f"{ind_id}_signal", f"{ind_id}_hist"])
                            fast = int(params.get('fast', 12))
                            slow = int(params.get('slow', 26))
                            signal = int(params.get('signal', 9))
                            
                            ema_fast = df['Close'].ewm(span=fast, adjust=False).mean()
                            ema_slow = df['Close'].ewm(span=slow, adjust=False).mean()
                            macd_line = ema_fast - ema_slow
                            signal_line = macd_line.ewm(span=signal, adjust=False).mean()
                            macd_hist = macd_line - signal_line
                            
                            df[f"{ind_id}_macd"] = macd_line
                            df[f"{ind_id}_signal"] = signal_line
                            df[f"{ind_id}_hist"] = macd_hist
                            # We can return complex indicator as a dict, or distinct columns.
                            # The frontend expects a single value per ind_id to plot simply,
                            # but for MACD we have 3 lines. We will store them in 3 columns
                            # and modify the backend loop below to extract them into a nested object
                        elif ind_type == 'BB':
                            indicator_keys.extend([f"{ind_id}_upper", f"{ind_id}_middle", f"{ind_id}_lower"])
                            length = int(params.get('length', 20))
                            mult = float(params.get('multiplier', 2.0))
                            
                            sma = df['Close'].rolling(window=length).mean()
                            std = df['Close'].rolling(window=length).std()
                            
                            df[f"{ind_id}_upper"] = sma + (std * mult)
                            df[f"{ind_id}_middle"] = sma
                            df[f"{ind_id}_lower"] = sma - (std * mult)
                        elif ind_type == 'ATR':
                            indicator_keys.append(ind_id)
                            length = int(params.get('length', 14))
                            high_low = df['High'] - df['Low']
                            high_close = (df['High'] - df['Close'].shift()).abs()
                            low_close = (df['Low'] - df['Close'].shift()).abs()
                            
                            ranges = pd.concat([high_low, high_close, low_close], axis=1)
                            true_range = np.max(ranges, axis=1)
                            df[ind_id] = true_range.rolling(window=length).mean()
                        elif ind_type == 'FVG':
                            indicator_keys.extend([f"{ind_id}_bull", f"{ind_id}_bear", f"{ind_id}_top", f"{ind_id}_bottom"])
                            # Fair Value Gap: 
                            # Bullish FVG: Low of candle 3 > High of candle 1
                            # Bearish FVG: High of candle 3 < Low of candle 1
                            df[f"{ind_id}_bull"] = (df['Low'] > df['High'].shift(2)) & (df['Close'].shift(1) > df['Open'].shift(1))
                            df[f"{ind_id}_bear"] = (df['High'] < df['Low'].shift(2)) & (df['Close'].shift(1) < df['Open'].shift(1))
                            
                            # calculate FVG box top and bottom
                            df[f"{ind_id}_top"] = np.where(df[f"{ind_id}_bear"], df['Low'].shift(2), np.where(df[f"{ind_id}_bull"], df['Low'], np.nan))
                            df[f"{ind_id}_bottom"] = np.where(df[f"{ind_id}_bear"], df['High'], np.where(df[f"{ind_id}_bull"], df['High'].shift(2), np.nan))
                        elif ind_type == 'DAILY_LEVELS':
                            indicator_keys.extend([f"{ind_id}_prev_high", f"{ind_id}_prev_low"])
                            # Get real previous day H/L
                            if 'Date_Only' not in df.columns:
                                df['Date_Only'] = df[date_col].dt.date
                                
                            daily_highs = df.groupby('Date_Only')['High'].max().shift(1)
                            daily_lows = df.groupby('Date_Only')['Low'].min().shift(1)
                            
                            # Join back to intraday
                            df = df.merge(daily_highs.rename(f"{ind_id}_prev_high"), on='Date_Only', how='left')
                            df = df.merge(daily_lows.rename(f"{ind_id}_prev_low"), on='Date_Only', how='left')
                            
                        elif ind_type == 'VP':
                            indicator_keys.extend([f"{ind_id}_poc", f"{ind_id}_vah", f"{ind_id}_val", f"{ind_id}_profile"])
                            value_area_pct = float(params.get('value_area', 70)) / 100.0
                            
                            if 'Date_Only' not in df.columns:
                                df['Date_Only'] = df[date_col].dt.date
                                
                            vp_results = []
                            for date, group in df.groupby('Date_Only'):
                                session_high = group['High'].max()
                                session_low = group['Low'].min()
                                
                                if pd.isna(session_high) or pd.isna(session_low) or session_high == session_low:
                                    vp_results.append({
                                        'Date_Only': date,
                                        f"{ind_id}_poc": session_high,
                                        f"{ind_id}_vah": session_high,
                                        f"{ind_id}_val": session_low,
                                        f"{ind_id}_profile": "[]"
                                    })
                                    continue
                                    
                                num_bins = 50
                                bins = np.linspace(session_low, session_high, num_bins + 1)
                                bin_centers = (bins[:-1] + bins[1:]) / 2
                                volume_profile = np.zeros(num_bins)
                                
                                for _, row in group.iterrows():
                                    v = row['Volume']
                                    if pd.isna(v) or v == 0:
                                        continue
                                    h = row['High']
                                    l = row['Low']
                                    
                                    if h == l:
                                        idx = np.searchsorted(bins, h) - 1
                                        idx = max(0, min(num_bins - 1, idx))
                                        volume_profile[idx] += v
                                    else:
                                        vol_per_price = v / (h - l)
                                        # Distribute volume uniformly across overlapping bins
                                        overlapping_bins = (bins[:-1] < h) & (bins[1:] > l)
                                        for i, overlaps in enumerate(overlapping_bins):
                                            if overlaps:
                                                overlap_low = max(bins[i], l)
                                                overlap_high = min(bins[i+1], h)
                                                volume_profile[i] += vol_per_price * (overlap_high - overlap_low)
                                                
                                poc_idx = int(np.argmax(volume_profile))
                                poc_price = bin_centers[poc_idx]
                                
                                total_vol = np.sum(volume_profile)
                                target_vol = total_vol * value_area_pct
                                
                                va_vol = volume_profile[poc_idx]
                                lower_idx = poc_idx
                                upper_idx = poc_idx
                                
                                while va_vol < target_vol and (lower_idx > 0 or upper_idx < num_bins - 1):
                                    vol_down = volume_profile[lower_idx - 1] if lower_idx > 0 else 0
                                    vol_up = volume_profile[upper_idx + 1] if upper_idx < num_bins - 1 else 0
                                    
                                    if vol_down > vol_up:
                                        lower_idx -= 1
                                        va_vol += vol_down
                                    elif vol_up > vol_down:
                                        upper_idx += 1
                                        va_vol += vol_up
                                    else:
                                        if lower_idx > 0:
                                            lower_idx -= 1
                                            va_vol += volume_profile[lower_idx]
                                        elif upper_idx < num_bins - 1:
                                            upper_idx += 1
                                            va_vol += volume_profile[upper_idx]
                                
                                vah_price = bins[upper_idx + 1]
                                val_price = bins[lower_idx]
                                
                                # Serialize full geometric profile
                                profile_data = []
                                for i in range(num_bins):
                                    if volume_profile[i] > 0:
                                        profile_data.append({
                                            "price": float(bin_centers[i]),
                                            "vol": float(volume_profile[i]),
                                            "low_bound": float(bins[i]),
                                            "high_bound": float(bins[i+1]),
                                            "in_va": bool(lower_idx <= i <= upper_idx)
                                        })
                                        
                                vp_results.append({
                                    'Date_Only': date,
                                    f"{ind_id}_poc": float(poc_price),
                                    f"{ind_id}_vah": float(vah_price),
                                    f"{ind_id}_val": float(val_price),
                                    f"{ind_id}_profile": json.dumps(profile_data)
                                })
                                
                            vp_df = pd.DataFrame(vp_results)
                            df = df.merge(vp_df, on='Date_Only', how='left')
                except Exception as e:
                    print(f"Error parsing/calculating indicators: {e}")

            
            # Fill NaN with None for JSON serialization
            df = df.replace({float('nan'): None})

            # Convert to dictionary format required by Lightweight Charts
            records = []
            for _, row in df.iterrows():
                # Lightweight charts needs unix timestamp in seconds
                record = {
                    'time': int(row[date_col].timestamp()),
                    'open': float(row['Open']),
                    'high': float(row['High']),
                    'low': float(row['Low']),
                    'close': float(row['Close']),
                    'volume': float(row['Volume'])
                }
                for key in indicator_keys:
                    if key in row and row[key] is not None:
                        if isinstance(row[key], str):
                            record[key] = row[key]
                        else:
                            record[key] = float(row[key])
                    else:
                        record[key] = None
                        
                records.append(record)
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
