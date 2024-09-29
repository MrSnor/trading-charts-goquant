import { Icon } from "@iconify/react";
import { createChart } from "lightweight-charts";
import { useEffect, useRef } from "react";

// function to get the data point at the crosshair position (from https://tradingview.github.io/lightweight-charts/tutorials/how_to/set-crosshair-position)
function getCrosshairDataPoint(series, param) {
  if (!param.time) {
    return null;
  }
  const dataPoint = param.seriesData.get(series);
  return dataPoint || null;
}

// function to sync the crosshair position of both charts
function syncCrosshair(chart, series, dataPoint) {
  if (dataPoint) {
    chart.setCrosshairPosition(dataPoint.value, dataPoint.time, series);
    return;
  }
  chart.clearCrosshairPosition();
}

const CombinedChart = ({ candleData, volumeData }) => {
  const chartRef1 = useRef(null);
  const chartRef2 = useRef(null);
  const containerRef = useRef(null);

  const CANDLE_UPCOLOR = "#089981";
  const CANDLE_DOWNCOLOR = "#F23645";
  const VOLUME_UPCOLOR = "#82CBBF";
  const VOLUME_DOWNCOLOR = "#F89AA2";

  useEffect(() => {
    // function to handle resizing of both charts with
    // respect to the container
    const handleResize = () => {
      if (chartRef1.current && chartRef2.current) {
        chartRef1.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
        chartRef2.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };

    if (
      !containerRef.current ||
      candleData.length === 0 ||
      volumeData.length === 0
    )
      return;

    // create the top chart
    const chart1 = createChart(containerRef.current, {
      height: 250,
      crosshair: {
        mode: 0,
      },
      layout: {
        background: { type: "solid", color: "white" },
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

    // add candlestick series to top chart
    const candleSeries = chart1.addCandlestickSeries({
      upColor: CANDLE_UPCOLOR,
      downColor: CANDLE_DOWNCOLOR,
      borderUpColor: CANDLE_UPCOLOR,
      borderDownColor: CANDLE_DOWNCOLOR,
      wickUpColor: CANDLE_UPCOLOR,
      wickDownColor: CANDLE_DOWNCOLOR,
      priceFormat: {
        // this is a workaround for aligning the price scale (or y axis) of both charts
        precision: 1,
        type: "price",
        // formatter works only for "custom" type
        // formatter: (price) => {
        //   return price.toFixed(1);
        // },
      },
    });

    // set data for candlestick series
    candleSeries.setData(candleData);

    // create the bottom chart
    const chart2 = createChart(containerRef.current, {
      height: 150,
      layout: {
        background: { type: "solid", color: "white" },
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
      rightPriceScale: {
        scaleMargins: {
          bottom: 0,
        },
      },
    });

    // add histogram series to bottom chart
    const volumeSeries = chart2.addHistogramSeries({
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "right",
    });

    // set data for histogram series
    volumeSeries.setData(
      volumeData.map((d) => ({
        time: d[0] / 1000,
        value: d[1],
        color:
          candleData[volumeData.indexOf(d)].close >=
          candleData[volumeData.indexOf(d)].open
            ? VOLUME_UPCOLOR
            : VOLUME_DOWNCOLOR,
      }))
    );

    // sync the visible time range of both charts
    chart1.timeScale().subscribeVisibleLogicalRangeChange((timeRange) => {
      chart2.timeScale().setVisibleLogicalRange(timeRange);
    });

    chart2.timeScale().subscribeVisibleLogicalRangeChange((timeRange) => {
      chart1.timeScale().setVisibleLogicalRange(timeRange);
    });

    // sync the crosshair position of both charts (from https://tradingview.github.io/lightweight-charts/tutorials/how_to/set-crosshair-position)
    chart1.subscribeCrosshairMove((param) => {
      const dataPoint = getCrosshairDataPoint(candleSeries, param);
      syncCrosshair(chart2, volumeSeries, dataPoint);
    });

    chart2.subscribeCrosshairMove((param) => {
      const dataPoint = getCrosshairDataPoint(volumeSeries, param);
      syncCrosshair(chart1, candleSeries, dataPoint);
    });

    // store the chart refs
    chartRef1.current = chart1;
    chartRef2.current = chart2;

    // fit the content of both charts
    chart1.timeScale().fitContent();
    chart2.timeScale().fitContent();

    window.addEventListener("resize", handleResize);
    handleResize();

    // cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      chart1.remove();
      chart2.remove();
    };
  }, [candleData, volumeData]);

  // function to reset the view of both charts
  const resetView = () => {
    if (chartRef1.current && chartRef2.current) {
      chartRef1.current.timeScale().fitContent();
      chartRef2.current.timeScale().fitContent();
    }
  };

  return (
    <div className="w-full relative">
      <div
        ref={containerRef}
        className="w-full border border-slate-300 rounded-sm overflow-hidden cursor-pointer"
      />
      <button
        onClick={resetView}
        className="synced-reset absolute top-2 left-2 bg-slate-700 hover:bg-slate-600 text-white p-1 rounded z-10"
      >
        <Icon icon="mdi:refresh" className="w-4 h-4" />
      </button>
    </div>
  );
};

export default CombinedChart;
