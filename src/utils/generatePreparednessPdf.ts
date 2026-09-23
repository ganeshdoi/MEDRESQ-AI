import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { EvaluatedSupplyItem } from '../components/views/PredictiveConsumptionTrend.tsx';
import { PHCFacility } from '../types.ts';

export interface PreparednessPdfData {
  phc: PHCFacility;
  scenarioName: string;
  temperature: number;
  humidity: number;
  heatIndex: number;
  footfall: number;
  leadTimeDays: number;
  facilityPreparednessIndex: number;
  supplies: EvaluatedSupplyItem[];
  selectedMedicineId?: string;
  completedActions: string[];
  totalActionsCount: number;
  recommendedActions: Array<{ action: string; priority: string; category?: string }>;
}

export async function generatePreparednessPdf(data: PreparednessPdfData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Formatted date
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const reportRefId = `RAJ-DHS-EPI-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Find currently focused resource
  const activeSupply =
    data.supplies.find((s) => s.id === data.selectedMedicineId) || data.supplies[0];

  // Helper for drawing header bar
  const drawPageHeader = (pageNum: number, totalPages: number) => {
    // Government of Rajasthan Top Accent Bar
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, pageWidth, 5, 'F');
    doc.setFillColor(225, 29, 72); // Rose 600 accent stripe
    doc.rect(0, 5, pageWidth, 1.5, 'F');

    // Header Content
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('GOVERNMENT OF RAJASTHAN', margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('DEPARTMENT OF MEDICAL, HEALTH & FAMILY WELFARE • DHS EPIDEMIOLOGICAL CELL', margin, 16);

    // Reference & Date (Right aligned)
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`REPORT REF: ${reportRefId}`, pageWidth - margin, 12, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${dateStr} • ${timeStr}`, pageWidth - margin, 16, { align: 'right' });

    // Thin separator line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, 18.5, pageWidth - margin, 18.5);
  };

  // Helper for drawing footer
  const drawPageFooter = (pageNum: number, totalPages: number) => {
    const footerY = pageHeight - 10;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Integrated Health & Heatwave Preparedness System • Official Planning & Clinical Inventory Document • Non-Diagnostic Advisory',
      margin,
      footerY + 2
    );

    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY + 2, {
      align: 'right'
    });
  };

  // -------------------------------------------------------------
  // PAGE 1: Executive Summary, Meteorological Telemetry & 30-Day Chart
  // -------------------------------------------------------------
  drawPageHeader(1, 2);

  let curY = 24;

  // Document Title Banner
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, curY, contentWidth, 22, 2, 2, 'FD');

  doc.setTextColor(190, 18, 60); // Rose 700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CLIMATE SURGE & EPIDEMIOLOGICAL HEALTH PREPAREDNESS AUDIT', margin + 3, curY + 5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('30-Day Predictive Resource Consumption & Risk Alert Summary', margin + 3, curY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Facility: ${data.phc.name} (${data.phc.block}, ${data.phc.district})  |  Mandore Regional Warehouse Route  |  Preparedness Index: ${data.facilityPreparednessIndex}/100`,
    margin + 3,
    curY + 17
  );

  curY += 26;

  // 6-Grid Meteorological & Operational Indicators
  const colWidth = (contentWidth - 10) / 3;
  const cardHeight = 15;

  const indicators = [
    {
      label: '1. Ambient Temperature',
      val: `${data.temperature}°C (Heatwave Alert)`,
      sub: `Heat Index: ${data.heatIndex}°C Severe`,
      color: [190, 18, 60] // Rose
    },
    {
      label: '2. Relative Humidity',
      val: `${data.humidity}% (Dry Desert Loo)`,
      sub: 'Extreme Evaporative Dehydration',
      color: [217, 119, 6] // Amber
    },
    {
      label: '3. OPD Patient Footfall',
      val: `${data.footfall} Patients / Day`,
      sub: `+${Math.round(((data.footfall - 180) / 180) * 100)}% Surge vs Normal Baseline`,
      color: [15, 23, 42] // Slate
    },
    {
      label: '4. RMSCL Lead Time',
      val: `${data.leadTimeDays} Days Transit ETA`,
      sub: 'Mandore Regional Hub to PHC',
      color: [67, 56, 202] // Indigo
    },
    {
      label: '5. Monitored Medicine',
      val: `${activeSupply.name}`,
      sub: `Current Stock: ${activeSupply.currentStock} ${activeSupply.unit}`,
      color: [13, 148, 136] // Teal
    },
    {
      label: '6. Simulation Scenario',
      val: data.scenarioName.length > 25 ? `${data.scenarioName.substring(0, 23)}...` : data.scenarioName,
      sub: `Preparedness Index: ${data.facilityPreparednessIndex}%`,
      color: [4, 120, 87] // Emerald
    }
  ];

  for (let i = 0; i < indicators.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = margin + col * (colWidth + 5);
    const y = curY + row * (cardHeight + 3);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, colWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(indicators[i].label, x + 2.5, y + 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const [r, g, b] = indicators[i].color;
    doc.setTextColor(r, g, b);
    doc.text(indicators[i].val, x + 2.5, y + 8.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(indicators[i].sub, x + 2.5, y + 12.5);
  }

  curY += cardHeight * 2 + 8;

  // Chart Title Header
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(
    `30-Day Predictive Consumption Trend Line vs Historical Seasonal Benchmark & Inventory`,
    margin,
    curY
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Resource Focus: ${activeSupply.name} (${activeSupply.category}) • Unit: ${activeSupply.unit} • Current On-Hand: ${activeSupply.currentStock}`,
    margin,
    curY + 4
  );

  curY += 7;

  // Capture Recharts Canvas Snapshot
  let chartCaptured = false;
  try {
    const chartContainer =
      document.getElementById('predictive-trend-chart-container') ||
      document.querySelector('[data-chart-container="predictive-trend"]');

    if (chartContainer) {
      const canvas = await html2canvas(chartContainer as HTMLElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const chartImgHeight = 84; // mm
      doc.addImage(imgData, 'PNG', margin, curY, contentWidth, chartImgHeight);
      curY += chartImgHeight + 4;
      chartCaptured = true;
    }
  } catch (err) {
    console.warn('html2canvas capture fallback:', err);
  }

  // If chart capture wasn't possible, draw a high-fidelity vector representation in PDF
  if (!chartCaptured) {
    const fallbackHeight = 65;
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, curY, contentWidth, fallbackHeight, 2, 2, 'FD');

    // Chart Title in Box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `Predictive 30-Day Consumption Curve & Inventory Depletion Horizon (${activeSupply.shortName})`,
      margin + 4,
      curY + 7
    );

    // Axes lines
    const axisLeft = margin + 18;
    const axisBottom = curY + fallbackHeight - 12;
    const axisRight = margin + contentWidth - 10;
    const axisTop = curY + 14;

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(axisLeft, axisTop, axisLeft, axisBottom); // Left Y
    doc.line(axisLeft, axisBottom, axisRight, axisBottom); // X axis
    doc.line(axisRight, axisTop, axisRight, axisBottom); // Right Y

    // Reference Line: Current Stock Level
    doc.setDrawColor(13, 148, 136); // Teal
    doc.setLineWidth(0.6);
    doc.line(axisLeft, axisTop + 10, axisRight, axisTop + 10);
    doc.setFontSize(6.5);
    doc.setTextColor(13, 148, 136);
    doc.text(`Current Stock: ${activeSupply.currentStock} ${activeSupply.unit}`, axisLeft + 2, axisTop + 9);

    // Reference Line: Critical Buffer Floor
    doc.setDrawColor(225, 29, 72); // Rose
    doc.line(axisLeft, axisBottom - 8, axisRight, axisBottom - 8);
    doc.setTextColor(225, 29, 72);
    doc.text(`Critical Buffer Min: ${activeSupply.criticalBufferMin} ${activeSupply.unit}`, axisLeft + 2, axisBottom - 9);

    // Depletion Curve
    doc.setDrawColor(13, 148, 136);
    doc.setLineWidth(0.8);
    const daysSafe = Math.min(30, activeSupply.daysOfSafeStock);
    const interceptX = axisLeft + (daysSafe / 30) * (axisRight - axisLeft);
    doc.line(axisLeft, axisTop + 10, interceptX, axisBottom);

    // Stockout Intercept Callout
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(interceptX - 12, axisBottom - 18, 28, 8, 1, 1, 'FD');
    doc.setTextColor(190, 18, 60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text(`Stockout: Day ${activeSupply.daysOfSafeStock}`, interceptX - 10, axisBottom - 13);

    // Predictive Burn Curve (Surge)
    doc.setDrawColor(225, 29, 72);
    doc.setLineWidth(0.9);
    doc.line(axisLeft, axisBottom - 12, axisLeft + 40, axisTop + 15);
    doc.line(axisLeft + 40, axisTop + 15, axisRight, axisTop + 24);

    // Historical 2025 benchmark
    doc.setDrawColor(217, 119, 6);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(axisLeft, axisBottom - 16, axisRight, axisTop + 28);
    doc.setLineDashPattern([], 0); // reset

    // Legend
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text('— 2026 Predictive Burn Surge', axisLeft, axisBottom + 6);
    doc.setTextColor(217, 119, 6);
    doc.text('- - 2025 Heatwave Benchmark', axisLeft + 45, axisBottom + 6);
    doc.setTextColor(13, 148, 136);
    doc.text('— Current Inventory Depletion', axisLeft + 90, axisBottom + 6);

    curY += fallbackHeight + 4;
  }

  // Key Chart Findings Interpretation Box
  doc.setFillColor(254, 242, 242); // Rose 50
  doc.setDrawColor(254, 205, 211); // Rose 200
  doc.roundedRect(margin, curY, contentWidth, 23, 2, 2, 'FD');

  doc.setTextColor(159, 18, 57); // Rose 800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('EPIDEMIOLOGICAL PREDICTIVE SYNTHESIS & DEPLETION AUDIT:', margin + 3, curY + 5);

  const daysToStockout = activeSupply.daysOfSafeStock;
  const leadTime = data.leadTimeDays;
  const deficitHours = Math.max(0, Math.round((leadTime - daysToStockout) * 24));
  const surgePct = Math.round(
    ((activeSupply.projectedDailyBurn - activeSupply.historicalBaseBurn) /
      activeSupply.historicalBaseBurn) *
      100
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const narrativeLine1 = `• 30-Day Forecast Dynamics: Thermal stress of ${data.temperature}°C drives a +${surgePct}% surge in ${activeSupply.shortName} consumption (${activeSupply.projectedDailyBurn} ${activeSupply.unit}/day vs baseline ${activeSupply.historicalBaseBurn}/day).`;
  const narrativeLine2 = `• Stockout Intercept: Physical stock of ${activeSupply.currentStock} ${activeSupply.unit} reaches complete depletion in ${daysToStockout} days, before RMSCL Mandore delivery arrival (${leadTime} days ETA).`;
  const narrativeLine3 = `• Unsecured Exposure Window: An unmitigated ${deficitHours}-hour stockout gap threatens clinical triage without emergency indent or sister-PHC lateral transfer.`;

  doc.text(narrativeLine1, margin + 3, curY + 10);
  doc.text(narrativeLine2, margin + 3, curY + 14);
  doc.text(narrativeLine3, margin + 3, curY + 18);

  drawPageFooter(1, 2);

  // -------------------------------------------------------------
  // PAGE 2: Associated Risk Alert Summaries, Matrix & Administrative Sign-off
  // -------------------------------------------------------------
  doc.addPage('a4', 'portrait');
  drawPageHeader(2, 2);

  curY = 24;

  // Section Header: Associated Risk Alert Summaries
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Associated Risk Alert Summaries & Supply Vulnerability Matrix', margin, curY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Real-time automated evaluation of heatwave pharmaceutical reserves against delivery lead-time thresholds.',
    margin,
    curY + 4
  );

  curY += 8;

  // Table Header
  const tableX = margin;
  const colW = [42, 22, 22, 24, 22, 24, 26]; // Total = 182mm
  const headers = [
    'Emergency Medicine',
    'Current Stock',
    'Surge Burn',
    'Safe Stock',
    'Lead Time',
    'Urgency Level',
    'Reorder Indent'
  ];

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(tableX, curY, contentWidth, 6.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);

  let headerX = tableX;
  for (let c = 0; c < headers.length; c++) {
    doc.text(headers[c], headerX + 2, curY + 4.5);
    headerX += colW[c];
  }

  curY += 6.5;

  // Table Rows for Monitored Supplies
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  data.supplies.forEach((item, idx) => {
    const rowY = curY;
    const isEven = idx % 2 === 0;

    // Alternating row background
    if (isEven) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.rect(tableX, rowY, contentWidth, 7, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(tableX, rowY + 7, tableX + contentWidth, rowY + 7);

    let cellX = tableX;

    // Col 0: Medicine Name
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.shortName}`, cellX + 2, rowY + 4.5);
    cellX += colW[0];

    // Col 1: Current Stock
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(`${item.currentStock} ${item.unit}`, cellX + 2, rowY + 4.5);
    cellX += colW[1];

    // Col 2: Surge Burn
    doc.text(`${item.projectedDailyBurn} / day`, cellX + 2, rowY + 4.5);
    cellX += colW[2];

    // Col 3: Days Safe Stock
    if (item.daysOfSafeStock < item.leadTimeDays) {
      doc.setTextColor(190, 18, 60);
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
    }
    doc.text(`${item.daysOfSafeStock} Days`, cellX + 2, rowY + 4.5);
    cellX += colW[3];

    // Col 4: Lead Time
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`${item.leadTimeDays} Days`, cellX + 2, rowY + 4.5);
    cellX += colW[4];

    // Col 5: Urgency Badge
    if (item.urgency === 'CRITICAL') {
      doc.setFillColor(254, 226, 226);
      doc.setTextColor(159, 18, 57);
      doc.roundedRect(cellX + 1, rowY + 1.2, 21, 4.6, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('CRITICAL', cellX + 3, rowY + 4.5);
    } else if (item.urgency === 'WARNING') {
      doc.setFillColor(254, 243, 199);
      doc.setTextColor(146, 64, 14);
      doc.roundedRect(cellX + 1, rowY + 1.2, 21, 4.6, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('WARNING', cellX + 3, rowY + 4.5);
    } else {
      doc.setFillColor(209, 250, 229);
      doc.setTextColor(6, 95, 70);
      doc.roundedRect(cellX + 1, rowY + 1.2, 21, 4.6, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('SECURE', cellX + 4.5, rowY + 4.5);
    }
    cellX += colW[5];

    // Col 6: Reorder Recommendation
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(4, 120, 87);
    doc.text(`+${item.recommendedReorder} ${item.unit}`, cellX + 2, rowY + 4.5);

    curY += 7;
  });

  curY += 5;

  // In-Depth Epidemiological Risk Alert Detail Cards
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('In-Depth Epidemiological Reasoning Behind Active Alerts', margin, curY);
  curY += 4;

  // Alert Card 1: Critical ORS Alert
  const alert1Height = 22;
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(248, 113, 113);
  doc.roundedRect(margin, curY, contentWidth, alert1Height, 1.5, 1.5, 'FD');

  doc.setTextColor(159, 18, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(
    'ALERT #1: CRITICAL ORS BUFFER EXHAUSTION BEFORE WAREHOUSE TRANSIT (Risk Score: 94/100)',
    margin + 3,
    curY + 4.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(
    '• Observed Signal: Ambient temperature of 44.8°C with 18% humidity triggered acute heat-exhaustion presentations across the OPD (surged to 310 OPD patients/day).',
    margin + 3,
    curY + 8.5
  );
  doc.text(
    '• Syndromic Correlation: Clinical presentations reflect severe dehydration and hyperthermia rather than enteric infections. ORS demand surge elasticity reaches 2.3× baseline.',
    margin + 3,
    curY + 12
  );
  doc.text(
    '• Administrative Directive: Immediately expedite pending order #ORD-2026-904 (+500 pkts) and execute lateral transfer of 600 sachets from PHC Mandore via green corridor.',
    margin + 3,
    curY + 15.5
  );
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(190, 18, 60);
  doc.text(
    'STATUS: Actionable Indent Required • RMSCL Mandore Route Transit Window: 3.5 Days.',
    margin + 3,
    curY + 19
  );

  curY += alert1Height + 4;

  // Alert Card 2: Intravenous Fluids
  const alert2Height = 20;
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(251, 191, 36);
  doc.roundedRect(margin, curY, contentWidth, alert2Height, 1.5, 1.5, 'FD');

  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(
    'ALERT #2: HIGH ALERT - INTRAVENOUS FLUID CONTINGENCY BUFFER DEPLETION (Risk Score: 86/100)',
    margin + 3,
    curY + 4.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(
    '• Observed Signal: Severe heat-collapse inpatient admissions requiring IV fluid resuscitation have risen from 2 cases/day to 9 cases/day.',
    margin + 3,
    curY + 8.5
  );
  doc.text(
    '• Supply Bottleneck: Normal Saline (0.9% NaCl) and Ringer Lactate reserves stand at 3.4 days and 2.5 days of safe stock, zero buffer against potential transport delays.',
    margin + 3,
    curY + 12
  );
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text(
    '• Administrative Directive: Dispatch Fast-Track Indent for +200 bottles of Normal Saline & +150 bottles of Ringer Lactate to avoid clinical stockout.',
    margin + 3,
    curY + 16
  );

  curY += alert2Height + 5;

  // Institutional Preparatory Action Plan Checklist Status
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(
    `Facility Preparatory Action Plan Status (${data.completedActions.length}/${data.totalActionsCount} Protocols Completed)`,
    margin,
    curY
  );
  curY += 4;

  const actionsListHeight = 23;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, contentWidth, actionsListHeight, 1.5, 1.5, 'FD');

  const actionsToDisplay = data.recommendedActions.slice(0, 4);
  actionsToDisplay.forEach((action, i) => {
    const isDone = data.completedActions.includes(action.action);
    const aY = curY + 4.5 + i * 4.6;

    if (isDone) {
      doc.setTextColor(4, 120, 87);
      doc.setFont('helvetica', 'bold');
      doc.text('[✓ COMPLETED]', margin + 3, aY);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.text(action.action.substring(0, 90), margin + 26, aY);
    } else {
      doc.setTextColor(180, 83, 9);
      doc.setFont('helvetica', 'bold');
      doc.text('[! PENDING]', margin + 3, aY);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.text(action.action.substring(0, 90), margin + 22, aY);
    }
  });

  curY += actionsListHeight + 6;

  // Verification & Sign-Off Authorization Block
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, curY, contentWidth, 24, 1.5, 1.5, 'FD');

  const signColW = contentWidth / 3;

  // Sign Column 1: Prepared By
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('1. PREPARED & AUDITED BY:', margin + 4, curY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Epidemiology Surveillance Officer', margin + 4, curY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Digital Verification: ID-SURV-${now.getFullYear()}`, margin + 4, curY + 14);
  doc.text(`Timestamp: ${timeStr}`, margin + 4, curY + 18);

  // Sign Column 2: Medical Officer In-Charge
  const col2X = margin + signColW;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('2. CLINICAL CONCURRENCE:', col2X + 4, curY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Medical Officer In-Charge (MOIC)', col2X + 4, curY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`${data.phc.name}`, col2X + 4, curY + 14);
  doc.text('Signature: ______________________', col2X + 4, curY + 19);

  // Sign Column 3: RMSCL Warehouse Indent Confirmation
  const col3X = margin + signColW * 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('3. RMSCL LOGISTICS ACKNOWLEDGEMENT:', col3X + 4, curY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('District Drug Warehouse (Mandore)', col3X + 4, curY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Fast-Track Dispatch Corridor Active', col3X + 4, curY + 14);
  doc.text('Official Stamp: [ ELECTRONIC AUDIT ]', col3X + 4, curY + 19);

  drawPageFooter(2, 2);

  // Trigger browser download
  const cleanPhcName = data.phc.name.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Health_Preparedness_Predictive_Report_${cleanPhcName}_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
