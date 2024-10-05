import {
  BitmapCoordinatesRenderingScope,
  CanvasRenderingTarget2D,
} from "fancy-canvas";
import {
  Coordinate,
  IChartApi,
  isBusinessDay,
  ISeriesApi,
  ISeriesPrimitiveAxisView,
  ISeriesPrimitivePaneRenderer,
  ISeriesPrimitivePaneView,
  MouseEventParams,
  SeriesPrimitivePaneViewZOrder,
  SeriesType,
  Time,
} from "lightweight-charts";
import { ensureDefined } from "../../helpers/assertions";
import { PluginBase } from "../plugin-base";
import { positionsBox } from "../../helpers/dimensions/positions";

class RectanglePaneRenderer implements ISeriesPrimitivePaneRenderer {
  _p1: ViewPoint;
  _p2: ViewPoint;
  _fillColor: string;
  _isDragging: boolean;
  _isSelected: boolean;

  constructor(
    p1: ViewPoint,
    p2: ViewPoint,
    fillColor: string,
    isDragging: boolean,
    isSelected: boolean
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._fillColor = fillColor;
    this._isDragging = isDragging;
    this._isSelected = isSelected;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace((scope) => {
      if (
        this._p1.x === null ||
        this._p1.y === null ||
        this._p2.x === null ||
        this._p2.y === null
      )
        return;

      const ctx = scope.context;

      const horizontalPositions = positionsBox(
        this._p1.x,
        this._p2.x,
        scope.horizontalPixelRatio
      );
      const verticalPositions = positionsBox(
        this._p1.y,
        this._p2.y,
        scope.verticalPixelRatio
      );

      const verticalDistance = Math.abs(verticalPositions.length);

      const fibonacciRatios = [0, 0.236, 0.382, 0.5, 0.618, 1.0];
      const fillColors = [
        "rgba(255, 99, 71, 0.5)",
        "rgba(60, 179, 113, 0.5)",
        "rgba(30, 144, 255, 0.5)",
        "rgba(255, 165, 0, 0.5)",
        "rgba(128, 0, 128, 0.5)",
      ];

      ctx.lineWidth = 1.5;

      // Calculate price values based on Fibonacci ratios
      // (reverse the price values array, as the rectangle is drawn from top (index = 0) to bottom (index = 5 or length - 1))
      const priceValues = fibonacciRatios
        .map((ratio) => {
          const priceDiff = Math.abs(this._p1.priceValue - this._p2.priceValue);
          return (
            priceDiff * ratio +
            Math.min(this._p1.priceValue, this._p2.priceValue)
          );
        })
        .reverse();

      // Calculate position values based on Fibonacci ratios
      const positionValues = fibonacciRatios.map((ratio) => {
        return verticalPositions.position + verticalDistance * ratio;
      });

      // draw a dashed line connecting the 2 corner points (left bottom and right top)
      // Note - adding vertical distance moves the point down and
      //        adding horizontal distance moves the point right
      ctx.setLineDash([15, 5]);
      ctx.beginPath();
      ctx.moveTo(
        this._p1.x * scope.horizontalPixelRatio,
        this._p1.y * scope.verticalPixelRatio
      );
      ctx.lineTo(
        this._p2.x * scope.horizontalPixelRatio,
        this._p2.y * scope.verticalPixelRatio
      );
      ctx.stroke();
      ctx.closePath();
      ctx.setLineDash([]);

      // Create rectangles and fill them with colors
      for (let i = 0; i < fibonacciRatios.length; i++) {
        const ratio = fibonacciRatios[i];
        const yPosition = verticalPositions.position + verticalDistance * ratio;

        ctx.fillStyle = fillColors[i];

        const nextYPosition =
          i < fibonacciRatios.length - 1
            ? verticalPositions.position +
              verticalDistance * fibonacciRatios[i + 1]
            : verticalPositions.position + verticalDistance;

        ctx.fillRect(
          horizontalPositions.position,
          yPosition,
          horizontalPositions.length,
          nextYPosition - yPosition
        );
      }

      // Create dividers with different colors
      fibonacciRatios.forEach((ratio, index) => {
        const yPosition = verticalPositions.position + verticalDistance * ratio;

        const originalColor = fillColors[index];
        const darkenedColor = darkenRgbaColor(originalColor);

        ctx.strokeStyle = darkenedColor;

        ctx.beginPath();
        ctx.moveTo(horizontalPositions.position, yPosition);
        ctx.lineTo(
          horizontalPositions.position + horizontalPositions.length,
          yPosition
        );
        ctx.stroke();

        // Draw price value on the left side of the divider
        ctx.fillStyle = darkenedColor;
        ctx.font = "16px Arial";
        ctx.fillText(
          priceValues[index].toFixed(2),
          horizontalPositions.position - 75,
          yPosition + 3
        );
      });

      // Add border when dragging
      if (this._isDragging) {
        ctx.strokeStyle = "rgb(0, 0, 255)"; // White border for dragging
        ctx.lineWidth = 2.5;
        ctx.strokeRect(
          this._p1.x * scope.horizontalPixelRatio,
          this._p1.y * scope.verticalPixelRatio,
          (this._p2.x - this._p1.x) * scope.horizontalPixelRatio,
          (this._p2.y - this._p1.y) * scope.verticalPixelRatio
        );
      }

      // Draw corner handles when selected
      if (this._isSelected) {
        this._drawCornerHandles(ctx, scope);
      }
    });
  }

