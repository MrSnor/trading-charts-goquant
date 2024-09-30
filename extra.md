# Resources

## Binance API usage

- <https://binance-docs.github.io/apidocs/spot/en/#kline-candlestick-data>

- Base URL - <https://api.binance.com/api/v3/klines>

- <https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=30>

response structure -

```json
[
  [
    1499040000000,      // Kline open time
    "0.01634790",       // Open price
    "0.80000000",       // High price
    "0.01575800",       // Low price
    "0.01577100",       // Close price
    "148976.11427815",  // Volume
    1499644799999,      // Kline Close time
    "2434.19055334",    // Quote asset volume
    308,                // Number of trades
    "1756.87402397",    // Taker buy base asset volume
    "28.46694368",      // Taker buy quote asset volume
    "0"                 // Unused field, ignore.
  ]
]
```

## Bollinger Bands

show the volatility of a stock based on Standard Deviation around a Simple Moving Average. The bands widen when volatility increases and narrow when volatility decreases.

Calculation

Bollinger Bands have 3 lines. The middle line is just the Simple Moving Average.

The Upper is calculated as SMA + (Standard Deviation * Number of Deviations).

The Lower is calculated as SMA - (Standard Deviation * Number of Deviations).

The default Period for the SMA and SD is 20 and the default Number of Deviations is 2.

- Base URL - <https://api.binance.com/api/v3/klines>

## Fibonacci Retracement

A Fibonacci retracement tool is a technical analysis tool that helps traders identify potential support and resistance levels in an asset's price action. It works by drawing horizontal lines on a chart based on the Fibonacci sequence of numbers:

- Draw a trend line: Connect two extreme points on a chart with a trend line.

- Divide the vertical distance: Divide the vertical distance between the two points by the Fibonacci ratios of 23.6%, 38.2%, 50%, 61.8%, and 100%.
- Draw horizontal lines: Draw horizontal lines at each of the Fibonacci levels to indicate potential support and resistance levels.
