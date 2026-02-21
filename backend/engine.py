from typing import Dict, List, Optional
from datetime import datetime

class Portfolio:
    def __init__(self, initial_capital: float, current_symbol: str):
        self.cash = initial_capital
        self.symbol = current_symbol
        self.positions = 0.0
        self.trades = []
        self._current_price = 0.0
        self._current_time = 0
        
    def set_price(self, price: float, timestamp: int):
        self._current_price = price
        self._current_time = timestamp

    def buy(self, qty: float):
        cost = qty * self._current_price
        if self.cash >= cost:
            self.cash -= cost
            self.positions += qty
            self.trades.append({
                'time': self._current_time,
                'type': 'BUY',
                'price': self._current_price,
                'qty': qty
            })

    def sell(self, qty: float):
        if self.positions >= qty:
            revenue = qty * self._current_price
            self.cash += revenue
            self.positions -= qty
            self.trades.append({
                'time': self._current_time,
                'type': 'SELL',
                'price': self._current_price,
                'qty': qty
            })
            
    def get_value(self):
        return self.cash + (self.positions * self._current_price)

class BacktestEngine:
    def __init__(self, initial_capital: float = 10000.0):
        self.initial_capital = initial_capital

    def run_strategy(self, strategy_code: str, data: list[dict], symbol: str) -> dict:
        portfolio = Portfolio(self.initial_capital, symbol)
        
        # Prepare execution environment
        exec_env = {}
        try:
            # Compile and execute the user defined function
            exec(strategy_code, exec_env)
            on_candle = exec_env.get('on_candle')
            
            if not on_candle or not callable(on_candle):
                return {"error": "Strategy must define a function 'on_candle(candle, portfolio)'."}
                
            # Run the strategy loop over historical data
            for candle in data:
                portfolio.set_price(candle['close'], candle['time'])
                on_candle(candle, portfolio)
                
            final_pnl = portfolio.get_value() - self.initial_capital
            return {
                "success": True,
                "pnl": final_pnl,
                "final_value": portfolio.get_value(),
                "trades": portfolio.trades
            }
            
        except Exception as e:
            return {"error": f"Strategy execution failed: {str(e)}"}
