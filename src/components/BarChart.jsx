import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useMemo,
  useCallback,
  Children,
  isValidElement,
} from "react";
import { createPortal } from "react-dom";
import { localPoint } from "@visx/event";
import { LinearGradient as VisxLinearGradient } from "@visx/gradient";
import { GridColumns, GridRows } from "@visx/grid";
import { ParentSize } from "@visx/responsive";
import { scaleBand, scaleLinear } from "@visx/scale";
import { AnimatePresence, motion, useSpring } from "framer-motion";
import useMeasure from "react-use-measure";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ─── Utils ───────────────────────────────────────────────────────────────────

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ─── CSS Vars ────────────────────────────────────────────────────────────────

export const chartCssVars = {
  background: "var(--chart-background, #000)",
  foreground: "var(--chart-foreground, #fff)",
  foregroundMuted: "var(--chart-foreground-muted, #888)",
  label: "var(--chart-label, #888)",
  linePrimary: "var(--chart-line-primary, #3b82f6)",
  lineSecondary: "var(--chart-line-secondary, #22c55e)",
  crosshair: "var(--chart-crosshair, rgba(255,255,255,0.15))",
  grid: "var(--chart-grid, rgba(255,255,255,0.05))",
};

// ─── Bar Chart Context ───────────────────────────────────────────────────────

const BarChartContext = createContext(null);

function BarChartProvider({ children, value }) {
  return (
    <BarChartContext.Provider value={value}>
      {children}
    </BarChartContext.Provider>
  );
}

export function useChart() {
  const context = useContext(BarChartContext);
  if (!context) {
    throw new Error(
      "useChart must be used within a BarChartProvider. " +
        "Make sure your component is wrapped in <BarChart>."
    );
  }
  return context;
}

// ─── Tooltip Components ──────────────────────────────────────────────────────

function TooltipDot({
  x,
  y,
  visible,
  color,
  size = 5,
  strokeColor = chartCssVars.background,
  strokeWidth = 2,
}) {
  const springConfig = { stiffness: 300, damping: 30 };
  const animatedX = useSpring(x, springConfig);
  const animatedY = useSpring(y, springConfig);

  useEffect(() => {
    animatedX.set(x);
    animatedY.set(y);
  }, [x, y, animatedX, animatedY]);

  if (!visible) {
    return null;
  }

  // Pass MotionValues via style to avoid React's invalid-prop-value warning on SVG elements
  return (
    <motion.circle
      style={{ cx: animatedX, cy: animatedY }}
      fill={color}
      r={size}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
    />
  );
}

TooltipDot.displayName = "TooltipDot";

function TooltipIndicator({
  x,
  height,
  visible,
  width = 1,
  colorEdge = chartCssVars.crosshair,
  colorMid = chartCssVars.crosshair,
  fadeEdges = true,
  gradientId = "bar-tooltip-indicator-gradient",
}) {
  const springConfig = { stiffness: 300, damping: 30 };
  const animatedX = useSpring(x - width / 2, springConfig);

  useEffect(() => {
    animatedX.set(x - width / 2);
  }, [x, animatedX, width]);

  if (!visible) {
    return null;
  }

  const edgeOpacity = fadeEdges ? 0 : 1;

  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
          <stop
            offset="0%"
            style={{ stopColor: colorEdge, stopOpacity: edgeOpacity }}
          />
          <stop offset="10%" style={{ stopColor: colorEdge, stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: colorMid, stopOpacity: 1 }} />
          <stop offset="90%" style={{ stopColor: colorEdge, stopOpacity: 1 }} />
          <stop
            offset="100%"
            style={{ stopColor: colorEdge, stopOpacity: edgeOpacity }}
          />
        </linearGradient>
      </defs>
      <motion.rect
        fill={`url(#${gradientId})`}
        height={height}
        width={width}
        x={animatedX}
        y={0}
      />
    </g>
  );
}

TooltipIndicator.displayName = "TooltipIndicator";

