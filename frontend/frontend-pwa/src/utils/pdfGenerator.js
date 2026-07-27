import { jsPDF } from "jspdf";

/**
 * Generates a professional PDF Risk Assessment Report
 * @param {Object} data - The report data
 * @param {string} data.city - The name of the city
 * @param {string} data.risk - LOW, MODERATE, or HIGH
 * @param {number} data.rainfall - Rainfall in mm
 * @param {number} data.lat - Latitude
 * @param {number} data.lon - Longitude
 * @param {Array} data.reports - List of local community reports
 */
export function generateRiskReportPDF({ city, risk, rainfall, lat, lon, reports = [] }) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Colors
  const colors = {
    primary: [15, 23, 42],      // Slate 900
    secondary: [79, 142, 247],  // Accent Blue
    textDark: [33, 41, 54],     // Charcoal
    textMuted: [100, 116, 139], // Slate 500
    high: [239, 68, 68],        // Red
    mod: [245, 158, 11],        // Orange
    low: [16, 185, 129],        // Green
    bgLight: [248, 250, 252],   // Light Gray
  };

  // Helper to draw a horizontal line
  const hr = (y) => {
    doc.setDrawColor(226, 232, 240); // slate 200
    doc.line(20, y, 190, y);
  };

  // 1. Draw border / branding header
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, 210, 8, "F");

  // Title & Logo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...colors.primary);
  doc.text("DisasterWatch AI", 20, 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...colors.secondary);
  doc.text("REAL-TIME COMMUNITY DISASTER RESILIENCE ENGINE", 20, 30);

  // Date info
  const dateStr = new Date().toLocaleString();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...colors.textMuted);
  doc.text(`Generated: ${dateStr}`, 190, 25, { align: "right" });
  doc.text("System Level: MERN Active", 190, 30, { align: "right" });

  hr(35);

  // 2. Metadata Section (2-Column Grid)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...colors.primary);
  doc.text("Assessment Context", 20, 43);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...colors.textDark);
  doc.text(`Target Location: ${city}`, 20, 50);
  doc.text(`Coordinates: ${lat ? lat.toFixed(4) : "N/A"} N, ${lon ? lon.toFixed(4) : "N/A"} E`, 20, 56);

  doc.text(`Recent Rainfall (24h): ${rainfall || 0} mm`, 110, 50);
  doc.text(`Community Incident Reports: ${reports.length}`, 110, 56);

  hr(63);

  // 3. Risk Level Box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...colors.primary);
  doc.text("AI Risk Classification", 20, 71);

  // Determine risk color
  let riskColor = colors.low;
  let riskAdvice = "Conditions are currently stable. Remain vigilant and check local updates periodically.";
  if (risk === "HIGH") {
    riskColor = colors.high;
    riskAdvice = "IMMEDIATE ACTION REQUIRED. Extreme weather conditions and multiple local incidents reported. Prepare go-bags, review evacuation routes, and follow local authority directives.";
  } else if (risk === "MODERATE") {
    riskColor = colors.mod;
    riskAdvice = "ELEVATED ALERT. Moderate risk detected due to rising rainfall or cluster reports. Keep emergency gear accessible and monitor weather channels.";
  }

  // Draw risk card background
  doc.setFillColor(...colors.bgLight);
  doc.roundedRect(20, 76, 170, 28, 3, 3, "F");

  // Draw risk level pill
  doc.setFillColor(...riskColor);
  doc.roundedRect(26, 81, 38, 8, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`${risk} RISK`, 45, 86, { align: "center" });

  // Draw advice text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...colors.textDark);
  const splitAdvice = doc.splitTextToSize(riskAdvice, 115);
  doc.text(splitAdvice, 70, 85);

  hr(111);

  // 4. Incident Reports
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...colors.primary);
  doc.text("Active Local Incident Reports", 20, 119);

  let currentY = 126;
  const filteredReports = reports.filter(r => r.city?.toLowerCase() === city.toLowerCase()).slice(0, 4);

  if (filteredReports.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...colors.textMuted);
    doc.text("No active hazard or disaster reports recorded in this area within the tracking window.", 20, currentY);
    currentY += 10;
  } else {
    filteredReports.forEach((rep, idx) => {
      // Draw item indicator
      doc.setFillColor(...colors.primary);
      doc.circle(23, currentY - 1, 1, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...colors.textDark);
      doc.text(`${rep.type.toUpperCase()} [${rep.severity || "MODERATE"}]`, 28, currentY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...colors.textMuted);
      const timeStr = rep.created_at ? new Date(rep.created_at).toLocaleDateString() : "Just Now";
      doc.text(timeStr, 190, currentY, { align: "right" });

      currentY += 5;
      doc.setTextColor(...colors.textDark);
      const desc = rep.description || "No description provided.";
      const splitDesc = doc.splitTextToSize(desc, 160);
      doc.text(splitDesc, 28, currentY);
      currentY += (splitDesc.length * 4) + 3;
    });
  }

  hr(currentY);
  currentY += 8;

  // 5. Emergency Checklist
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...colors.primary);
  doc.text("Emergency Preparedness Action Items", 20, currentY);
  currentY += 7;

  const checklistItems = risk === "HIGH" 
    ? [
        "Store emergency fresh water (4 liters per person per day).",
        "Assemble primary disaster kit (charge power banks, pack non-perishable food).",
        "Secure vital paper documents in a waterproof portable folder.",
        "Locate the nearest emergency public shelter and plot primary & alternate routes.",
        "Program emergency numbers and local disaster management helplines."
      ]
    : [
        "Monitor local weather announcements and check for live dashboard reports.",
        "Keep smartphone devices fully charged and check backup batteries.",
        "Maintain basic household first aid kit inventory.",
        "Verify emergency exit paths in your residential area remain clear."
      ];

  checklistItems.forEach((item) => {
    // Draw checkbox
    doc.setDrawColor(...colors.primary);
    doc.rect(20, currentY - 3, 3, 3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...colors.textDark);
    doc.text(item, 26, currentY);
    currentY += 6;
  });

  // Footer branding
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...colors.textMuted);
  doc.text("This report is generated dynamically by your local community resilience system.", 105, 285, { align: "center" });
  doc.text("DisasterWatch AI Portfolio Project • Built using the MERN Stack (MongoDB, Express, React, Node)", 105, 289, { align: "center" });

  // Save the PDF
  doc.save(`DisasterWatch_Risk_Report_${city.replace(/\s+/g, "_")}.pdf`);
}