  private _drawCornerHandles(
    ctx: CanvasRenderingContext2D,
    scope: BitmapCoordinatesRenderingScope
  ) {
    const handleSize = 8;
    const corners = [
      { x: this._p1.x, y: this._p1.y },
      { x: this._p2.x, y: this._p1.y },
      { x: this._p1.x, y: this._p2.y },
      { x: this._p2.x, y: this._p2.y },
    ];

    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;

    corners.forEach((corner) => {
      ctx.beginPath();
      ctx.arc(
        corner.x * scope.horizontalPixelRatio,
        corner.y * scope.verticalPixelRatio,
        handleSize,
        0,
        2 * Math.PI
      );
      ctx.fill();
      ctx.stroke();
    });
  }
}

function darkenRgbaColor(rgba: string): string {
  if (typeof rgba !== "string" || !rgba) return `rgba(0, 0, 0, 0.5)`;
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d\.]+)\)/);
  if (!match) return rgba;

  let r = Math.max(0, parseInt(match[1]) - 90);
  let g = Math.max(0, parseInt(match[2]) - 90);
  let b = Math.max(0, parseInt(match[3]) - 90);
  let a = parseFloat(match[4]) + 0.3;

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

interface ViewPoint {
  x: Coordinate | null;
  y: Coordinate | null;
  priceValue: number | null;
}

class RectanglePaneView implements ISeriesPrimitivePaneView {
  _source: Rectangle;
  _p1: ViewPoint = { x: null, y: null, priceValue: null };
  _p2: ViewPoint = { x: null, y: null, priceValue: null };

  constructor(source: Rectangle) {
    this._source = source;
  }

  update() {
    const series = this._source.series;
    const y1 = series.priceToCoordinate(this._source._p1.price);
    const y2 = series.priceToCoordinate(this._source._p2.price);
    const timeScale = this._source.chart.timeScale();
    const x1 = timeScale.timeToCoordinate(this._source._p1.time);
    const x2 = timeScale.timeToCoordinate(this._source._p2.time);
    this._p1 = { x: x1, y: y1, priceValue: this._source._p1.price };
    this._p2 = { x: x2, y: y2, priceValue: this._source._p2.price };
  }

  renderer() {
    return new RectanglePaneRenderer(
      this._p1,
      this._p2,
      this._source._options.fillColor,
      this._source.isDragging,
      this._source.isSelected
    );
  }
}

class RectangleAxisPaneRenderer implements ISeriesPrimitivePaneRenderer {
  _p1: number | null;
  _p2: number | null;
  _fillColor: string;
  _vertical: boolean = false;