function TooltipContent({ title, rows, children }) {
  const [measureRef, bounds] = useMeasure({ debounce: 0, scroll: false });
  const [committedHeight, setCommittedHeight] = useState(null);
  const committedChildrenStateRef = useRef(null);
  const frameRef = useRef(null);

  const hasChildren = !!children;
  const markerKey = hasChildren ? "has-marker" : "no-marker";

  const isWaitingForSettlement =
    committedChildrenStateRef.current !== null &&
    committedChildrenStateRef.current !== hasChildren;

  useEffect(() => {
    if (bounds.height <= 0) {
      return;
    }

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (isWaitingForSettlement) {
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = requestAnimationFrame(() => {
          setCommittedHeight(bounds.height);
          committedChildrenStateRef.current = hasChildren;
        });
      });
    } else {
      setCommittedHeight(bounds.height);
      committedChildrenStateRef.current = hasChildren;
    }

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [bounds.height, hasChildren, isWaitingForSettlement]);

  const shouldAnimate = committedHeight !== null;

  return (
    <motion.div
      animate={
        committedHeight !== null ? { height: committedHeight } : undefined
      }
      className="overflow-hidden"
      initial={false}
      transition={
        shouldAnimate
          ? {
              type: "spring",
              stiffness: 500,
              damping: 35,
              mass: 0.8,
            }
          : { duration: 0 }
      }
    >
      <div className="px-3 py-2.5" ref={measureRef} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
        {title && (
          <div className="mb-2 font-medium text-xs" style={{ color: '#fff', fontSize: '13px', fontWeight: '600' }}>
            {title}
          </div>
        )}
        <div className="space-y-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {rows.map((row) => (
            <div
              className="flex items-center justify-between gap-4"
              key={`${row.label}-${row.color}`}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}
            >
              <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color, display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%' }}
                />
                <span className="text-sm" style={{ color: '#888', fontSize: '12px' }}>
                  {row.label}
                </span>
              </div>
              <span className="font-medium text-sm tabular-nums" style={{ color: '#fff', fontSize: '12px', fontWeight: '500' }}>
                {typeof row.value === "number"
                  ? row.value.toLocaleString()
                  : row.value}
              </span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {children && (
            <motion.div
              animate={{ opacity: 1, filter: "blur(0px)" }}
              className="mt-2"
              exit={{ opacity: 0, filter: "blur(4px)" }}
              initial={{ opacity: 0, filter: "blur(4px)" }}
              key={markerKey}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

TooltipContent.displayName = "TooltipContent";

function TooltipBox({
  x,
  y,
  visible,
  containerRef,
  containerWidth,
  containerHeight,
  offset = 16,
  className = "",
  children,
  top: topOverride,
}) {
  const tooltipRef = useRef(null);
  const [tooltipWidth, setTooltipWidth] = useState(180);
  const [tooltipHeight, setTooltipHeight] = useState(80);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (tooltipRef.current) {
      const w = tooltipRef.current.offsetWidth;
      const h = tooltipRef.current.offsetHeight;
      if (w > 0 && w !== tooltipWidth) {
        setTooltipWidth(w);
      }
      if (h > 0 && h !== tooltipHeight) {
        setTooltipHeight(h);
      }
    }
  }, [tooltipWidth, tooltipHeight]);

  const shouldFlipX = x + tooltipWidth + offset > containerWidth;
  const targetX = shouldFlipX ? x - offset - tooltipWidth : x + offset;

  const targetY = Math.max(
    offset,
    Math.min(y - tooltipHeight / 2, containerHeight - tooltipHeight - offset)
  );

  const prevFlipRef = useRef(shouldFlipX);
  const [flipKey, setFlipKey] = useState(0);

  useEffect(() => {
    if (prevFlipRef.current !== shouldFlipX) {
      setFlipKey((k) => k + 1);
      prevFlipRef.current = shouldFlipX;
    }
  }, [shouldFlipX]);

  const springConfig = { stiffness: 100, damping: 20 };
  const animatedLeft = useSpring(targetX, springConfig);
  const animatedTop = useSpring(targetY, springConfig);

  useEffect(() => {
    animatedLeft.set(targetX);
  }, [targetX, animatedLeft]);

  useEffect(() => {
    animatedTop.set(targetY);
  }, [targetY, animatedTop]);

  const finalTop = topOverride ?? animatedTop;
  const transformOrigin = shouldFlipX ? "right top" : "left top";

  const container = containerRef.current;
  if (!(mounted && container)) {
    return null;
  }

  if (!visible) {
    return null;
  }

  return createPortal(
    <motion.div
      animate={{ opacity: 1 }}
      className={cn("pointer-events-none absolute z-50", className)}
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      ref={tooltipRef}
      style={{ left: animatedLeft, top: finalTop, position: 'absolute', pointerEvents: 'none', zIndex: 50 }}
      transition={{ duration: 0.1 }}
    >
      <motion.div
        animate={{ scale: 1, opacity: 1, x: 0 }}
        className="min-w-[140px] overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-lg backdrop-blur-md"
        initial={{ scale: 0.85, opacity: 0, x: shouldFlipX ? 20 : -20 }}
        key={flipKey}
        style={{ transformOrigin }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {children}
      </motion.div>
    </motion.div>,
    container
  );
}

TooltipBox.displayName = "TooltipBox";

// ─── ChartTooltip ────────────────────────────────────────────────────────────

export function ChartTooltip({
  showCrosshair = true,
  showDots = true,
  content,
  rows: rowsRenderer,
  children,
  className = "",
}) {
  const {
    tooltipData,
    width,
    height,
    innerHeight,
    margin,
    bars,
    xDataKey,
    containerRef,
    orientation,
  } = useChart();

  const isHorizontal = orientation === "horizontal";

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const visible = tooltipData !== null;
  const x = tooltipData?.x ?? 0;
  const xWithMargin = x + margin.left;

  const firstBarDataKey = bars[0]?.dataKey;
  const firstBarY = firstBarDataKey
    ? (tooltipData?.yPositions[firstBarDataKey] ?? 0)
    : 0;
  const yWithMargin = firstBarY + margin.top;

  const springConfig = { stiffness: 300, damping: 30 };
  const animatedX = useSpring(xWithMargin, springConfig);

  useEffect(() => {
    animatedX.set(xWithMargin);
  }, [xWithMargin, animatedX]);

  const tooltipRows = useMemo(() => {
    if (!tooltipData) {
      return [];
    }

    if (rowsRenderer) {
      return rowsRenderer(tooltipData.point);
    }

    return bars.map((bar) => ({
      color: bar.stroke || bar.fill,
      label: bar.dataKey,
      value: tooltipData.point[bar.dataKey] ?? 0,
    }));
  }, [tooltipData, bars, rowsRenderer]);

  const title = useMemo(() => {
    if (!tooltipData) {
      return undefined;
    }
    return String(tooltipData.point[xDataKey] ?? "");
  }, [tooltipData, xDataKey]);

  const container = containerRef.current;
  if (!(mounted && container)) {
    return null;
  }

  const tooltipContent = (
    <>
      {showCrosshair && !isHorizontal && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          height="100%"
          width="100%"
        >
          <g transform={`translate(${margin.left},${margin.top})`}>
            <TooltipIndicator
              height={innerHeight}
              visible={visible}
              width={1}
              x={x}
            />
          </g>
        </svg>
      )}

      {showDots && visible && !isHorizontal && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          height="100%"
          width="100%"
        >
          <g transform={`translate(${margin.left},${margin.top})`}>
            {bars.map((bar) => (
              <TooltipDot
                color={
                  typeof bar.fill === "function"
                    ? bar.fill(tooltipData.point)
                    : (tooltipData.point?.cor || tooltipData.point?.color || bar.stroke || bar.fill)
                }
                key={bar.dataKey}
                strokeColor={chartCssVars.background}
                visible={visible}
                x={tooltipData?.xPositions?.[bar.dataKey] ?? x}
                y={tooltipData?.yPositions[bar.dataKey] ?? 0}
              />
            ))}
          </g>
        </svg>
      )}

      <TooltipBox
        className={className}
        containerHeight={height}
        containerRef={containerRef}
        containerWidth={width}
        top={isHorizontal ? undefined : margin.top}
        visible={visible}
        x={xWithMargin}
        y={isHorizontal ? yWithMargin : margin.top}
      >
        {content ? (
          content({
            point: tooltipData?.point ?? {},
            index: tooltipData?.index ?? 0,
          })
        ) : (
          <TooltipContent rows={tooltipRows} title={title}>
            {children}
          </TooltipContent>
        )}
      </TooltipBox>
    </>
  );

  return createPortal(tooltipContent, container);
}

