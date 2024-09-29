import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { createChart } from "lightweight-charts";

const UPCOLOR = "#089981";
const DOWNCOLOR = "#F23645";

const CandleSticks = ({ data }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const [currentOHLC, setCurrentOHLC] = useState(null);
  const [defaultOHLC, setDefaultOHLC] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    if (data.length > 0 && chartContainerRef.current) {
      // initialize chart
      const chart = createChart(chartContainerRef.current, {
        height: 300,
        layout: {
          fontFamily: "system-ui, sans-serif",
          background: { type: "solid", color: "white" },
        },
        crosshair: {
          mode: 1,
          background: { type: "solid", color: "rgba(30, 41, 59, 0.4)" },
          textColor: "#d1d5db",
        },
        grid: {
          vertLines: { color: "rgba(51, 65, 85, 0.1)" },
          horzLines: { color: "rgba(51, 65, 85, 0.1)" },
        },
        timeScale: {
          borderColor: "#334155",
          timeVisible: true,
          secondsVisible: false,
        },
      });

      // initialize candle stick series
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: UPCOLOR,
        downColor: DOWNCOLOR,
        borderUpColor: UPCOLOR,
        borderDownColor: DOWNCOLOR,
        wickUpColor: UPCOLOR,
        wickDownColor: DOWNCOLOR,
      });

      // set candle stick data
      candlestickSeries.setData(data);

      // get recent most data value
      const lastDataPoint = data[data.length - 1];
      setDefaultOHLC(lastDataPoint);
      setCurrentOHLC(lastDataPoint);

      // update OHLC values on cursor move
      chart.subscribeCrosshairMove((param) => {
        if (param.point) {
          const dataPoint = param.seriesData.get(candlestickSeries);
          if (dataPoint) {
            setCurrentOHLC(dataPoint);
          }
        } else {
          setCurrentOHLC(defaultOHLC);
        }
      });

      // set ref to the chart
      chartRef.current = chart;

      // set view to show the complete timeline
      chart.timeScale().fitContent();

      window.addEventListener("resize", handleResize);
      handleResize();

      return () => {
        window.removeEventListener("resize", handleResize);
        chart.remove();
      };
    }
  }, [data]);

  // resets the view of chart
  const resetView = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  // OHLC color such that it gets the
  // default color when cursor moves out
  const getOHLCColor = () => {
    const ohlc = currentOHLC || defaultOHLC;
    if (ohlc) {
      return ohlc.close >= ohlc.open ? UPCOLOR : DOWNCOLOR;
    }
    return "white";
  };

  const displayOHLC = currentOHLC || defaultOHLC;

  return (
    <div className="w-full relative">
      {displayOHLC && (
        <div
          className="mb-2 bg-slate-800 p-2 rounded text-xs sm:text-sm md:text-base z-10 flex flex-wrap justify-between w-full"
          style={{ color: getOHLCColor() }}
        >
          <span className="w-1/2 sm:w-auto">
            O: {displayOHLC.open.toFixed(2)}
          </span>
          <span className="w-1/2 sm:w-auto">
            H: {displayOHLC.high.toFixed(2)}
          </span>
          <span className="w-1/2 sm:w-auto">
            L: {displayOHLC.low.toFixed(2)}
          </span>
          <span className="w-1/2 sm:w-auto">
            C: {displayOHLC.close.toFixed(2)}
          </span>
        </div>
      )}
      <div
        ref={chartContainerRef}
        className="w-full border border-slate-300 rounded-sm overflow-hidden cursor-pointer"
      />
      <button
        onClick={resetView}
        className="candles-reset absolute top-16 sm:top-14 left-2 bg-slate-700 hover:bg-slate-600 text-white p-1 rounded z-10"
      >
        <Icon icon="mdi:refresh" className="w-4 h-4" />
      </button>
    </div>
  );
};

export default CandleSticks;
