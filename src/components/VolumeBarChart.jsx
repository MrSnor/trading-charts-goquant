import { Transition } from "@headlessui/react";
import { Icon } from "@iconify/react";
import { createChart } from "lightweight-charts";
import React, { useEffect, useRef } from "react";

const UPCOLOR = "#089981";
const DOWNCOLOR = "#F23645";

function VolumeBarChart({ data, priceData }) {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);

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
        height: 150,
        layout: {
          fontFamily: "system-ui, sans-serif",
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
          visible: true,
          borderColor: "#334155",
          scaleMargins: {
            top: 0.1,
            bottom: 0,
          },
        },
      });

      // initialize histogram series
      const volumeSeries = chart.addHistogramSeries({
        priceFormat: {
          type: "volume",
        },
        priceScaleId: "right",
      });

      const volumeData = data.map((item, index) => {
        const price = priceData[index].close;
        const prevPrice = index > 0 ? priceData[index - 1].close : price;
        return {
          time: item[0] / 1000,
          value: item[1],
          color: price >= prevPrice ? UPCOLOR : DOWNCOLOR,
        };
      });

      // set volume series data
      volumeSeries.setData(volumeData);

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
  }, [data, priceData]);

  // resets the view of chart
  const resetView = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  return (
    <div className="w-full relative">
      <div
        ref={chartContainerRef}
        className="w-full border border-slate-300 rounded-sm overflow-hidden cursor-pointer"
      />
      <button
        onClick={resetView}
        className="volume-reset absolute top-2 left-2 bg-slate-700 hover:bg-slate-600 text-white p-1 rounded z-10"
        title="Reset View"
      >
        <Icon icon="mdi:refresh" className="w-4 h-4" />
      </button>
    </div>
  );
}

export default VolumeBarChart;
