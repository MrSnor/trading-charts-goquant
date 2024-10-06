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
  private readonly _shadowPadding = 20; // Padding for the shadow area

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

      // Draw delete button when selected
      if (this._isSelected) {
        this._drawDeleteButton(ctx, scope);
      }

      // Draw invisible shadow area
      ctx.beginPath();
      ctx.rect(
        (this._p1.x - this._shadowPadding) * scope.horizontalPixelRatio,
        (this._p1.y - this._shadowPadding) * scope.verticalPixelRatio,
        (this._p2.x - this._p1.x + 2 * this._shadowPadding) *
          scope.horizontalPixelRatio,
        (this._p2.y - this._p1.y + 2 * this._shadowPadding) *
          scope.verticalPixelRatio
      );
      // Don't fill or stroke, just use for hit detection
    });
  }

  private _drawCornerHandles(
    ctx: CanvasRenderingContext2D,
    scope: BitmapCoordinatesRenderingScope
  ) {
    const handleSize = 20;
    const handleOffset = 5;

    const minX = Math.min(this._p1.x, this._p2.x);
    const maxX = Math.max(this._p1.x, this._p2.x);
    const minY = Math.min(this._p1.y, this._p2.y);
    const maxY = Math.max(this._p1.y, this._p2.y);

    const corners = [
      { x: minX, y: minY, handle: "topLeft" },
      { x: maxX, y: minY, handle: "topRight" },
      { x: minX, y: maxY, handle: "bottomLeft" },
      { x: maxX, y: maxY, handle: "bottomRight" },
    ];

    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;

    corners.forEach(({ x, y, handle }) => {
      let offsetX = handle.toLowerCase().includes("right")
        ? handleOffset
        : -handleOffset;
      let offsetY = handle.toLowerCase().includes("bottom")
        ? handleOffset
        : -handleOffset;

      const handleX =
        (x + offsetX) * scope.horizontalPixelRatio - handleSize / 2;
      const handleY = (y + offsetY) * scope.verticalPixelRatio - handleSize / 2;

      ctx.beginPath();
      ctx.arc(
        handleX + handleSize / 2,
        handleY + handleSize / 2,
        handleSize / 2,
        0,
        2 * Math.PI
      );
      ctx.fill();
      ctx.stroke();
    });
  }

  private _drawDeleteButton(
    ctx: CanvasRenderingContext2D,
    scope: BitmapCoordinatesRenderingScope
  ) {
    const buttonSize = 20;
    const buttonX =
      (this._p1.x + (this._p2.x - this._p1.x) / 2) *
        scope.horizontalPixelRatio -
      buttonSize / 2;
    const buttonY = this._p1.y * scope.verticalPixelRatio - buttonSize - 5;

    // Draw circle background
    ctx.beginPath();
    ctx.arc(
      buttonX + buttonSize / 2,
      buttonY + buttonSize / 2,
      buttonSize / 2,
      0,
      2 * Math.PI
    );
    ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
    ctx.fill();

    // Draw X
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(buttonX + 5, buttonY + 5);
    ctx.lineTo(buttonX + buttonSize - 5, buttonY + buttonSize - 5);
    ctx.moveTo(buttonX + buttonSize - 5, buttonY + 5);
    ctx.lineTo(buttonX + 5, buttonY + buttonSize - 5);
    ctx.stroke();
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
  isResizing: boolean = false;

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
    this._timeAxisViews.forEach((tav) => tav.update());
    this._priceAxisViews.forEach((pav) => pav.update());
    this._priceAxisPaneViews.forEach((papv) => papv.update());
    this._timeAxisPaneViews.forEach((tapv) => tapv.update());
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
    this._p1.time = (Number(this._p1.time) + deltaTime) as Time;
    this._p2.time = (Number(this._p2.time) + deltaTime) as Time;
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
  private _resizingHandle: string | null = null;

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

    // listen to events
    this._chart.subscribeClick(this._clickHandler);
    this._chart.subscribeCrosshairMove(this._moveHandler);
    this._chart.subscribeDblClick(this._dblClickHandler);
  }

  remove() {
    this.stopDrawing();
    if (this._chart) {
      // remove event listeners
      this._chart.unsubscribeClick(this._clickHandler);
      this._chart.unsubscribeCrosshairMove(this._moveHandler);
      this._chart.unsubscribeDblClick(this._dblClickHandler);
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
    const rectangles = [...this._rectangles].reverse();
    for (const rectangle of rectangles) {
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

      if (
        p1PriceCordinate === null ||
        p2PriceCordinate === null ||
        pointPriceCordinate === null
      )
        continue;

      // Same as in RectanglePaneRenderer
      // Note - (bug) this should be 0 to not select a rectangle on clicking its shadow area
      // but then the delete button is not working
      const shadowPadding = 20;

      const isWithinXRange =
        pointTimeCordinate >=
          Math.min(p1TimeCordinate, p2TimeCordinate) - shadowPadding &&
        pointTimeCordinate <=
          Math.max(p1TimeCordinate, p2TimeCordinate) + shadowPadding;

      const isWithinYRange =
        pointPriceCordinate >=
          Math.min(p1PriceCordinate, p2PriceCordinate) - shadowPadding &&
        pointPriceCordinate <=
          Math.max(p1PriceCordinate, p2PriceCordinate) + shadowPadding;

      if (isWithinXRange && isWithinYRange) {
        return rectangle;
      }
    }
    return null;
  }

  private _clickHandler = (param: MouseEventParams) => {
    if (!param.point || !param.time || !this._series) return;

    const price = this._series.coordinateToPrice(param.point.y);
    if (price === null) return;

    const clickPoint: Point = { time: param.time, price };

    if (this._drawing) {
      this._addPoint(clickPoint);
      return;
    }

    const clickedRectangle = this._getClickedRectangle(clickPoint);
    if (clickedRectangle) {
      if (this.isCursorOnDeleteButton(clickPoint, clickedRectangle)) {
        this._deleteRectangle(clickedRectangle);
      } else {
        const handle = this._getClickedResizeHandle(
          clickPoint,
          clickedRectangle
        );
        if (handle) {
          if (this._resizingHandle) {
            this._endResizing();
          } else {
            this._resizingHandle = handle;
            this._startResizing(clickPoint);
          }
        } else {
          this._handleRectangleClick(clickedRectangle, clickPoint);
        }
      }
    } else {
      this._deselectRectangle();
      this._endResizing();
      this._endDragging();
    }

    this._updateCursor(clickPoint);
  };

  private _getClickedResizeHandle(
    point: Point,
    rectangle: Rectangle
  ): string | null {
    // Only check resize handles if the rectangle is selected
    if (!rectangle.isSelected) {
      return null;
    }

    const handles = ["topLeft", "topRight", "bottomLeft", "bottomRight"];
    const timeScale = this._chart!.timeScale();
    const series = this._series!;
    const handleSize = 20;
    const shadowPadding = 20; // Same as the shadow area padding

    for (const handle of handles) {
      const handlePoint = this._getHandlePoint(rectangle, handle);
      const handleX = timeScale.timeToCoordinate!(handlePoint.time);
      const handleY = series.priceToCoordinate!(handlePoint.price);

      if (handleX === null || handleY === null) continue;

      let minX, maxX, minY, maxY;

      switch (handle) {
        case "topLeft":
          minX = handleX - shadowPadding;
          maxX = handleX + handleSize;
          minY = handleY - shadowPadding;
          maxY = handleY + handleSize;
          break;
        case "topRight":
          minX = handleX - handleSize;
          maxX = handleX + shadowPadding;
          minY = handleY - shadowPadding;
          maxY = handleY + handleSize;
          break;
        case "bottomLeft":
          minX = handleX - shadowPadding;
          maxX = handleX + handleSize;
          minY = handleY - handleSize;
          maxY = handleY + shadowPadding;
          break;
        case "bottomRight":
          minX = handleX - handleSize;
          maxX = handleX + shadowPadding;
          minY = handleY - handleSize;
          maxY = handleY + shadowPadding;
          break;
      }

      const pointX = timeScale.timeToCoordinate!(point.time);
      const pointY = series.priceToCoordinate!(point.price);

      if (pointX === null || pointY === null) continue;

      if (
        pointX >= minX &&
        pointX <= maxX &&
        pointY >= minY &&
        pointY <= maxY
      ) {
        return handle;
      }
    }

    return null;
  }

  private _getHandlePoint(rectangle: Rectangle, handle: string): Point {
    switch (handle) {
      case "topLeft":
        return {
          time: rectangle._p1.time,
          price: Math.max(rectangle._p1.price, rectangle._p2.price),
        };
      case "topRight":
        return {
          time: rectangle._p2.time,
          price: Math.max(rectangle._p1.price, rectangle._p2.price),
        };
      case "bottomLeft":
        return {
          time: rectangle._p1.time,
          price: Math.min(rectangle._p1.price, rectangle._p2.price),
        };
      case "bottomRight":
        return {
          time: rectangle._p2.time,
          price: Math.min(rectangle._p1.price, rectangle._p2.price),
        };
      default:
        throw new Error("Invalid handle");
    }
  }

  // Note - this needs to be modified to handle shadow area (maybe)
  private _isClickInsideRectangle(point: Point, rectangle: Rectangle): boolean {
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

    if (
      p1PriceCordinate === null ||
      p2PriceCordinate === null ||
      pointPriceCordinate === null
    )
      return false;

    const isWithinXRange =
      pointTimeCordinate >= Math.min(p1TimeCordinate, p2TimeCordinate) &&
      pointTimeCordinate <= Math.max(p1TimeCordinate, p2TimeCordinate);

    const isWithinYRange =
      pointPriceCordinate >= Math.min(p1PriceCordinate, p2PriceCordinate) &&
      pointPriceCordinate <= Math.max(p1PriceCordinate, p2PriceCordinate);

    return isWithinXRange && isWithinYRange;
  }

  private _dblClickHandler = (param: MouseEventParams) => {
    if (!param.point || !param.time || !this._series) return;

    const price = this._series.coordinateToPrice(param.point.y);
    if (price === null) return;

    const clickPoint: Point = { time: param.time, price };

    const clickedRectangle = this._getClickedRectangle(clickPoint);
    if (clickedRectangle) {
      if (this._isDragging) {
        this._endDragging();
      } else {
        this._startDragging(clickPoint);
      }
      this._endResizing(); // Ensure resizing is ended when we start/end dragging
    }
  };

  private _moveHandler = (param: MouseEventParams) => {
    if (!param.point || !param.time || !this._series) return;

    const price = this._series.coordinateToPrice(param.point.y);
    if (price === null) return;

    const currentPoint: Point = { time: param.time, price };

    if (this._drawing) {
      this._updatePreviewRectangle(currentPoint);
    } else if (this._resizingHandle && this._selectedRectangle) {
      this._resizeRectangle(currentPoint);
    } else if (
      this._isDragging &&
      this._selectedRectangle &&
      this._dragStartPoint
    ) {
      this._dragRectangle(currentPoint);
    }

    this._updateCursor(currentPoint);
  };

  private _resizeRectangle(currentPoint: Point) {
    if (!this._selectedRectangle || !this._resizingHandle) return;

    const rectangle = this._selectedRectangle;
    const handle = this._resizingHandle;

    let newP1 = rectangle._p1;
    let newP2 = rectangle._p2;

    switch (handle) {
      case "topLeft":
        newP1.price = currentPoint.price;
        newP1.time = currentPoint.time;
        break;
      case "topRight":
        newP1.price = currentPoint.price;
        newP2.time = currentPoint.time;
        break;
      case "bottomLeft":
        newP1.time = currentPoint.time;
        newP2.price = currentPoint.price;
        break;
      case "bottomRight":
        newP2.time = currentPoint.time;
        newP2.price = currentPoint.price;
        break;
    }

    // Update all views, including axis views
    rectangle.updateAllViews();

    // Force immediate redraw of the chart
    this._chart?.applyOptions({});
  }

  private _startResizing(point: Point) {
    if (this._selectedRectangle) {
      this._resizingHandle = this._getClickedResizeHandle(
        point,
        this._selectedRectangle
      );
      this._selectedRectangle.isResizing = true;
    }
  }

  private _endResizing() {
    this._resizingHandle = null;
    if (this._selectedRectangle) {
      this._selectedRectangle.isResizing = false;
    }
    this._chart?.applyOptions({});
  }

  private _startDragging(point: Point) {
    if (this._selectedRectangle) {
      this._isDragging = true;
      this._dragStartPoint = point;
      this._selectedRectangle.isDragging = true;
    }
  }

  private _endDragging() {
    this._isDragging = false;
    this._dragStartPoint = null;
    if (this._selectedRectangle) {
      this._selectedRectangle.isDragging = false;
    }
    this._chart?.applyOptions({});
  }

  private _dragRectangle(currentPoint: Point) {
    if (!this._selectedRectangle || !this._dragStartPoint) return;

    const deltaTime =
      Number(currentPoint.time) - Number(this._dragStartPoint.time);
    const deltaPrice = currentPoint.price - this._dragStartPoint.price;

    this._selectedRectangle.move(deltaTime, deltaPrice);
    this._dragStartPoint = currentPoint;

    this._chart?.applyOptions({});
  }

  private _handleRectangleClick(rectangle: Rectangle, clickPoint: Point) {
    if (this._resizingHandle) {
      // If we're resizing, stop the resize operation
      this._endResizing();
    } else if (this._isDragging) {
      // If we're dragging, stop the drag operation
      this._endDragging();
    } else if (this._selectedRectangle === rectangle) {
      // If the rectangle is already selected, start dragging
      this._startDragging(clickPoint);
    } else {
      // Otherwise, just select the rectangle
      this._selectRectangle(rectangle);
    }
  }

  private _updateCursor(point: Point) {
    const clickedRectangle = this._getClickedRectangle(point);
    let cursorStyle = "default";

    if (clickedRectangle) {
      if (this.isCursorOnDeleteButton(point, clickedRectangle)) {
        cursorStyle = "pointer";
      } else if (this._isDragging) {
        cursorStyle = "grabbing";
      } else if (this._resizingHandle) {
        cursorStyle = this._getResizeCursor(this._resizingHandle);
      } else {
        const handle = this._getClickedResizeHandle(point, clickedRectangle);
        if (handle) {
          cursorStyle = this._getResizeCursor(handle);
        } else if (this._selectedRectangle === clickedRectangle) {
          cursorStyle = "grab";
        } else {
          cursorStyle = "pointer";
        }
      }
    } else if (this._drawing) {
      cursorStyle = "crosshair";
    }

    document.body.style.cursor = cursorStyle;
  }

  private _getResizeCursor(handle: string): string {
    switch (handle) {
      case "topLeft":
      case "bottomRight":
        return "nwse-resize";
      case "topRight":
      case "bottomLeft":
        return "nesw-resize";
      default:
        return "default";
    }
  }

  private _selectRectangle(rectangle: Rectangle) {
    if (this._selectedRectangle) {
      this._selectedRectangle.isSelected = false;
    }
    this._selectedRectangle = rectangle;
    this._selectedRectangle.isSelected = true;
    this._chart?.applyOptions({});
  }

  private _deselectRectangle() {
    if (this._selectedRectangle) {
      this._selectedRectangle.isSelected = false;
      this._selectedRectangle = null;
      this._chart?.applyOptions({});
    }
  }

  private isCursorOnDeleteButton(
    cursorPoint: Point,
    rectangle: Rectangle
  ): boolean {
    const buttonSize = 20;
    const hitAreaSize = 30; // Larger hit area for easier clicking
    const timeScale = this._chart!.timeScale();
    const series = this._series;

    if (!series) return false;

    const rectX1 = timeScale.timeToCoordinate!(rectangle._p1.time);
    const rectX2 = timeScale.timeToCoordinate!(rectangle._p2.time);
    const rectY1 = series.priceToCoordinate!(rectangle._p1.price);

    if (rectX1 === null || rectX2 === null || rectY1 === null) return false;

    const buttonCenterX = (rectX1 + rectX2) / 2;
    const buttonCenterY = rectY1 - buttonSize / 2 - 5;

    const cursorX = timeScale.timeToCoordinate!(cursorPoint.time);
    const cursorY = series.priceToCoordinate!(cursorPoint.price);

    if (cursorX === null || cursorY === null) return false;

    const distance = Math.sqrt(
      Math.pow(cursorX - buttonCenterX, 2) +
        Math.pow(cursorY - buttonCenterY, 2)
    );

    return distance <= hitAreaSize / 2;
  }

  private _deleteRectangle(rectangle: Rectangle) {
    const index = this._rectangles.indexOf(rectangle);
    if (index !== -1) {
      this._rectangles.splice(index, 1);
      this._removeRectangle(rectangle);
      this._deselectRectangle();
      this._chart!.applyOptions({});
    }
  }

  private _addToolbarButton() {
    if (!this._drawingsToolbarContainer) return;
    const button = document.createElement("div");
    button.style.width = "20px";
    button.style.height = "20px";
    button.style.paddingLeft = "5px"
    button.style.paddingTop = "2px"
    button.style.cursor = "pointer";
    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 512 512">
	<rect width="512" height="512" fill="none" />
	<path d="M136.6 138.79a64 64 0 0 0-43.31 41.35L0 460l14.69 14.69L164.8 324.58c-2.99-6.26-4.8-13.18-4.8-20.58c0-26.51 21.49-48 48-48s48 21.49 48 48s-21.49 48-48 48c-7.4 0-14.32-1.81-20.58-4.8L37.31 497.31L52 512l279.86-93.29a64 64 0 0 0 41.35-43.31L416 224L288 96zm361.34-64.62l-60.11-60.11c-18.75-18.75-49.16-18.75-67.91 0l-56.55 56.55l128.02 128.02l56.55-56.55c18.75-18.75 18.75-49.15 0-67.91" />
</svg>`;
    button.addEventListener("click", () => {
      if (this.isDrawing()) {
        this.stopDrawing();
      } else {
        this.startDrawing();
      }
    });
    this._drawingsToolbarContainer.appendChild(button);
    this._toolbarButton = button;

    // disable color picker
    // const colorPicker = document.createElement("input");
    // colorPicker.type = "color";
    // colorPicker.value = "#C83264";
    // colorPicker.style.width = "24px";
    // colorPicker.style.height = "20px";
    // colorPicker.style.border = "none";
    // colorPicker.style.padding = "0px";
    // colorPicker.style.backgroundColor = "transparent";
    // colorPicker.addEventListener("change", () => {
    //   const newColor = colorPicker.value;
    //   this._defaultOptions.fillColor = newColor + "CC";
    //   this._defaultOptions.previewFillColor = newColor + "77";
    //   this._defaultOptions.labelColor = newColor;
    // });
    // this._drawingsToolbarContainer.appendChild(colorPicker);
  }
}