  constructor(
    p1: number | null,
    p2: number | null,
    fillColor: string,
    vertical: boolean
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._fillColor = fillColor;
    this._vertical = vertical;
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace((scope) => {
      if (this._p1 === null || this._p2 === null) return;
      const ctx = scope.context;
      ctx.globalAlpha = 0.5;
      const positions = positionsBox(
        this._p1,
        this._p2,
        this._vertical ? scope.verticalPixelRatio : scope.horizontalPixelRatio
      );
      ctx.fillStyle = this._fillColor;
      if (this._vertical) {
        ctx.fillRect(0, positions.position, 15, positions.length);
      } else {
        ctx.fillRect(positions.position, 0, positions.length, 15);
      }
    });
  }
}

abstract class RectangleAxisPaneView implements ISeriesPrimitivePaneView {
  _source: Rectangle;
  _p1: number | null = null;
  _p2: number | null = null;
  _vertical: boolean = false;

  constructor(source: Rectangle, vertical: boolean) {
    this._source = source;
    this._vertical = vertical;
  }

  abstract getPoints(): [Coordinate | null, Coordinate | null];

  update() {
    [this._p1, this._p2] = this.getPoints();
  }

  renderer() {
    return new RectangleAxisPaneRenderer(
      this._p1,
      this._p2,
      this._source._options.fillColor,
      this._vertical
    );
  }
  zOrder(): SeriesPrimitivePaneViewZOrder {
    return "bottom";
  }
}

class RectanglePriceAxisPaneView extends RectangleAxisPaneView {
  getPoints(): [Coordinate | null, Coordinate | null] {
    const series = this._source.series;
    const y1 = series.priceToCoordinate(this._source._p1.price);
    const y2 = series.priceToCoordinate(this._source._p2.price);
    return [y1, y2];
  }
}

class RectangleTimeAxisPaneView extends RectangleAxisPaneView {
  getPoints(): [Coordinate | null, Coordinate | null] {
    const timeScale = this._source.chart.timeScale();
    const x1 = timeScale.timeToCoordinate(this._source._p1.time);
    const x2 = timeScale.timeToCoordinate(this._source._p2.time);
    return [x1, x2];
  }
}

abstract class RectangleAxisView implements ISeriesPrimitiveAxisView {
  _source: Rectangle;
  _p: Point;
  _pos: Coordinate | null = null;
  constructor(source: Rectangle, p: Point) {
    this._source = source;
    this._p = p;
  }
  abstract update(): void;
  abstract text(): string;

  coordinate() {
    return this._pos ?? -1;
  }

  visible(): boolean {
    return this._source._options.showLabels;
  }

  tickVisible(): boolean {
    return this._source._options.showLabels;
  }

  textColor() {
    return this._source._options.labelTextColor;
  }
  backColor() {
    return this._source._options.labelColor;
  }
  movePoint(p: Point) {
    this._p = p;
    this.update();
  }
}

class RectangleTimeAxisView extends RectangleAxisView {
  update() {
    const timeScale = this._source.chart.timeScale();
    this._pos = timeScale.timeToCoordinate(this._p.time);
  }
  text() {
    return this._source._options.timeLabelFormatter(this._p.time);
  }
}

class RectanglePriceAxisView extends RectangleAxisView {
  update() {
    const series = this._source.series;
    this._pos = series.priceToCoordinate(this._p.price);
  }
  text() {
    return this._source._options.priceLabelFormatter(this._p.price);
  }
}

interface Point {
  time: Time;
  price: number;
}

export interface RectangleDrawingToolOptions {
  fillColor: string;
  previewFillColor: string;
  labelColor: string;
  labelTextColor: string;
  showLabels: boolean;
  priceLabelFormatter: (price: number) => string;
  timeLabelFormatter: (time: Time) => string;
}

const defaultOptions: RectangleDrawingToolOptions = {
  fillColor: "rgba(200, 50, 100, 0.75)",
  previewFillColor: "rgba(200, 50, 100, 0.25)",
  labelColor: "rgba(200, 50, 100, 1)",
  labelTextColor: "white",
  showLabels: true,
  priceLabelFormatter: (price: number) => price.toFixed(2),
  timeLabelFormatter: (time: Time) => {
    if (typeof time == "string") return time;
    const date = isBusinessDay(time)
      ? new Date(time.year, time.month, time.day)
      : new Date(time * 1000);
    return date.toLocaleDateString();
  },
};

