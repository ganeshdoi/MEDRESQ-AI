import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  TrendingDown,
  AlertTriangle,
  Calendar,
  Layers,
  Sparkles,
  Truck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Info,
  Clock
} from 'lucide-react';
import { MedicineItem } from '../../types.ts';
import { useApp } from '../../context/AppContext.tsx';

interface PredictiveInventoryTrendChartProps {
  selectedMedicine?: MedicineItem;
  allMedicines: MedicineItem[];
  onSelectMedicine?: (med: MedicineItem) => void;
  onDraftReorder?: (med: MedicineItem) => void;
}

interface DayTrendPoint {
  dayIndex: number;
  date: Date;
  dateLabel: string;
  projectedStock: number;
  projectedStockWithInward: number;
  upperBound: number;
  lowerBound: number;
  dailyConsumption: number;
  hasInwardDelivery: boolean;
  inwardQty: number;
  status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'EMPTY';
}

export const PredictiveInventoryTrendChart: React.FC<PredictiveInventoryTrendChartProps> = ({
  selectedMedicine,
  allMedicines,
  onSelectMedicine,
  onDraftReorder
}) => {
  const { selectedPHC } = useApp();

  // Active focus medicine
  const activeMed = selectedMedicine || allMedicines[0];

  // Simulation scenario parameters
  const [scenario, setScenario] = useState<'BASELINE' | 'HEATWAVE' | 'OUTBREAK'>('BASELINE');
  const [includeInward, setIncludeInward] = useState<boolean>(true);
  const [showConfidenceBands, setShowConfidenceBands] = useState<boolean>(true);
  const [compareMultiDrug, setCompareMultiDrug] = useState<boolean>(false);

  // SVG ref and responsive dimensions
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 380 });

  // Tooltip state for interactive hover
  const [hoveredData, setHoveredData] = useState<{
    point: DayTrendPoint;
    xPos: number;
    yPos: number;
  } | null>(null);

  // ResizeObserver for fluid responsiveness
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          const height = width < 640 ? 300 : 380;
          setDimensions({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Multipliers based on scenario
  const surgeMultiplier = useMemo(() => {
    switch (scenario) {
      case 'HEATWAVE':
        return activeMed?.category === 'Essential ORS/Fluids' ? 1.55 : 1.25;
      case 'OUTBREAK':
        return 1.7;
      case 'BASELINE':
      default:
        return 1.0;
    }
  }, [scenario, activeMed]);

  // Compute 30-Day Depletion Trajectory for Active Medicine
  const trendData = useMemo<DayTrendPoint[]>(() => {
    if (!activeMed) return [];

    const points: DayTrendPoint[] = [];
    const baseDate = new Date('2026-09-23T00:00:00');
    let currentLevel = activeMed.currentStock;
    let currentLevelWithInward = activeMed.currentStock;

    // Delivery arrival day index (default day 3 if pending orders exist)
    const inwardDayIndex = activeMed.pendingOrders > 0 ? 3 : -1;
    const inwardQty = activeMed.pendingOrders || 0;

    const baseBurn = activeMed.dailyConsumption;

    for (let day = 0; day <= 30; day++) {
      const pointDate = new Date(baseDate.getTime() + day * 24 * 60 * 60 * 1000);
      const dateLabel = day === 0 ? 'Today' : `Day +${day}`;

      // Inward delivery jump on delivery day
      const hasDelivery = day === inwardDayIndex && inwardQty > 0;
      if (hasDelivery) {
        currentLevelWithInward += inwardQty;
      }

      // Add mild weekday variance (OPD busiest Mon/Tue)
      const dayOfWeek = pointDate.getDay();
      const weekdayFactor = dayOfWeek === 1 || dayOfWeek === 2 ? 1.15 : dayOfWeek === 0 ? 0.75 : 1.0;
      const effectiveDailyDemand = Math.round(baseBurn * surgeMultiplier * weekdayFactor);

      if (day > 0) {
        currentLevel = Math.max(0, currentLevel - effectiveDailyDemand);
        currentLevelWithInward = Math.max(0, currentLevelWithInward - effectiveDailyDemand);
      }

      // Bounds for uncertainty
      const uncertainty = Math.sqrt(day + 1) * (baseBurn * 0.18);
      const upper = Math.max(0, Math.round(currentLevel + uncertainty * 1.2));
      const lower = Math.max(0, Math.round(currentLevel - uncertainty * 1.5));

      let status: DayTrendPoint['status'] = 'SAFE';
      const evalLevel = includeInward ? currentLevelWithInward : currentLevel;
      if (evalLevel <= 0) {
        status = 'EMPTY';
      } else if (evalLevel < activeMed.minStockLevel * 0.5) {
        status = 'CRITICAL';
      } else if (evalLevel < activeMed.minStockLevel) {
        status = 'WARNING';
      }

      points.push({
        dayIndex: day,
        date: pointDate,
        dateLabel,
        projectedStock: currentLevel,
        projectedStockWithInward: currentLevelWithInward,
        upperBound: upper,
        lowerBound: lower,
        dailyConsumption: effectiveDailyDemand,
        hasInwardDelivery: hasDelivery,
        inwardQty,
        status
      });
    }

    return points;
  }, [activeMed, surgeMultiplier, includeInward]);

  // Compute trajectories for multi-drug comparison (normalized to % of baseline capacity)
  const comparisonMeds = useMemo(() => {
    return allMedicines.slice(0, 5);
  }, [allMedicines]);

  // Stockout intersection day
  const stockoutPoint = useMemo(() => {
    const list = trendData;
    const targetKey = includeInward ? 'projectedStockWithInward' : 'projectedStock';
    return list.find((pt) => pt[targetKey] <= 0);
  }, [trendData, includeInward]);

  // Render D3 Chart
  useEffect(() => {
    if (!svgRef.current || trendData.length === 0 || !activeMed) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = {
      top: 25,
      right: 35,
      bottom: 40,
      left: dimensions.width < 640 ? 45 : 60
    };
    const innerWidth = dimensions.width - margin.left - margin.right;
    const innerHeight = dimensions.height - margin.top - margin.bottom;

    if (innerWidth <= 0 || innerHeight <= 0) return;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale: 0 to 30 days
    const xScale = d3
      .scaleLinear()
      .domain([0, 30])
      .range([0, innerWidth]);

    // Y Scale: Stock level
    const maxValWithInward = includeInward
      ? d3.max(trendData, (d) => Math.max(d.projectedStockWithInward, d.upperBound)) || activeMed.currentStock
      : d3.max(trendData, (d) => Math.max(d.projectedStock, d.upperBound)) || activeMed.currentStock;

    const yMax = Math.max(
      activeMed.maxStockLevel * 0.9,
      activeMed.minStockLevel * 1.5,
      maxValWithInward * 1.15
    );

    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([innerHeight, 0]);

    // Gradient Definitions
    const defs = svg.append('defs');

    // Confidence Band Gradient
    const confidenceGrad = defs
      .append('linearGradient')
      .attr('id', 'confidence-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    confidenceGrad
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#10b981')
      .attr('stop-opacity', 0.22);

    confidenceGrad
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#f43f5e')
      .attr('stop-opacity', 0.05);

    // Stock Area Fill Gradient
    const areaGrad = defs
      .append('linearGradient')
      .attr('id', 'stock-fill-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGrad
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#059669')
      .attr('stop-opacity', 0.35);

    areaGrad
      .append('stop')
      .attr('offset', '70%')
      .attr('stop-color', '#f59e0b')
      .attr('stop-opacity', 0.15);

    areaGrad
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#e11d48')
      .attr('stop-opacity', 0.02);

    // Horizontal Grid Lines
    const yGrid = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'grid')
      .call(yGrid)
      .selectAll('line')
      .attr('stroke', '#f1f5f9')
      .attr('stroke-width', 1);

    g.select('.grid .domain').remove();

    // Red Danger Zone Below Minimum Safety Buffer
    if (activeMed.minStockLevel < yMax) {
      g.append('rect')
        .attr('x', 0)
        .attr('y', yScale(activeMed.minStockLevel))
        .attr('width', innerWidth)
        .attr('height', innerHeight - yScale(activeMed.minStockLevel))
        .attr('fill', '#ffe4e6')
        .attr('opacity', 0.35);
    }

    // Lead Time Window Zone (First 3.5 Days)
    const leadTimeX = xScale(3.5);
    g.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', leadTimeX)
      .attr('height', innerHeight)
      .attr('fill', '#f8fafc')
      .attr('opacity', 0.65);

    g.append('text')
      .attr('x', 6)
      .attr('y', 14)
      .attr('font-size', '9px')
      .attr('font-weight', '700')
      .attr('fill', '#64748b')
      .attr('letter-spacing', '0.05em')
      .text('RMSCL LEAD TIME (3.5 DAYS)');

    // Safety Reserve Threshold Reference Line
    if (activeMed.minStockLevel < yMax) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(activeMed.minStockLevel))
        .attr('y2', yScale(activeMed.minStockLevel))
        .attr('stroke', '#e11d48')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '5 4');

      g.append('text')
        .attr('x', innerWidth - 6)
        .attr('y', yScale(activeMed.minStockLevel) - 6)
        .attr('text-anchor', 'end')
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .attr('fill', '#be123c')
        .text(`Safety Reserve (${activeMed.minStockLevel} ${activeMed.unit})`);
    }

    // Shaded Confidence Area
    if (showConfidenceBands && !compareMultiDrug) {
      const confidenceArea = d3
        .area<DayTrendPoint>()
        .x((d) => xScale(d.dayIndex))
        .y0((d) => yScale(Math.max(0, d.lowerBound)))
        .y1((d) => yScale(Math.min(yMax, d.upperBound)))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(trendData)
        .attr('fill', 'url(#confidence-gradient)')
        .attr('d', confidenceArea);
    }

    // Primary Stock Trajectory Area
    const activeKey = includeInward ? 'projectedStockWithInward' : 'projectedStock';

    if (!compareMultiDrug) {
      const stockArea = d3
        .area<DayTrendPoint>()
        .x((d) => xScale(d.dayIndex))
        .y0(innerHeight)
        .y1((d) => yScale(d[activeKey]))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(trendData)
        .attr('fill', 'url(#stock-fill-gradient)')
        .attr('d', stockArea);

      // Primary Trend Line
      const stockLine = d3
        .line<DayTrendPoint>()
        .x((d) => xScale(d.dayIndex))
        .y((d) => yScale(d[activeKey]))
        .curve(d3.curveMonotoneX);

      const path = g
        .append('path')
        .datum(trendData)
        .attr('fill', 'none')
        .attr('stroke', '#059669')
        .attr('stroke-width', 3)
        .attr('d', stockLine);

      // Animate line draw
      const totalLength = path.node()?.getTotalLength() || 0;
      path
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);
    } else {
      // MULTI-DRUG COMPARATIVE OVERLAY
      const drugColors = ['#059669', '#2563eb', '#d97706', '#dc2626', '#9333ea'];
      comparisonMeds.forEach((med, idx) => {
        const medColor = drugColors[idx % drugColors.length];
        const medBurn = med.dailyConsumption * surgeMultiplier;
        const pts: { day: number; stock: number }[] = [];
        let curr = med.currentStock;

        for (let d = 0; d <= 30; d++) {
          if (d > 0) curr = Math.max(0, curr - medBurn);
          pts.push({ day: d, stock: curr });
        }

        const medLine = d3
          .line<{ day: number; stock: number }>()
          .x((d) => xScale(d.day))
          .y((d) => yScale(d.stock))
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(pts)
          .attr('fill', 'none')
          .attr('stroke', medColor)
          .attr('stroke-width', med.id === activeMed.id ? 3.5 : 2)
          .attr('stroke-opacity', med.id === activeMed.id ? 1.0 : 0.65)
          .attr('stroke-dasharray', med.id === activeMed.id ? null : '4 3')
          .attr('d', medLine);
      });
    }

    // Inward Replenishment Step Marker
    if (includeInward && activeMed.pendingOrders > 0 && !compareMultiDrug) {
      const delivPt = trendData.find((d) => d.hasInwardDelivery);
      if (delivPt) {
        const xPos = xScale(delivPt.dayIndex);
        const yTop = yScale(delivPt.projectedStockWithInward);
        const yBottom = yScale(delivPt.projectedStock);

        g.append('line')
          .attr('x1', xPos)
          .attr('x2', xPos)
          .attr('y1', yBottom)
          .attr('y2', yTop)
          .attr('stroke', '#2563eb')
          .attr('stroke-width', 2.5)
          .attr('stroke-dasharray', '2 2');

        g.append('circle')
          .attr('cx', xPos)
          .attr('cy', yTop)
          .attr('r', 5)
          .attr('fill', '#2563eb')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2);

        g.append('text')
          .attr('x', xPos + 8)
          .attr('y', yTop + 3)
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .attr('fill', '#1d4ed8')
          .text(`+${activeMed.pendingOrders} ${activeMed.unit} Inward Receipt`);
      }
    }

    // Stockout Intersection Marker
    if (stockoutPoint && !compareMultiDrug) {
      const soX = xScale(stockoutPoint.dayIndex);
      const soY = innerHeight;

      // Pulse circle
      g.append('circle')
        .attr('cx', soX)
        .attr('cy', soY)
        .attr('r', 7)
        .attr('fill', '#e11d48')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2);

      // Warning text callout
      g.append('text')
        .attr('x', Math.min(innerWidth - 10, soX))
        .attr('y', soY - 14)
        .attr('text-anchor', soX > innerWidth * 0.75 ? 'end' : 'start')
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .attr('fill', '#be123c')
        .text(`CRITICAL STOCKOUT (Day +${stockoutPoint.dayIndex})`);
    }

    // X Axis with Day ticks
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(dimensions.width < 640 ? 6 : 10)
      .tickFormat((d) => (d === 0 ? 'Today' : `D+${d}`));

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('fill', '#64748b')
      .attr('dy', '1em');

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => `${d}`);

    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('fill', '#64748b');

    // Axis Labels
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', '#64748b')
      .text('Forecasted Timeline (Days from Current Date)');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -42)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', '#64748b')
      .text(`Inventory Balance (${activeMed.unit})`);

    // Interactive Hover Overlay
    const bisect = d3.bisector<DayTrendPoint, number>((d) => d.dayIndex).center;

    // Crosshair line
    const crosshair = g
      .append('line')
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3 3')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .style('opacity', 0);

    const focusCircle = g
      .append('circle')
      .attr('r', 5)
      .attr('fill', '#059669')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2.5)
      .style('opacity', 0);

    // Overlay Rect for Pointer Events
    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const dayHovered = xScale.invert(mx);
        const clampedDay = Math.max(0, Math.min(30, Math.round(dayHovered)));
        const point = trendData[clampedDay];

        if (point) {
          const ptX = xScale(point.dayIndex);
          const ptY = yScale(point[activeKey]);

          crosshair
            .attr('x1', ptX)
            .attr('x2', ptX)
            .style('opacity', 1);

          focusCircle
            .attr('cx', ptX)
            .attr('cy', ptY)
            .attr('fill', point[activeKey] <= 0 ? '#e11d48' : point[activeKey] < activeMed.minStockLevel ? '#f59e0b' : '#059669')
            .style('opacity', 1);

          setHoveredData({
            point,
            xPos: ptX + margin.left,
            yPos: ptY + margin.top
          });
        }
      })
      .on('mouseleave', () => {
        crosshair.style('opacity', 0);
        focusCircle.style('opacity', 0);
        setHoveredData(null);
      });
  }, [
    dimensions,
    trendData,
    activeMed,
    surgeMultiplier,
    includeInward,
    showConfidenceBands,
    compareMultiDrug,
    comparisonMeds
  ]);

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              D3.js Mathematical Forecasting Engine
            </span>
            <span className="text-xs text-slate-500 font-mono">30-Day Depletion Horizon</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-emerald-600" />
            <span>Predictive Inventory Depletion & Stockout Runout Chart</span>
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Algorithmic simulation of dynamic formulary depletion rates across climate surges, lead-time thresholds, and scheduled inward consignments for <strong>{selectedPHC.name}</strong>.
          </p>
        </div>

        {/* Action Controls & Indent Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          {onDraftReorder && activeMed && (
            <button
              type="button"
              onClick={() => onDraftReorder(activeMed)}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Draft Indent Requisition</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Interactive Controls & Selectors Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
        {/* Medicine Selector Dropdown */}
        <div className="md:col-span-4 flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-700">Primary Focus Medicine:</label>
          <select
            value={activeMed.id}
            onChange={(e) => {
              const found = allMedicines.find((m) => m.id === e.target.value);
              if (found && onSelectMedicine) onSelectMedicine(found);
            }}
            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
          >
            {allMedicines.map((med) => (
              <option key={med.id} value={med.id}>
                {med.name} ({med.currentStock} {med.unit}) - {med.stockoutRisk}
              </option>
            ))}
          </select>
        </div>

        {/* Climate / Surge Scenario Selector */}
        <div className="md:col-span-3 flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-700">Depletion Scenario:</label>
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value as any)}
            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
          >
            <option value="BASELINE">Standard Baseline (1.0x)</option>
            <option value="HEATWAVE">Seasonal Heatwave (+35% Hydration)</option>
            <option value="OUTBREAK">Outbreak Epidemic Surge (+70%)</option>
          </select>
        </div>

        {/* Toggles */}
        <div className="md:col-span-5 flex flex-wrap items-center gap-3 pt-2 md:pt-4">
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 select-none">
            <input
              type="checkbox"
              checked={includeInward}
              onChange={(e) => setIncludeInward(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span>Include Inward Consignments</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 select-none">
            <input
              type="checkbox"
              checked={showConfidenceBands}
              onChange={(e) => setShowConfidenceBands(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span>95% CI Range</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 select-none">
            <input
              type="checkbox"
              checked={compareMultiDrug}
              onChange={(e) => setCompareMultiDrug(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span>Multi-Drug Overlay</span>
          </label>
        </div>
      </div>

      {/* 3. D3 SVG Canvas Area */}
      <div ref={containerRef} className="relative w-full overflow-hidden bg-slate-50/50 rounded-xl border border-slate-200">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-auto block select-none"
        />

        {/* Interactive Floating Tooltip */}
        {hoveredData && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-75 bg-slate-900/95 backdrop-blur-xs text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1.5"
            style={{
              left: Math.min(dimensions.width - 220, Math.max(10, hoveredData.xPos - 110)),
              top: Math.max(10, hoveredData.yPos - 130),
              width: '210px'
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-1">
              <span className="font-bold text-[11px] text-emerald-400">
                {hoveredData.point.dateLabel}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {hoveredData.point.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-sans">Stock Balance:</span>
                <span className="font-bold text-white">
                  {includeInward
                    ? hoveredData.point.projectedStockWithInward
                    : hoveredData.point.projectedStock}{' '}
                  {activeMed.unit}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-sans">Daily Demand:</span>
                <span className="text-slate-300">
                  {hoveredData.point.dailyConsumption} {activeMed.unit}/day
                </span>
              </div>

              {hoveredData.point.hasInwardDelivery && (
                <div className="flex justify-between items-center text-blue-400">
                  <span className="font-sans">Delivery:</span>
                  <span className="font-bold">+{hoveredData.point.inwardQty}</span>
                </div>
              )}

              <div className="pt-1 border-t border-slate-800 flex justify-between items-center">
                <span className="text-slate-400 font-sans">Risk Status:</span>
                <span
                  className={`font-bold font-sans text-[10px] px-1.5 py-0.5 rounded ${
                    hoveredData.point.status === 'EMPTY'
                      ? 'bg-rose-950 text-rose-300 border border-rose-700'
                      : hoveredData.point.status === 'CRITICAL'
                      ? 'bg-rose-900 text-rose-200'
                      : hoveredData.point.status === 'WARNING'
                      ? 'bg-amber-900 text-amber-200'
                      : 'bg-emerald-900 text-emerald-200'
                  }`}
                >
                  {hoveredData.point.status === 'EMPTY'
                    ? 'STOCKOUT ZERO'
                    : hoveredData.point.status === 'CRITICAL'
                    ? 'CRITICAL DEFICIT'
                    : hoveredData.point.status === 'WARNING'
                    ? 'BELOW BUFFER'
                    : 'SAFE OPERATING'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Legend & Multi-Drug Keys */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 pt-1">
        <div className="flex flex-wrap items-center gap-4">
          {!compareMultiDrug ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-1 bg-emerald-600 rounded-sm inline-block" />
                <span className="font-medium text-slate-700">Projected Trajectory</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-2 bg-emerald-200/60 rounded-xs inline-block" />
                <span className="font-medium text-slate-500">95% Confidence Interval</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 border-t-2 border-dashed border-rose-600 inline-block" />
                <span className="font-medium text-rose-700">Min Safety Buffer ({activeMed.minStockLevel} {activeMed.unit})</span>
              </div>
              {includeInward && activeMed.pendingOrders > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 border-t-2 border-dashed border-blue-600 inline-block" />
                  <span className="font-medium text-blue-700">Inward Supply Step (+{activeMed.pendingOrders})</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-800">Drugs Compared:</span>
              {comparisonMeds.map((med, idx) => {
                const colors = ['#059669', '#2563eb', '#d97706', '#dc2626', '#9333ea'];
                return (
                  <button
                    key={med.id}
                    type="button"
                    onClick={() => onSelectMedicine && onSelectMedicine(med)}
                    className="flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: colors[idx % colors.length] }}
                    />
                    <span className={med.id === activeMed.id ? 'font-bold text-slate-900' : 'text-slate-600'}>
                      {med.name.split(' ')[0]} ({med.currentStock})
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <span className="text-[11px] text-slate-500 font-mono">
          Hover anywhere on the curve to inspect daily balances
        </span>
      </div>

      {/* 5. Deep-Dive Predictive Intelligence Telemetry Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Projected Stockout Runout</span>
            <Clock className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {stockoutPoint ? `Day +${stockoutPoint.dayIndex}` : '> 30 Days Buffer'}
          </div>
          <span className="text-[11px] text-slate-500">
            {stockoutPoint
              ? `Exhaustion projected by ${stockoutPoint.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
              : 'Inventory remains above zero through month end'}
          </span>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Lead-Time Vulnerability</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              (stockoutPoint?.dayIndex || 99) <= 3.5 ? 'text-rose-700' : 'text-slate-900'
            }`}
          >
            {(stockoutPoint?.dayIndex || 99) <= 3.5 ? 'HIGH RISK' : 'CONTROLLED'}
          </div>
          <span className="text-[11px] text-slate-500">
            Standard warehouse replenishment lead time is <strong>3.5 days</strong>
          </span>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">30-Day Deficit Projection</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {Math.max(0, Math.round(activeMed.dailyConsumption * surgeMultiplier * 30 - activeMed.currentStock - (includeInward ? activeMed.pendingOrders : 0)))}{' '}
            <span className="text-xs font-normal text-slate-500">{activeMed.unit}</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Net deficit required to maintain 30-day target buffer
          </span>
        </div>
      </div>
    </div>
  );
};
