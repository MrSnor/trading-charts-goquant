import { IChartApi, ISeriesApi, SeriesType } from "lightweight-charts";
import React, { useEffect, useRef } from "react";
import {
  RectangleDrawingTool,
  RectangleDrawingToolOptions,
} from "./rectangle-drawing-tool-test";

interface RectangleDrawingToolProps {
  chart: IChartApi;
  series: ISeriesApi<SeriesType>;
  options?: Partial<RectangleDrawingToolOptions>;
}

const FibonacciTool: React.FC<RectangleDrawingToolProps> = ({
  chart,
  series,
  options,
}) => {
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const drawingToolRef = useRef<RectangleDrawingTool | null>(null);

  useEffect(() => {
    if (!chart || !series || !toolbarRef.current) return;

    // Create an instance of RectangleDrawingTool
    drawingToolRef.current = new RectangleDrawingTool(
      chart,
      series,
      toolbarRef.current,
      options || {}
    );

    // Cleanup function to remove the tool and its event listeners
    return () => {
      drawingToolRef.current?.remove();
      drawingToolRef.current = null;

      if (toolbarRef.current && toolbarRef.current.innerHTML) {
        toolbarRef.current.innerHTML = "";
      }
    };
  }, [chart, series, options]);

  return (
    <div ref={toolbarRef} className="flex justify-center items-center gap-1">
      {/* The toolbar will be populated by the RectangleDrawingTool instance */}
    </div>
  );
};

export default FibonacciTool;