class Rectangle extends PluginBase {
  _options: RectangleDrawingToolOptions;
  _p1: Point;
  _p2: Point;
  _paneViews: RectanglePaneView[];
  _timeAxisViews: RectangleTimeAxisView[];
  _priceAxisViews: RectanglePriceAxisView[];
  _priceAxisPaneViews: RectanglePriceAxisPaneView[];
  _timeAxisPaneViews: RectangleTimeAxisPaneView[];

  // drag/resize
  isSelected: boolean = false;
  isDragging: boolean = false;

  constructor(
    p1: Point,
    p2: Point,
    options: Partial<RectangleDrawingToolOptions> = {}
  ) {
    super();
    this._p1 = p1;
    this._p2 = p2;
    this._options = {
      ...defaultOptions,
      ...options,
    };
    this._paneViews = [new RectanglePaneView(this)];
    this._timeAxisViews = [
      new RectangleTimeAxisView(this, p1),
      new RectangleTimeAxisView(this, p2),
    ];
    this._priceAxisViews = [
      new RectanglePriceAxisView(this, p1),
      new RectanglePriceAxisView(this, p2),
    ];
    this._priceAxisPaneViews = [new RectanglePriceAxisPaneView(this, true)];
    this._timeAxisPaneViews = [new RectangleTimeAxisPaneView(this, false)];
  }

  updateAllViews() {
    this._paneViews.forEach((pw) => pw.update());
    this._timeAxisViews.forEach((pw) => pw.update());
    this._priceAxisViews.forEach((pw) => pw.update());
    this._priceAxisPaneViews.forEach((pw) => pw.update());
    this._timeAxisPaneViews.forEach((pw) => pw.update());
  }

  priceAxisViews() {
    return this._priceAxisViews;
  }

  timeAxisViews() {
    return this._timeAxisViews;
  }

  paneViews() {
    return this._paneViews;
  }

  priceAxisPaneViews() {
    return this._priceAxisPaneViews;
  }

  timeAxisPaneViews() {
    return this._timeAxisPaneViews;
  }

  applyOptions(options: Partial<RectangleDrawingToolOptions>) {
    this._options = { ...this._options, ...options };
    this.requestUpdate();
  }

  move(deltaTime: number, deltaPrice: number) {
    this._p1.time = Number(this._p1.time) + deltaTime;
    this._p2.time = Number(this._p2.time) + deltaTime;
    this._p1.price += deltaPrice;
    this._p2.price += deltaPrice;
    this.updateAllViews();
  }
}

class PreviewRectangle extends Rectangle {
  constructor(
    p1: Point,
    p2: Point,
    options: Partial<RectangleDrawingToolOptions> = {}
  ) {
    super(p1, p2, options);
    this._options.fillColor = this._options.previewFillColor;
  }

  public updateEndPoint(p: Point) {
    this._p2 = p;
    this._paneViews[0].update();
    this._timeAxisViews[1].movePoint(p);
    this._priceAxisViews[1].movePoint(p);
    this.requestUpdate();
  }
}

export class RectangleDrawingTool {
  private _chart: IChartApi | undefined;
  private _series: ISeriesApi<SeriesType> | undefined;
  private _drawingsToolbarContainer: HTMLDivElement | undefined;
  private _defaultOptions: Partial<RectangleDrawingToolOptions>;
  private _rectangles: Rectangle[];
  private _previewRectangle: PreviewRectangle | undefined = undefined;
  private _points: Point[] = [];
  private _drawing: boolean = false;
  private _toolbarButton: HTMLDivElement | undefined;

  // New properties for editing
  private _selectedRectangle: Rectangle | null = null;
  private _isDragging: boolean = false;
  private _dragStartPoint: Point | null = null;

  constructor(
    chart: IChartApi,
    series: ISeriesApi<SeriesType>,
    drawingsToolbarContainer: HTMLDivElement,
    options: Partial<RectangleDrawingToolOptions>
  ) {
    this._chart = chart;
    this._series = series;
    this._drawingsToolbarContainer = drawingsToolbarContainer;
    this._addToolbarButton();
    this._defaultOptions = options;
    this._rectangles = [];
    this._chart.subscribeClick(this._clickHandler);
    this._chart.subscribeCrosshairMove(this._moveHandler);
  }

