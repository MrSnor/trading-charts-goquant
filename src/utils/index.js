// function is made by referring to
// https://www.profitspi.com/stock/view.aspx?v=stock-chart&uv=100519&p=AAPL#&&vs=638632165404819105
// Calculates Bollinger Bands for a given dataset using the
// specified period and deviations.
export function calculateBollingerBands(data, period = 20, deviations = 2) {
    // Calculates the Simple Moving Average (SMA) for the given dataset.
    const sma = data.map((_, index, array) => {
      if (index < period - 1) return null;
  
      const slice = array.slice(index - period + 1, index + 1);
      const sum = slice.reduce((acc, val) => acc + val.close, 0);
      return sum / period;
    });
  
    // Calculates the Standard Deviation for the given dataset.
    const stdDev = data.map((_, index, array) => {
      if (index < period - 1) return null;
  
      const slice = array.slice(index - period + 1, index + 1);
      const mean = sma[index];
      const squaredDiffs = slice.map((val) => Math.pow(val.close - mean, 2));
      const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / period;
  
      return Math.sqrt(variance);
    });
  
    return data.map((candle, index) => {
      if (index < period - 1)
        return { ...candle, upper: null, middle: null, lower: null };
  
      const middle = sma[index];
      const upper = middle + stdDev[index] * deviations;
      const lower = middle - stdDev[index] * deviations;
  
      return { ...candle, upper, middle, lower };
    });
  }