ChartTooltip.displayName = "ChartTooltip";

// ─── Grid ────────────────────────────────────────────────────────────────────

export function Grid({
  horizontal = true,
  vertical = false,
  numTicksRows = 5,
  numTicksColumns = 10,
  rowTickValues,
  stroke = chartCssVars.grid,
  strokeOpacity = 1,
  strokeWidth = 1,
  strokeDasharray = "4,4",
  fadeHorizontal = true,
  fadeVertical = false,
}) {
  const { xScale, yScale, innerWidth, innerHeight, orientation } = useChart();

  const isHorizontalBar = orientation === "horizontal";
  const columnScale = isHorizontalBar ? yScale : xScale;
  const uniqueId = useId();

  const hMaskId = `grid-rows-fade-${uniqueId}`;
  const hGradientId = `${hMaskId}-gradient`;
  const vMaskId = `grid-cols-fade-${uniqueId}`;
  const vGradientId = `${vMaskId}-gradient`;

  return (
    <g className="chart-grid">
      {horizontal && fadeHorizontal && (
        <defs>
          <linearGradient id={hGradientId} x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" style={{ stopColor: "white", stopOpacity: 0 }} />
            <stop offset="10%" style={{ stopColor: "white", stopOpacity: 1 }} />
            <stop offset="90%" style={{ stopColor: "white", stopOpacity: 1 }} />
            <stop
              offset="100%"
              style={{ stopColor: "white", stopOpacity: 0 }}
            />
          </linearGradient>
          <mask id={hMaskId}>
            <rect
              fill={`url(#${hGradientId})`}
              height={innerHeight}
              width={innerWidth}
              x="0"
              y="0"
            />
          </mask>
        </defs>
      )}

      {vertical && fadeVertical && (
        <defs>
          <linearGradient id={vGradientId} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: "white", stopOpacity: 0 }} />
            <stop offset="10%" style={{ stopColor: "white", stopOpacity: 1 }} />
            <stop offset="90%" style={{ stopColor: "white", stopOpacity: 1 }} />
            <stop
              offset="100%"
              style={{ stopColor: "white", stopOpacity: 0 }}
            />
          </linearGradient>
          <mask id={vMaskId}>
            <rect
              fill={`url(#${vGradientId})`}
              height={innerHeight}
              width={innerWidth}
              x="0"
              y="0"
            />
          </mask>
        </defs>
      )}

      {horizontal && (
        <g mask={fadeHorizontal ? `url(#${hMaskId})` : undefined}>
          <GridRows
            numTicks={rowTickValues ? undefined : numTicksRows}
            scale={yScale}
            stroke={stroke}
            strokeDasharray={strokeDasharray}
            strokeOpacity={strokeOpacity}
            strokeWidth={strokeWidth}
            tickValues={rowTickValues}
            width={innerWidth}
          />
        </g>
      )}
      {vertical && columnScale && typeof columnScale === "function" && (
        <g mask={fadeVertical ? `url(#${vMaskId})` : undefined}>
          <GridColumns
            height={innerHeight}
            numTicks={numTicksColumns}
            scale={columnScale}
            stroke={stroke}
            strokeDasharray={strokeDasharray}
            strokeOpacity={strokeOpacity}
            strokeWidth={strokeWidth}
          />
        </g>
      )}
    </g>
  );
}