  remove() {
    this.stopDrawing();
    if (this._chart) {
      this._chart.unsubscribeClick(this._clickHandler);
      this._chart.unsubscribeCrosshairMove(this._moveHandler);
    }
    this._rectangles.forEach((rectangle) => {
      this._removeRectangle(rectangle);
    });
    this._rectangles = [];
    this._removePreviewRectangle();
    this._chart = undefined;
    this._series = undefined;
    this._drawingsToolbarContainer = undefined;
  }

  startDrawing(): void {
    this._drawing = true;
    this._points = [];
    if (this._toolbarButton) {
      this._toolbarButton.style.fill = "rgb(100, 150, 250)";
    }
  }

  stopDrawing(): void {
    this._drawing = false;
    this._points = [];
    if (this._toolbarButton) {
      this._toolbarButton.style.fill = "rgb(0, 0, 0)";
    }
  }

  isDrawing(): boolean {
    return this._drawing;
  }

  private _addPoint(p: Point) {
    this._points.push(p);
    if (this._points.length >= 2) {
      this._addNewRectangle(this._points[0], this._points[1]);
      this.stopDrawing();
      this._removePreviewRectangle();
    }
    if (this._points.length === 1) {
      this._addPreviewRectangle(this._points[0]);
    }
  }

  private _addNewRectangle(p1: Point, p2: Point) {
    const rectangle = new Rectangle(p1, p2, { ...this._defaultOptions });
    this._rectangles.push(rectangle);
    ensureDefined(this._series).attachPrimitive(rectangle);
  }

  private _removeRectangle(rectangle: Rectangle) {
    ensureDefined(this._series).detachPrimitive(rectangle);
  }

  private _addPreviewRectangle(p: Point) {
    this._previewRectangle = new PreviewRectangle(p, p, {
      ...this._defaultOptions,
    });
    ensureDefined(this._series).attachPrimitive(this._previewRectangle);
  }

  private _removePreviewRectangle() {
    if (this._previewRectangle) {
      ensureDefined(this._series).detachPrimitive(this._previewRectangle);
      this._previewRectangle = undefined;
    }
  }

  private _updatePreviewRectangle(p: Point) {
    if (this._previewRectangle) {
      this._previewRectangle.updateEndPoint(p);
    }
  }

  // function to get clicked rectangle
  private _getClickedRectangle(point: Point): Rectangle | null {
    // rectangles ordered by last created first
    const rectangles = [...this._rectangles].reverse();
    for (const rectangle of rectangles) {
      // time isn't converted to coordinates for some reason, so using Number() as a workaround
      const pointTimeCordinate = Number(point.time);
      const pointPriceCordinate = this._series?.priceToCoordinate(point.price);

      const p1TimeCordinate = Number(rectangle._p1.time);
      const p1PriceCordinate = this._series?.priceToCoordinate(
        rectangle._p1.price
      );

      const p2TimeCordinate = Number(rectangle._p2.time);
      const p2PriceCordinate = this._series?.priceToCoordinate(
        rectangle._p2.price
      );

      const isWithinXRange =
        pointTimeCordinate >= Math.min(p1TimeCordinate, p2TimeCordinate) &&
        pointTimeCordinate <= Math.max(p1TimeCordinate, p2TimeCordinate);
      const isWithinYRange =
        pointPriceCordinate >= Math.min(p1PriceCordinate, p2PriceCordinate) &&
        pointPriceCordinate <= Math.max(p1PriceCordinate, p2PriceCordinate);

      if (isWithinXRange && isWithinYRange) {
        return rectangle; // Return the clicked rectangle
      }
    }
    return null; // No rectangle was clicked
  }

