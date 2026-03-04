"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  ColorType,
  LineStyle,
  AreaSeries,
} from "lightweight-charts";
import type { PriceUpdate } from "@/lib/websocket";

interface PriceChartProps {
  chartData: [number, number][];
  livePrice: PriceUpdate | null;
  bet?: {
    direction: "up" | "down";
    price: string;
  } | null;
}

export function PriceChart({ chartData, livePrice, bet }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceLineRef = useRef<any>(null);
  const dataLoadedRef = useRef(false);

  // Initialize chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
        fontFamily: "var(--font-geist-sans), sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.03)" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: "rgba(255,255,255,0.1)",
        rightOffset: 0,
        shiftVisibleRangeOnNewBar: true,
        fixRightEdge: true,
        fixLeftEdge: true,
        lockVisibleTimeRangeOnResize: true,
      },
      handleScroll: false,
      handleScale: false,
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.1)",
        borderVisible: false,
      },
      crosshair: {
        vertLine: { color: "rgba(247,147,26,0.3)" },
        horzLine: { color: "rgba(247,147,26,0.3)" },
      },
    });

    const series = chart.addSeries(AreaSeries, {
      topColor: "rgba(247,147,26,0.4)",
      bottomColor: "rgba(247,147,26,0.0)",
      lineColor: "#f7931a",
      lineWidth: 2,
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    });
    chartRef.current = chart;
    seriesRef.current = series;
    dataLoadedRef.current = false;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLineRef.current = null;
      dataLoadedRef.current = false;
    };
  }, []);

  // Load/update historical data when it arrives
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || chartData.length === 0)
      return;
    if (dataLoadedRef.current) return; // only load once

    const seen = new Set<number>();
    const data = chartData
      .map(([time, value]) => ({ time: time as number, value }))
      .filter((d) => {
        if (seen.has(d.time)) return false;
        seen.add(d.time);
        return true;
      });
    seriesRef.current.setData(data as never);
    dataLoadedRef.current = true;

    // Show last hour by default
    const now = Math.floor(Date.now() / 1000);
    const oneHourAgo = now - 3600;
    try {
      chartRef.current.timeScale().setVisibleRange({
        from: oneHourAgo as never,
        to: (now + 60) as never,
      });
    } catch {
      chartRef.current.timeScale().fitContent();
    }
  }, [chartData]);

  // Update live price
  useEffect(() => {
    if (!seriesRef.current || !livePrice) return;

    const point = {
      time: Math.floor(Date.now() / 1000) as number,
      value: livePrice.price,
    };
    seriesRef.current.update(point as never);
    chartRef.current?.timeScale().scrollToRealTime();
  }, [livePrice]);

  // Bet price line
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    // Remove old price line
    if (priceLineRef.current) {
      series.removePriceLine(priceLineRef.current);
      priceLineRef.current = null;
    }

    if (bet) {
      const color = bet.direction === "up" ? "#22c55e" : "#ef4444";
      priceLineRef.current = series.createPriceLine({
        price: parseFloat(bet.price),
        color,
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `BET ${bet.direction.toUpperCase()}`,
      });
    }
  }, [bet]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
