# Trading Charts

This project showcases some Trading Charts in React.

## Features

1. **Candlestick Chart**:  
    - [x] Display candlestick data for BTC-USD across multiple time frames (1m, 5m, 1h, etc.).
1. **Volume Bar Chart**:  
    - [x] Display a bar graph representing the volume traded alongside the candlestick chart.
1. **Bollinger Bands**:  
    - [x] Include Bollinger Bands as an additional indicator on the candlestick chart.
1. **Fibonacci Retracement Tool**:  
    - [x] Add a feature that allows users to draw Fibonacci retracement levels directly on the chart.
1. **Responsive Design**:  
    - [x] Ensure the charting module is responsive and user-friendly across a wide range of screen sizes, from mobile devices to desktops.

## Installation and local setup

1. Clone the repo

    ``` bash
    git clone <github repo link>
    ```

2. Add `.env.local` file and add the following variable (refer [./extra.md](./extra.md)):

    ``` bash
    NEXT_PUBLIC_BINANCE_API=<binance api endpoint>
    ```

3. Install dependencies

    ``` bash
    pnpm install
    ```

4. Start the dev server

    ``` bash
    pnpm run dev
    ```