  private _clickHandler = (param: MouseEventParams) => {
    if (!param.point || !param.time || !this._series) return;

    const price = this._series.coordinateToPrice(param.point.y);
    if (price === null) return;

    const clickPoint: Point = { time: param.time, price };

    if (this._drawing) {
      this._addPoint(clickPoint);
    } else {
      const clickedRectangle = this._getClickedRectangle(clickPoint);
      if (clickedRectangle) {
        if (this._isDragging) {
          // End dragging on second click
          this._isDragging = false;
          this._dragStartPoint = null;
          clickedRectangle.isDragging = false;
          this._updateCursor(clickPoint);
          this._deselectRectangle();
        } else {
          // Start dragging on first click
          this._selectRectangle(clickedRectangle);
          this._isDragging = true;
          this._dragStartPoint = clickPoint;
          clickedRectangle.isDragging = true;
        }
      } else {
        this._deselectRectangle();
      }
    }
  };

  private _moveHandler = (param: MouseEventParams) => {
    if (!param.point || !param.time || !this._series) return;

    const price = this._series.coordinateToPrice(param.point.y);
    if (price === null) return;

    const currentPoint: Point = { time: param.time, price };

    if (this._drawing) {
      this._updatePreviewRectangle(currentPoint);
    } else if (
      this._selectedRectangle &&
      this._isDragging &&
      this._dragStartPoint
    ) {
      this._dragRectangle(currentPoint);
    }

    this._updateCursor(currentPoint);
  };

  private _dragRectangle(currentPoint: Point) {
    if (!this._selectedRectangle || !this._dragStartPoint) return;

    const deltaTime =
      Number(currentPoint.time) - Number(this._dragStartPoint.time);
    const deltaPrice = currentPoint.price - this._dragStartPoint.price;

    this._selectedRectangle.move(deltaTime, deltaPrice);
    this._dragStartPoint = currentPoint;

    // Request an update to redraw the chart
    this._chart?.applyOptions({});
  }

  private _updateCursor(point: Point) {
    const clickedRectangle = this._getClickedRectangle(point);

    if (clickedRectangle) {
      if (this._isDragging) {
        document.body.style.cursor = "grabbing";
      } else {
        document.body.style.cursor = "grab";
      }
    } else {
      document.body.style.cursor = "default";
    }
  }

  private _selectRectangle(rectangle: Rectangle) {
    if (this._selectedRectangle) {
      this._selectedRectangle.isSelected = false;
    }
    this._selectedRectangle = rectangle;
    this._selectedRectangle.isSelected = true;
  }

  private _deselectRectangle() {
    if (this._selectedRectangle) {
      this._selectedRectangle.isSelected = false;
      this._selectedRectangle = null;
    }
  }

  private _addToolbarButton() {
    if (!this._drawingsToolbarContainer) return;
    const button = document.createElement("div");
    button.style.width = "20px";
    button.style.height = "20px";
    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M315.4 15.5C309.7 5.9 299.2 0 288 0s-21.7 5.9-27.4 15.5l-96 160c-5.9 9.9-6.1 22.2-.4 32.2s16.3 16.2 27.8 16.2H384c11.5 0 22.2-6.2 27.8-16.2s5.5-22.3-.4-32.2l-96-160zM288 312V456c0 22.1 17.9 40 40 40H472c22.1 0 40-17.9 40-40V312c0-22.1-17.9-40-40-40H328c-22.1 0-40 17.9-40 40zM128 512a128 128 0 1 0 0-256 128 128 0 1 0 0 256z"/></svg>`;
    button.addEventListener("click", () => {
      if (this.isDrawing()) {
        this.stopDrawing();
      } else {
        this.startDrawing();
      }
    });
    this._drawingsToolbarContainer.appendChild(button);
    this._toolbarButton = button;
    const colorPicker = document.createElement("input");
    colorPicker.type = "color";
    colorPicker.value = "#C83264";
    colorPicker.style.width = "24px";
    colorPicker.style.height = "20px";
    colorPicker.style.border = "none";
    colorPicker.style.padding = "0px";
    colorPicker.style.backgroundColor = "transparent";
    colorPicker.addEventListener("change", () => {
      const newColor = colorPicker.value;
      this._defaultOptions.fillColor = newColor + "CC";
      this._defaultOptions.previewFillColor = newColor + "77";
      this._defaultOptions.labelColor = newColor;
    });
    this._drawingsToolbarContainer.appendChild(colorPicker);
  }
}
