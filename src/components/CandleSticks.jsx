import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { createChart } from "lightweight-charts";
import { calculateBollingerBands } from "@/utils";
import { RectangleDrawingTool } from "@/plugins/rectangle-drawing-tool/rectangle-drawing-tool-test";

const UPCOLOR = "#089981";
const DOWNCOLOR = "#F23645";

const CandleSticks = ({ data }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const [currentOHLC, setCurrentOHLC] = useState(null);
  const [defaultOHLC, setDefaultOHLC] = useState(null);
  const bollingerBandsRef = useRef(null);
  const [showBollingerBands, setShowBollingerBands] = useState(true);
  const recBtnRef = useRef();

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

      // get bollinger bands
      const bollingerBandsData = calculateBollingerBands(data);

      // set bollinger bands to series
      const upperBandSeries = chart.addLineSeries({
        color: "rgba(0, 128, 255, 0.6)",
        lineWidth: 1,
        lastPriceAnimation: 1,
      });

      const middleBandSeries = chart.addLineSeries({
        color: "rgba(128, 128, 128, 0.7)",
        lineWidth: 1,
        lastPriceAnimation: 1,
      });

      const lowerBandSeries = chart.addLineSeries({
        color: "rgba(0, 128, 255, 0.6)",
        lineWidth: 1,
        lastPriceAnimation: 1,
      });

      // set data for bollinger bands
      // (filtering out null values was
      // necessary for it to draw the charts without error)
      upperBandSeries.setData(
        bollingerBandsData
          .filter((d) => d.upper !== null)
          .map((d) => ({ time: d.time, value: d.upper }))
      );

      middleBandSeries.setData(
        bollingerBandsData
          .filter((d) => d.middle !== null)
          .map((d) => ({ time: d.time, value: d.middle }))
      );

      lowerBandSeries.setData(
        bollingerBandsData
          .filter((d) => d.lower !== null)
          .map((d) => ({ time: d.time, value: d.lower }))
      );

      // set ref to the band series
      bollingerBandsRef.current = [
        upperBandSeries,
        middleBandSeries,
        lowerBandSeries,
      ];

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

      // use RectangleDrawingTool
      if (recBtnRef.current ) {
        new RectangleDrawingTool(chart, candlestickSeries, recBtnRef.current);
      }

      return () => {
        window.removeEventListener("resize", handleResize);
        chart.remove();
      };
    }
  }, [data]);

  // visibility of bollinger bands
  useEffect(() => {
    if (bollingerBandsRef.current) {
      bollingerBandsRef.current.forEach((series) => {
        series.applyOptions({
          visible: showBollingerBands,
        });
      });
    }
  }, [showBollingerBands]);

  // resets the view of chart
  const resetView = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  const toggleBollingerBands = () => {
    setShowBollingerBands((prev) => !prev);
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
      <div
        className="absolute top-16 sm:top-14 left-2 flex gap-2 p-1 rounded-sm z-10 bg-zinc-200"
        id="toolbar"
      >
        <button ref={recBtnRef} className="aspect-square"></button>
        <button
          onClick={resetView}
          className="candles-reset  bg-slate-700 hover:bg-slate-600 text-white p-1 rounded z-10"
          title="Reset View"
        >
          <Icon icon="mdi:refresh" className="w-4 h-4" />
        </button>
        <button
          onClick={toggleBollingerBands}
          className={`right-10 p-1 rounded z-10 ${
            showBollingerBands
              ? "bg-blue-500 hover:bg-blue-600"
              : "bg-slate-700 hover:bg-slate-600"
          } text-white`}
          title="Toggle Bollinger Bands"
        >
          <Icon icon="iconoir:spiral" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CandleSticks;