Grid.displayName = "Grid";

// ─── BarXAxis ────────────────────────────────────────────────────────────────

export function BarXAxis({
  tickerHalfWidth = 50,
  showAllLabels = false,
  maxLabels = 12,
  fontSize = 11,
}) {
  const { xScale, bandWidth, innerHeight, tooltipData } = useChart();

  const labelsToShow = useMemo(() => {
    const domain = xScale.domain();
    if (domain.length === 0) return [];

    let labels = domain.map((label) => ({
      label,
      // x is in inner-chart coordinates (margin already applied by parent <g>)
      x: (xScale(label) ?? 0) + bandWidth / 2,
    }));

    if (!showAllLabels && labels.length > maxLabels) {
      const step = Math.ceil(labels.length / maxLabels);
      labels = labels.filter((_, i) => i % step === 0);
    }

    return labels;
  }, [xScale, bandWidth, showAllLabels, maxLabels]);

  const crosshairX = tooltipData ? tooltipData.x : null;

  // y sits inside the bottom margin, just below the chart inner area
  const labelY = innerHeight + 20;

  return (
    <g className="bar-x-axis">
      {labelsToShow.map((item) => {
        let opacity = 1;
        if (crosshairX !== null) {
          const fadeBuffer = 20;
          const fadeRadius = tickerHalfWidth + fadeBuffer;
          const distance = Math.abs(item.x - crosshairX);
          if (distance < tickerHalfWidth) {
            opacity = 0;
          } else if (distance < fadeRadius) {
            opacity = (distance - tickerHalfWidth) / fadeBuffer;
          }
        }

        return (
          <motion.text
            key={item.label}
            x={item.x}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="hanging"
            fontSize={fontSize}
            fill="var(--chart-label, #94a3b8)"
            animate={{ opacity }}
            initial={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            {item.label}
          </motion.text>
        );
      })}
    </g>
  );
}

BarXAxis.displayName = "BarXAxis";

// ─── BarYAxis ────────────────────────────────────────────────────────────────

export function BarYAxis({
  showAllLabels = true,
  maxLabels = 20,
  fontSize = "11px",
}) {
  const { xScale, margin, containerRef, bandWidth } = useChart();
  const [container, setContainer] = useState(null);

  useEffect(() => {
    setContainer(containerRef.current);
  }, [containerRef]);

  const labels = useMemo(() => {
    const domain = xScale.domain();
    let items = domain.map((label) => ({
      label,
      y: (xScale(label) ?? 0) + bandWidth / 2 + margin.top,
    }));

    if (!showAllLabels && items.length > maxLabels) {
      const step = Math.ceil(items.length / maxLabels);
      items = items.filter((_, i) => i % step === 0);
    }

    return items;
  }, [xScale, margin.top, bandWidth, showAllLabels, maxLabels]);

  if (!container) {
    return null;
  }

  return createPortal(
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none" }}>
      {labels.map((item) => (
        <div
          key={item.label}
          style={{
            position: "absolute",
            left: 0,
            top: `${item.y}px`,
            width: `${margin.left - 8}px`,
            display: "flex",
            justifyContent: "flex-end",
            transform: "translateY(-50%)",
          }}
        >
          <span style={{ color: 'var(--chart-label, #94a3b8)', fontSize: fontSize, whiteSpace: 'nowrap' }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>,
    container
  );
}

BarYAxis.displayName = "BarYAxis";

// ─── Bar ─────────────────────────────────────────────────────────────────────

function resolveRadius(lineCap, barWidth) {
  if (lineCap === "butt") return 0;
  if (lineCap === "round") return barWidth / 2;
  return lineCap;
}

export function Bar({
  dataKey,
  fill = chartCssVars.linePrimary,
  stroke,
  lineCap = "round",
  animate = true,
  animationType = "fade",
  fadedOpacity = 0.3,
  staggerDelay,
  stackGap = 0,
  showValues = false,
  valueFormatter,
  valueColor = "#ffffff",
  valueFontSize = "12px",
}) {
  const {
    data,
    xScale,
    yScale,
    innerHeight,
    innerWidth,
    bandWidth,
    hoveredBarIndex,
    isLoaded,
    animationDuration,
    xDataKey,
    orientation,
    stacked,
    stackOffsets,
    bars,
    barWidth: fixedBarWidth,
  } = useChart();

  const isHorizontal = orientation === "horizontal";

  const barIndex = bars.findIndex((b) => b.dataKey === dataKey);
  const barCount = bars.length;

  const singleBarWidth = stacked
    ? bandWidth
    : bandWidth / barCount;
  const actualBarWidth = fixedBarWidth ?? singleBarWidth;

  const radius = resolveRadius(lineCap, actualBarWidth);
  const autoStagger = staggerDelay ?? Math.min(0.06, 0.8 / data.length);

  return (
    <>
      {data.map((d, i) => {
        const category = String(d[xDataKey] ?? "");
        const value = typeof d[dataKey] === "number" ? d[dataKey] : 0;

        const bandStart = xScale(category) ?? 0;
        const stackOffset = stacked
          ? stackOffsets.get(i)?.get(dataKey) ?? 0
          : 0;

        let barX;
        let barY;
        let barW;
        let barH;

        if (isHorizontal) {
          const barLength = innerWidth - (yScale(value) ?? innerWidth);
          barY = bandStart + (stacked ? 0 : barIndex * singleBarWidth);
          barH = actualBarWidth;
          barW = barLength;
          barX = stacked ? stackOffset : 0;
          if (stacked && stackGap > 0 && barIndex > 0) {
            barX += stackGap;
            barW = Math.max(0, barW - stackGap);
          }
        } else {
          const scaledY = yScale(value) ?? innerHeight;
          barX = bandStart + (stacked ? 0 : barIndex * singleBarWidth);
          barW = actualBarWidth;
          barH = innerHeight - scaledY;
          barY = stacked ? scaledY - stackOffset : scaledY;
          if (stacked && stackGap > 0 && barIndex > 0) {
            barY += stackGap;
            barH = Math.max(0, barH - stackGap);
          }
        }

        const hasVisibleBar = barW > 0 && barH > 0;

        const isHovered = hoveredBarIndex === i;
        const someoneHovered = hoveredBarIndex !== null;
        const barOpacity = someoneHovered
          ? isHovered ? 1 : fadedOpacity
          : 1;

        const delay = i * autoStagger;

        let r = Math.min(radius, barW / 2, barH / 2);
        if (stacked) {
          let lastVisibleKey = null;
          for (let j = bars.length - 1; j >= 0; j--) {
            const bKey = bars[j].dataKey;
            const val = d[bKey];
            if (typeof val === "number" && val > 0) {
              lastVisibleKey = bKey;
              break;
            }
          }
          const isLastVisibleBarInStack = dataKey === lastVisibleKey;
          if (!isLastVisibleBarInStack) {
            r = 0;
          }
        }
        let path;
        if (isHorizontal) {
          path = `M${barX},${barY} L${barX + barW - r},${barY} Q${barX + barW},${barY} ${barX + barW},${barY + r} L${barX + barW},${barY + barH - r} Q${barX + barW},${barY + barH} ${barX + barW - r},${barY + barH} L${barX},${barY + barH}Z`;
        } else {
          path = `M${barX},${barY + barH} L${barX},${barY + r} Q${barX},${barY} ${barX + r},${barY} L${barX + barW - r},${barY} Q${barX + barW},${barY} ${barX + barW},${barY + r} L${barX + barW},${barY + barH}Z`;
        }

        const originX = isHorizontal ? barX : barX + barW / 2;
        const originY = isHorizontal ? barY + barH / 2 : innerHeight;

        const shouldAnimateEntry = animate && !isLoaded;
        const growInitial = isHorizontal
          ? { scaleX: 0, opacity: 0 }
          : { scaleY: 0, opacity: 0 };
        const growAnimate = isHorizontal
          ? { scaleX: 1, opacity: barOpacity }
          : { scaleY: 1, opacity: barOpacity };
        const growTransition = {
          [isHorizontal ? "scaleX" : "scaleY"]: {
            duration: animationDuration / 1000,
            ease: [0.85, 0, 0.15, 1],
            delay,
          },
          opacity: { duration: 0.3, ease: "easeInOut" },
        };

        // Text label positioning
        let labelX = 0;
        let labelY = 0;
        let labelText = "";
        let textAnchor = "middle";

        if (showValues) {
          if (stacked) {
            const isLastBarInStack = barIndex === barCount - 1;
            if (isLastBarInStack) {
              let totalVal = 0;
              for (const b of bars) {
                totalVal += typeof d[b.dataKey] === "number" ? d[b.dataKey] : 0;
              }
              if (totalVal > 0) {
                labelText = valueFormatter ? valueFormatter(totalVal, d) : String(totalVal);
                const totalOffset = stackOffset + (isHorizontal ? barW : -barH);
                if (isHorizontal) {
                  labelX = totalOffset + 6;
                  labelY = barY + barH / 2;
                  textAnchor = "start";
                } else {
                  labelX = barX + barW / 2;
                  labelY = totalOffset - 8;
                  textAnchor = "middle";
                }
              }
            }
          } else {
            if (value > 0) {
              labelText = valueFormatter ? valueFormatter(value, d) : String(value);
              if (isHorizontal) {
                labelX = barX + barW + 6;
                labelY = barY + barH / 2;
                textAnchor = "start";
              } else {
                labelX = barX + barW / 2;
                labelY = barY - 8;
                textAnchor = "middle";
              }
            }
          }
        }

        return (
          <g key={`${category}-${dataKey}`}>
            {hasVisibleBar && (
              <motion.path
                d={path}
                fill={typeof fill === "function" ? fill(d) : (d.cor || d.color || fill)}
                style={{ transformOrigin: `${originX}px ${originY}px` }}
                initial={
                  shouldAnimateEntry && animationType === "grow"
                    ? growInitial
                    : shouldAnimateEntry && animationType === "fade"
                      ? { opacity: 0 }
                      : { opacity: barOpacity }
                }
                animate={
                  shouldAnimateEntry && animationType === "grow"
                    ? growAnimate
                    : shouldAnimateEntry && animationType === "fade"
                      ? { opacity: barOpacity }
                      : { opacity: barOpacity }
                }
                transition={
                  shouldAnimateEntry && animationType === "grow"
                    ? growTransition
                    : shouldAnimateEntry && animationType === "fade"
                      ? { opacity: { duration: 0.5, delay, ease: "easeOut" } }
                      : { opacity: { duration: 0.3, ease: "easeInOut" } }
                }
              />
            )}
            {labelText && (
              <motion.text
                x={labelX}
                y={labelY}
                textAnchor={textAnchor}
                fill={valueColor}
                fontSize={valueFontSize}
                fontWeight="700"
                dy="0.35em"
                className="pointer-events-none"
                initial={shouldAnimateEntry ? { opacity: 0 } : { opacity: 1 }}
                animate={{ opacity: barOpacity }}
                transition={{ duration: 0.3 }}
              >
                {labelText}
              </motion.text>
            )}
          </g>
        );
      })}
    </>
  );
}

Bar.displayName = "Bar";

// ─── Legend ───────────────────────────────────────────────────────────────────

const LegendContext = createContext(null);

export function Legend({ items, className = "", children }) {
  return (
    <div className={cn("mt-4 flex flex-wrap gap-4", className)}>
      {items.map((item) => (
        <LegendContext.Provider key={item.label} value={item}>
          {children}
        </LegendContext.Provider>
      ))}
    </div>
  );
}

Legend.displayName = "Legend";

export function LegendItemComponent({
  className = "",
  children,
}) {
  return <div className={cn("flex items-center gap-2", className)}>{children}</div>;
}

LegendItemComponent.displayName = "LegendItem";

export function LegendMarker({ className = "" }) {
  const item = useContext(LegendContext);
  if (!item) return null;
  return (
    <span
      className={cn("h-3 w-3 shrink-0 rounded-sm", className)}
      style={{ backgroundColor: item.color }}
    />
  );
}

LegendMarker.displayName = "LegendMarker";

export function LegendLabel({ className = "" }) {
  const item = useContext(LegendContext);
  if (!item) return null;
  return (
    <span className={cn("text-sm text-muted-foreground", className)}>
      {item.label}
    </span>
  );
}

LegendLabel.displayName = "LegendLabel";

// ─── Re-exports ──────────────────────────────────────────────────────────────

export { VisxLinearGradient as LinearGradient };

// PatternLines

export function PatternLines({
  id,
  width = 6,
  height = 6,
  stroke = "var(--chart-line-primary)",
  strokeWidth = 1,
  orientation = ["diagonal"],
}) {
  const paths = [];

  for (const o of orientation) {
    if (o === "diagonal") {
      paths.push(`M0,${height}l${width},${-height}`);
      paths.push(`M${-width / 4},${height / 4}l${width / 2},${-height / 2}`);
      paths.push(
        `M${(3 * width) / 4},${height + height / 4}l${width / 2},${-height / 2}`
      );
    } else if (o === "horizontal") {
      paths.push(`M0,${height / 2}l${width},0`);
    } else if (o === "vertical") {
      paths.push(`M${width / 2},0l0,${height}`);
    }
  }

  return (
    <defs>
      <pattern
        id={id}
        width={width}
        height={height}
        patternUnits="userSpaceOnUse"
      >
        <path
          d={paths.join(" ")}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="square"
        />
      </pattern>
    </defs>
  );
}

PatternLines.displayName = "PatternLines";

// ─── BarLineIndicator ─────────────────────────────────────────────────────────

export function BarLineIndicator({
  valueKey,
  xKey,
  labelKey,
  stroke = chartCssVars.linePrimary,
  strokeWidth = 2,
  strokeDasharray,
  showMarkers = true,
  showLabels = true,
  valueFormatter,
}) {
  const { data, xScale, yScale, bandWidth, isLoaded, animationDuration } = useChart();

  const points = useMemo(() => {
    return data.map((d) => {
      const category = String(d[xKey] ?? "");
      const value = typeof d[valueKey] === "number" ? d[valueKey] : 0;
      const x = (xScale(category) ?? 0) + bandWidth / 2;
      const y = yScale(value) ?? 0;
      return { x, y };
    });
  }, [data, valueKey, xKey, xScale, yScale, bandWidth]);

  if (points.length < 2) return null;

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");

  return (
    <g>
      <motion.path
        d={pathD}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: isLoaded ? 1 : 0, opacity: isLoaded ? 1 : 0 }}
        transition={{
          pathLength: { duration: animationDuration / 1000, ease: "easeOut" },
          opacity: { duration: 0.3 },
        }}
      />
      {showMarkers &&
        points.map((p, i) => (
          <circle
            key={`marker-${i}`}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={stroke}
            stroke="#ffffff"
            strokeWidth={1.5}
            style={{ pointerEvents: 'none' }}
          />
        ))}
      {showLabels &&
        points.map((p, i) => {
          const item = data[i];
          if (!item) return null;
          const rawVal = item[labelKey];
          let displayVal = '';
          if (valueFormatter) {
            displayVal = valueFormatter(rawVal);
          } else {
            displayVal = rawVal !== undefined && rawVal !== null
              ? `${Number(rawVal).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
              : '';
          }
          return (
            <text
              key={`label-${i}`}
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              fill="#ffffff"
              fontSize={10}
              fontWeight={600}
              style={{
                pointerEvents: 'none',
                textShadow: '0 0 4px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)'
              }}
            >
              {displayVal}
            </text>
          );
        })}
    </g>
  );
}

BarLineIndicator.displayName = "BarLineIndicator";

// ─── BarChart Component ──────────────────────────────────────────────────────

function extractBarConfigs(children) {
  const configs = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return;
    }

    const childType = child.type;
    const componentName =
      typeof child.type === "function"
        ? childType.displayName || childType.name || ""
        : "";

    const props = child.props;
    const isBarComponent =
      componentName === "Bar" ||
      child.type === Bar ||
      (props && typeof props.dataKey === "string" && props.dataKey.length > 0);

    if (isBarComponent && props?.dataKey) {
      configs.push({
        dataKey: props.dataKey,
        fill: props.fill || "var(--chart-line-primary)",
        stroke: props.stroke,
      });
    }
  });

  return configs;
}

const DEFAULT_MARGIN = { top: 40, right: 40, bottom: 40, left: 40 };

function BarChartInner({
  width,
  height,
  data,
  xDataKey,
  margin,
  animationDuration,
  barGap,
  barWidth,
  orientation,
  stacked,
  stackGap,
  children,
  containerRef,
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);

  const bars = useMemo(() => extractBarConfigs(children), [children]);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const isHorizontal = orientation === "horizontal";

  const xScale = useMemo(() => {
    const domain = data.map((d) => String(d[xDataKey] ?? ""));
    return scaleBand({
      range: isHorizontal ? [0, innerHeight] : [0, innerWidth],
      domain,
      padding: barGap,
    });
  }, [data, xDataKey, innerWidth, innerHeight, barGap, isHorizontal]);

  const bandWidth = xScale.bandwidth();

  const yScale = useMemo(() => {
    let maxValue = 0;

    if (stacked) {
      for (const d of data) {
        let sum = 0;
        for (const bar of bars) {
          const value = d[bar.dataKey];
          if (typeof value === "number") {
            sum += value;
          }
        }
        if (sum > maxValue) maxValue = sum;
      }
    } else {
      for (const bar of bars) {
        for (const d of data) {
          const value = d[bar.dataKey];
          if (typeof value === "number" && value > maxValue) {
            maxValue = value;
          }
        }
      }
    }

    if (maxValue === 0) maxValue = 100;

    return scaleLinear({
      range: isHorizontal ? [innerWidth, 0] : [innerHeight, 0],
      domain: [0, maxValue * 1.1],
      nice: true,
    });
  }, [data, bars, innerWidth, innerHeight, stacked, isHorizontal]);

  const stackOffsets = useMemo(() => {
    if (!stacked) return new Map();

    const offsets = new Map();
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      let cumulative = 0;
      const barOffsets = new Map();
      for (const bar of bars) {
        barOffsets.set(bar.dataKey, cumulative);
        const value = d[bar.dataKey];
        if (typeof value === "number") {
          if (isHorizontal) {
            cumulative += innerWidth - (yScale(value) ?? innerWidth);
          } else {
            cumulative += innerHeight - (yScale(value) ?? innerHeight);
          }
        }
      }
      offsets.set(i, barOffsets);
    }
    return offsets;
  }, [data, bars, stacked, yScale, innerHeight, innerWidth, isHorizontal]);

  const [tooltipData, setTooltipData] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, animationDuration);
    return () => clearTimeout(timer);
  }, [animationDuration]);

  const handleMouseMove = useCallback(
    (event) => {
      const point = localPoint(event);
      if (!point) return;

      const chartX = point.x - margin.left;
      const chartY = point.y - margin.top;

      const domain = xScale.domain();
      let foundIndex = -1;

      for (let i = 0; i < domain.length; i++) {
        const cat = domain[i];
        const bandStart = xScale(cat) ?? 0;
        const bandEnd = bandStart + bandWidth;

        if (isHorizontal) {
          if (chartY >= bandStart && chartY <= bandEnd) {
            foundIndex = i;
            break;
          }
        } else {
          if (chartX >= bandStart && chartX <= bandEnd) {
            foundIndex = i;
            break;
          }
        }
      }

      if (foundIndex >= 0) {
        setHoveredBarIndex(foundIndex);
        const d = data[foundIndex];

        const yPositions = {};
        const xPositions = {};
        for (const bar of bars) {
          const value = d[bar.dataKey];
          if (typeof value === "number") {
            if (isHorizontal) {
              xPositions[bar.dataKey] = yScale(value) ?? 0;
              yPositions[bar.dataKey] = (xScale(domain[foundIndex]) ?? 0) + bandWidth / 2;
            } else {
              yPositions[bar.dataKey] = yScale(value) ?? 0;
              xPositions[bar.dataKey] = (xScale(domain[foundIndex]) ?? 0) + bandWidth / 2;
            }
          }
        }

        const tooltipX = isHorizontal
          ? yScale(Number(d[bars[0]?.dataKey ?? ""] ?? 0)) ?? 0
          : (xScale(domain[foundIndex]) ?? 0) + bandWidth / 2;

        setTooltipData({
          point: d,
          index: foundIndex,
          x: tooltipX,
          yPositions,
          xPositions,
        });
      } else {
        setHoveredBarIndex(null);
        setTooltipData(null);
      }
    },
    [xScale, yScale, data, bars, margin, bandWidth, isHorizontal, innerWidth]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredBarIndex(null);
    setTooltipData(null);
  }, []);

  if (width < 10 || height < 10) {
    return null;
  }

  const contextValue = {
    data,
    xScale,
    yScale,
    width,
    height,
    innerWidth,
    innerHeight,
    margin,
    bandWidth,
    tooltipData,
    setTooltipData,
    containerRef,
    bars,
    isLoaded,
    animationDuration,
    xDataKey,
    hoveredBarIndex,
    setHoveredBarIndex,
    orientation,
    stacked,
    stackGap,
    stackOffsets,
    barGap,
    barWidth,
  };

  return (
    <BarChartProvider value={contextValue}>
      <svg 
        aria-hidden="true" 
        height={height} 
        width={width}
        onMouseLeave={isLoaded ? handleMouseLeave : undefined}
      >
        <rect fill="transparent" height={height} width={width} x={0} y={0} />

        <g
          onMouseMove={isLoaded ? handleMouseMove : undefined}
          style={{
            cursor: isLoaded ? "crosshair" : "default",
            touchAction: "none",
          }}
          transform={`translate(${margin.left},${margin.top})`}
        >
          <rect
            fill="transparent"
            height={innerHeight}
            width={innerWidth}
            x={0}
            y={0}
          />

          {children}
        </g>
      </svg>
    </BarChartProvider>
  );
}

export function BarChart({
  data,
  xDataKey = "name",
  margin: marginProp,
  animationDuration = 1100,
  aspectRatio = "2 / 1",
  barGap = 0.2,
  barWidth,
  orientation = "vertical",
  stacked = false,
  stackGap = 0,
  className = "",
  children,
}) {
  const containerRef = useRef(null);
  const margin = { ...DEFAULT_MARGIN, ...marginProp };

  return (
    <div
      className={cn("relative w-full", className)}
      ref={containerRef}
      style={{
        aspectRatio,
        height: aspectRatio === "auto" ? "100%" : undefined,
        touchAction: "none",
        position: "relative",
        width: "100%"
      }}
    >
      <ParentSize debounceTime={10}>
        {({ width, height }) => (
          <BarChartInner
            animationDuration={animationDuration}
            barGap={barGap}
            barWidth={barWidth}
            containerRef={containerRef}
            data={data}
            height={height}
            margin={margin}
            orientation={orientation}
            stacked={stacked}
            stackGap={stackGap}
            width={width}
            xDataKey={xDataKey}
          >
            {children}
          </BarChartInner>
        )}
      </ParentSize>
    </div>
  );
}

export default BarChart;
