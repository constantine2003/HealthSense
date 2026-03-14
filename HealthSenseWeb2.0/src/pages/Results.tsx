import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaDownload, FaCalendarCheck, FaPrint, FaShieldAlt, FaExclamationTriangle, FaCheckCircle, FaChevronDown } from "react-icons/fa";
import { FiActivity, FiThermometer, FiBarChart, FiHeart, FiInfo, FiAlertCircle } from "react-icons/fi";
import { MdHeight, MdMonitorWeight } from "react-icons/md";
import { supabase } from "../supabaseClient";
import { analyzeHealth } from "../utils/healthAnalysis";

type StatusType = "success" | "warning" | "danger";

interface HealthRecord {
  date: string;
  time: string;
  oxygen: string;
  temp: string;
  height: string;
  weight: string;
  bmi: string;
  bp: string;
}

// ─── PRINT STYLES ─────────────────────────────────────────────────────────────
const PRINT_STYLE_ID = "healthsense-print-styles";
function injectPrintStyles() {
  if (document.getElementById(PRINT_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = PRINT_STYLE_ID;
  style.textContent = `
    @media print {
      body > * { visibility: hidden; }
      #hs-print-region, #hs-print-region * { visibility: visible; }
      #hs-print-region {
        position: fixed; inset: 0; width: 100%; padding: 32px;
        background: white !important;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .hs-no-print { display: none !important; }
      #hs-print-region .hs-card {
        background: #f0f8ff !important; backdrop-filter: none !important;
        box-shadow: none !important; border: 1px solid #d0e8f8 !important;
      }
      #hs-print-region .hs-hero {
        background: #eaf4ff !important; backdrop-filter: none !important;
        box-shadow: none !important; border: 1px solid #c0d8f0 !important;
      }
      #hs-print-region .hs-grid { grid-template-columns: repeat(3, 1fr) !important; }
      #hs-print-region * { transform: none !important; }
    }
  `;
  document.head.appendChild(style);
}

let jsPDFLib: typeof import("jspdf")["default"] | null = null;
async function preloadPDFLibs() {
  if (!jsPDFLib) {
    const { default: jsPDF } = await import("jspdf");
    jsPDFLib = jsPDF;
  }
}
preloadPDFLibs().catch(() => {});

// ─── PDF BUILDER ──────────────────────────────────────────────────────────────
async function exportToPDF(record: HealthRecord, language: "English" | "Tagalog", units: "metric" | "imperial") {
  await preloadPDFLibs();
  const jsPDF = jsPDFLib!;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210;
  const MARGIN = 16;
  const COL = W - MARGIN * 2;
  let y = 0;

  // ── helpers ────────────────────────────────────────────────────────────────
  const hex = (h: string) => {
    const r = parseInt(h.slice(1, 3), 16);
    const g = parseInt(h.slice(3, 5), 16);
    const b = parseInt(h.slice(5, 7), 16);
    return [r, g, b] as [number, number, number];
  };
  const setFill = (h: string) => doc.setFillColor(...hex(h));
  const setDraw = (h: string) => doc.setDrawColor(...hex(h));
  const setTxt  = (h: string) => doc.setTextColor(...hex(h));

  const wrap = (text: string, maxW: number, size: number): string[] => {
    doc.setFontSize(size);
    return doc.splitTextToSize(text, maxW);
  };

  const pageH = 297;
  const checkPage = (needed: number) => {
    if (y + needed > pageH - 12) { doc.addPage(); y = 16; }
  };

  // ── HEADER BLOCK ──────────────────────────────────────────────────────────
  setFill("#0a4d61");
  doc.rect(0, 0, W, 32, "F");
  setTxt("#ffffff");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("HealthSense", MARGIN, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Health Checkup Report", MARGIN, 20);
  doc.text(`Generated: ${new Date().toLocaleString()}`, MARGIN, 26);

  // right side: date
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(record.date, W - MARGIN, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`at ${record.time}`, W - MARGIN, 20, { align: "right" });

  y = 40;

  // ── OVERALL STATUS ────────────────────────────────────────────────────────
  const isHealthy = Number(record.oxygen) >= 95 && Number(record.bmi) < 25;
  const statusColor = isHealthy ? "#16a34a" : "#ea580c";
  const statusLabel = isHealthy
    ? (language === "Tagalog" ? "NAPAKAHUSAY" : "EXCELLENT")
    : (language === "Tagalog" ? "MAAYOS" : "STABLE");

  setFill(statusColor);
  doc.roundedRect(MARGIN, y, COL, 14, 3, 3, "F");
  setTxt("#ffffff");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Overall Condition: ${statusLabel}`, W / 2, y + 9, { align: "center" });
  y += 20;

  // ── VITALS GRID (2 columns) ───────────────────────────────────────────────
  setTxt("#0a4d61");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Vital Signs", MARGIN, y);
  y += 6;

  const isMetric = units === "metric";
  const vitals: { label: string; value: string; unit: string; status: string; color: string }[] = [];

  // SpO2
  const spo2 = Number(record.oxygen);
  vitals.push({
    label: "SpO2 (Oxygen)",
    value: record.oxygen,
    unit: "%",
    status: isNaN(spo2) ? "No Data" : spo2 < 95 ? "Low" : "Normal",
    color: isNaN(spo2) ? "#f59e0b" : spo2 < 95 ? "#dc2626" : "#16a34a",
  });

  // Temperature
  const t = Number(record.temp);
  const displayTemp = isMetric ? t : (t * 9 / 5) + 32;
  vitals.push({
    label: "Temperature",
    value: isNaN(t) ? "--" : displayTemp.toFixed(1),
    unit: isMetric ? "°C" : "°F",
    status: isNaN(t) ? "No Data" : t > 39 ? "High Fever" : t > 37.5 ? "Fever" : "Normal",
    color: isNaN(t) ? "#f59e0b" : t > 39 ? "#dc2626" : t > 37.5 ? "#ea580c" : "#16a34a",
  });

  // Weight
  const w = Number(record.weight);
  const displayW = isMetric ? w : w * 2.20462;
  const b = Number(record.bmi);
  vitals.push({
    label: "Weight",
    value: isNaN(w) ? "--" : displayW.toFixed(1),
    unit: isMetric ? "kg" : "lb",
    status: isNaN(b) ? "No Data" : b < 18.5 ? "Underweight" : b >= 30 ? "Obese" : b >= 25 ? "Overweight" : "Normal",
    color: isNaN(b) ? "#f59e0b" : b < 18.5 || b >= 25 ? (b >= 30 ? "#dc2626" : "#ea580c") : "#16a34a",
  });

  // BMI
  vitals.push({
    label: "BMI",
    value: record.bmi,
    unit: "",
    status: isNaN(b) ? "No Data" : b < 18.5 ? "Underweight" : b >= 30 ? "Obese" : b >= 25 ? "Overweight" : "Normal",
    color: isNaN(b) ? "#f59e0b" : b < 18.5 || b >= 25 ? (b >= 30 ? "#dc2626" : "#ea580c") : "#16a34a",
  });

  // Height
  const rawH = Number(record.height);
  const heightM = rawH / 100;
  const displayH = isMetric ? heightM : heightM * 39.3701;
  vitals.push({
    label: "Height",
    value: isNaN(rawH) ? "--" : (isMetric ? heightM.toFixed(2) : displayH.toFixed(1)),
    unit: isMetric ? "m" : "in",
    status: "Normal",
    color: "#16a34a",
  });

  // Blood Pressure
  let bpStatus = "Normal", bpColor = "#16a34a";
  if (record.bp?.includes("/") && !record.bp.includes("--")) {
    const [sys, dia] = record.bp.split("/").map(Number);
    if (sys > 140 || dia > 90) { bpStatus = "High"; bpColor = "#dc2626"; }
    else if (sys > 120 || dia > 80) { bpStatus = "Elevated"; bpColor = "#ea580c"; }
  } else { bpStatus = "No Data"; bpColor = "#f59e0b"; }
  vitals.push({ label: "Blood Pressure", value: record.bp, unit: "mmHg", status: bpStatus, color: bpColor });

  // Draw 2-column grid
  const cellW = (COL - 6) / 2;
  const cellH = 20;
  vitals.forEach((v, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = MARGIN + col * (cellW + 6);
    const cy = y + row * (cellH + 4);

    checkPage(cellH + 4);

    setFill("#f0f8ff");
    setDraw("#d0e8f0");
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, cy, cellW, cellH, 2, 2, "FD");

    // status dot
    doc.setFillColor(...hex(v.color));
    doc.circle(cx + 5, cy + 5, 1.5, "F");

    setTxt("#139dc7");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(v.label.toUpperCase(), cx + 10, cy + 5.5);

    setTxt("#0a4d61");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${v.value}${v.unit}`, cx + 5, cy + 14);

    setTxt(v.color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(v.status, cx + cellW - 4, cy + 5.5, { align: "right" });
  });

  y += Math.ceil(vitals.length / 2) * (cellH + 4) + 8;

  // ── HEALTH INSIGHTS ───────────────────────────────────────────────────────
  const conditions = analyzeHealth(record);

  checkPage(16);
  setTxt("#0a4d61");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("AI Health Analysis", MARGIN, y);

  if (conditions.length === 0) {
    y += 5;
    checkPage(14);
    setFill("#f0fdf4");
    setDraw("#bbf7d0");
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, COL, 12, 2, 2, "FD");
    setTxt("#15803d");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("✓  All Vitals Normal — readings are within healthy ranges.", MARGIN + 5, y + 7.5);
    y += 18;
  } else {
    // summary line
    const high = conditions.filter(c => c.risk === "high").length;
    const mod  = conditions.filter(c => c.risk === "moderate").length;
    const low  = conditions.filter(c => c.risk === "low").length;
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setTxt("#64748b");
    doc.text(
      `${conditions.length} condition(s) detected — ${high} High Risk · ${mod} Moderate · ${low} Low Risk`,
      MARGIN, y
    );
    y += 6;

    const riskColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
      high:     { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626", label: "HIGH RISK" },
      moderate: { bg: "#fffbeb", border: "#fcd34d", text: "#b45309", label: "MODERATE"  },
      low:      { bg: "#f0f9ff", border: "#bae6fd", text: "#0369a1", label: "LOW RISK"  },
    };

    for (const cond of conditions) {
      const cfg = riskColors[cond.risk];
      const name = language === "Tagalog" ? cond.nameTagalog : cond.name;
      const explanation = language === "Tagalog" ? cond.explanationTagalog : cond.explanation;
      const lines = wrap(explanation, COL - 20, 8);
      const blockH = 8 + lines.length * 4.2 + 8;

      checkPage(blockH + 4);

      setFill(cfg.bg);
      setDraw(cfg.border);
      doc.setLineWidth(0.4);
      doc.roundedRect(MARGIN, y, COL, blockH, 2, 2, "FD");

      // left accent bar
      doc.setFillColor(...hex(cfg.text));
      doc.rect(MARGIN, y, 3, blockH, "F");

      // condition name
      setTxt(cfg.text);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(name, MARGIN + 7, y + 6);

      // risk badge
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.text(cfg.label, W - MARGIN - 2, y + 6, { align: "right" });

      // related vitals
      setTxt("#64748b");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(`Vitals: ${cond.relatedVitals.join(", ")}`, MARGIN + 7, y + 11);

      // explanation
      setTxt("#374151");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(lines, MARGIN + 7, y + 16);

      y += blockH + 4;
    }
  }

  // ── DISCLAIMER ────────────────────────────────────────────────────────────
  checkPage(14);
  y += 4;
  setFill("#f8fafc");
  setDraw("#e2e8f0");
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, COL, 12, 2, 2, "FD");
  setTxt("#94a3b8");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  const disclaimer = "This analysis is for informational purposes only and does not constitute medical advice. Consult a qualified healthcare professional for diagnosis and treatment.";
  const dLines = wrap(disclaimer, COL - 8, 7);
  doc.text(dLines, MARGIN + 4, y + 4.5);
  y += 14;

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    setTxt("#94a3b8");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("HealthSense Kiosk — Confidential Health Report", MARGIN, 291);
    doc.text(`Page ${p} of ${totalPages}`, W - MARGIN, 291, { align: "right" });
  }

  doc.save(`HealthSense_Report_${record.date.replace(/[\s,]+/g, "_")}.pdf`);
}

const Result: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [latestRecord, setLatestRecord] = useState<HealthRecord | null>(null);
  const [language, setLanguage] = useState<"English" | "Tagalog">("English");
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [expandedCondition, setExpandedCondition] = useState<number | null>(null);

  useEffect(() => { injectPrintStyles(); }, []);

  const content = {
    English: {
      back: "Back to Dashboard", header: "Latest Checkup Result", subHeader: "via HealthSense Kiosk",
      condition: "Overall Condition", excellent: "EXCELLENT", stable: "STABLE",
      summary: "Report Summary", print: "Print", export: "Export PDF", exporting: "Generating...",
      insights: "Health Insights", noRecord: "No Records Found", returnBtn: "Return to Dashboard",
      insightsTitle: "AI Health Analysis",
      insightsSubtitle: "Rule-based analysis of your vitals",
      allClear: "All Vitals Normal",
      allClearDesc: "Your readings are within healthy ranges. Keep up the great work!",
      riskLabels: { low: "Low Risk", moderate: "Moderate", high: "High Risk" },
      relatedVitals: "Related Vitals",
      disclaimer: "This analysis is for informational purposes only and does not constitute medical advice. Consult a qualified healthcare professional for diagnosis and treatment.",
      vitals: { spo2: "SpO2", temp: "Temperature", height: "Height", weight: "Weight", bmi: "BMI", bp: "Blood Pressure" },
      status: { normal: "Normal", low: "Low", high: "High", fever: "Fever", highFever: "High Fever", ideal: "Ideal", elevated: "Elevated", under: "Underweight", over: "Overweight", obese: "Obese", noData: "No Data" }
    },
    Tagalog: {
      back: "Bumalik sa Dashboard", header: "Pinakabagong Resulta", subHeader: "gamit ang HealthSense Kiosk",
      condition: "Pangkalahatang Kalagayan", excellent: "NAPAKAHUSAY", stable: "MAAYOS",
      summary: "Buod ng Report", print: "I-print", export: "I-download", exporting: "Ginagawa...",
      insights: "Kaalaman sa Kalusugan", noRecord: "Walang Nahanap na Record", returnBtn: "Bumalik sa Dashboard",
      insightsTitle: "AI Pagsusuri ng Kalusugan",
      insightsSubtitle: "Pagsusuri batay sa iyong mga vital signs",
      allClear: "Lahat ng Vital Signs ay Normal",
      allClearDesc: "Ang iyong mga resulta ay nasa malusog na range. Ipagpatuloy ang magandang gawi!",
      riskLabels: { low: "Mababang Panganib", moderate: "Katamtamang Panganib", high: "Mataas na Panganib" },
      relatedVitals: "Kaugnay na Vital Signs",
      disclaimer: "Ang pagsusuring ito ay para lamang sa impormasyon at hindi kapalit ng medikal na payo. Kumonsulta sa kwalipikadong doktor para sa diagnosis at lunas.",
      vitals: { spo2: "Oksiheno", temp: "Temperatura", height: "Tangkad", weight: "Timbang", bmi: "BMI", bp: "Presyon ng Dugo" },
      status: { normal: "Normal", low: "Mababa", high: "Mataas", fever: "May Lagnat", highFever: "Mataas na Lagnat", ideal: "Tamang Presyon", elevated: "Tumataas", under: "Payat", over: "Mabigat", obese: "Obese", noData: "Walang Data" }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/"); return; }
        const { data: profile } = await supabase.from("profiles").select("language, units").eq("id", user.id).single();
        if (profile?.language) setLanguage(profile.language as "English" | "Tagalog");
        if (profile?.units) setUnits(profile.units.toLowerCase() as "metric" | "imperial");
        const { data, error } = await supabase
          .from("health_checkups").select("spo2, temperature, height, weight, bmi, blood_pressure, created_at")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single();
        if (error) throw error;
        if (data) {
          const timestamp = new Date(data.created_at);
          setLatestRecord({
            date: timestamp.toLocaleDateString(profile?.language === "Tagalog" ? "tl-PH" : "en-US", { month: "long", day: "numeric", year: "numeric" }),
            time: timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            oxygen: data.spo2?.toString() || "--", temp: data.temperature?.toString() || "--",
            height: data.height?.toString() || "--", weight: data.weight?.toString() || "--",
            bmi: data.bmi?.toString() || "--", bp: data.blood_pressure || "--/--"
          });
        }
      } catch (err) { console.error("Error fetching data:", err); }
      finally { setTimeout(() => setLoading(false), 800); }
    };
    fetchData();
  }, [navigate]);

  const handlePrint = () => window.print();

  const handleExportPDF = async () => {
    if (!latestRecord) return;
    setExporting(true);
    try {
      await exportToPDF(latestRecord, language, units);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert(`PDF export failed: ${(err as Error).message ?? "Unknown error"}. Try the Print button instead.`);
    } finally { setExporting(false); }
  };

  const getHealthData = (record: HealthRecord) => {
    const lang = content[language];
    const isMetric = units === "metric";
    const { oxygen: spo2, temp, height, weight, bmi: bmiVal, bp } = record;
    const healthData = [];
    let spo2Status = lang.status.normal, spo2Type: StatusType = "success";
    const s = Number(spo2);
    if (isNaN(s)) { spo2Status = lang.status.noData; spo2Type = "warning"; }
    else if (s < 95) { spo2Status = lang.status.low; spo2Type = "danger"; }
    healthData.push({ title: lang.vitals.spo2, value: spo2, unit: "%", status: spo2Status, type: spo2Type, icon: <FiActivity /> });
    let tempStatus = lang.status.normal, tempType: StatusType = "success";
    const t = Number(temp);
    const displayTemp = isMetric ? t : (t * 9 / 5) + 32;
    if (isNaN(t)) { tempStatus = lang.status.noData; tempType = "warning"; }
    else if (t > 37.5 && t <= 39) { tempStatus = lang.status.fever; tempType = "warning"; }
    else if (t > 39) { tempStatus = lang.status.highFever; tempType = "danger"; }
    healthData.push({ title: lang.vitals.temp, value: displayTemp.toFixed(1), unit: isMetric ? "°C" : "°F", status: tempStatus, type: tempType, icon: <FiThermometer /> });
    let bmiStatus = lang.status.normal, bmiType: StatusType = "success";
    const b = Number(bmiVal);
    if (isNaN(b)) { bmiStatus = lang.status.noData; bmiType = "warning"; }
    else if (b < 18.5) { bmiStatus = lang.status.under; bmiType = "warning"; }
    else if (b >= 25 && b < 30) { bmiStatus = lang.status.over; bmiType = "warning"; }
    else if (b >= 30) { bmiStatus = lang.status.obese; bmiType = "danger"; }
    const w = Number(weight);
    const displayWeight = isMetric ? w : w * 2.20462;
    healthData.push({ title: lang.vitals.weight, value: displayWeight.toFixed(1), unit: isMetric ? "kg" : "lb", status: bmiStatus, type: bmiType, icon: <MdMonitorWeight /> });
    healthData.push({ title: lang.vitals.bmi, value: bmiVal, unit: "", status: bmiStatus, type: bmiType, icon: <FiBarChart /> });
    const rawH = Number(height);
    const heightM = rawH / 100;
    const displayH = isMetric ? heightM : heightM * 39.3701;
    healthData.push({ title: lang.vitals.height, value: isMetric ? heightM.toFixed(2) : displayH.toFixed(1), unit: isMetric ? "m" : "in", status: lang.status.normal, type: "success" as StatusType, icon: <MdHeight /> });
    let bpStatus = lang.status.ideal, bpType: StatusType = "success";
    if (bp?.includes("/") && !bp.includes("--")) {
      const [sys, dia] = bp.split("/").map(Number);
      if (sys > 140 || dia > 90) { bpStatus = lang.status.high; bpType = "danger"; }
      else if (sys > 120 || dia > 80) { bpStatus = lang.status.elevated; bpType = "warning"; }
    } else { bpStatus = lang.status.noData; bpType = "warning"; }
    healthData.push({ title: lang.vitals.bp, value: bp, unit: "mmHg", status: bpStatus, type: bpType, icon: <FiHeart /> });
    return healthData;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eaf4ff]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#139dc7] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#139dc7] font-bold animate-pulse">Loading Results</p>
        </div>
      </div>
    );
  }

  if (!latestRecord) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eaf4ff]">
        <div className="text-center p-10 bg-white/50 rounded-[40px] backdrop-blur-md border border-white">
          <h2 className="text-2xl font-bold text-[#0a4d61] mb-4">{content[language].noRecord}</h2>
          <button onClick={() => navigate("/dashboard")} className="text-[#139dc7] font-bold flex items-center gap-2 mx-auto">
            <FaArrowLeft /> {content[language].returnBtn}
          </button>
        </div>
      </div>
    );
  }

  const isHealthy = Number(latestRecord.oxygen) >= 95 && Number(latestRecord.bmi) < 25;
  const lang = content[language];
  const conditions = analyzeHealth(latestRecord);
  const highCount = conditions.filter(c => c.risk === "high").length;
  const modCount  = conditions.filter(c => c.risk === "moderate").length;

  const riskConfig = {
    low:      { bg: "bg-sky-50",    border: "border-sky-200",    badge: "bg-sky-100 text-sky-700",    icon: <FaCheckCircle className="text-sky-500" />,          dot: "bg-sky-400"    },
    moderate: { bg: "bg-amber-50",  border: "border-amber-200",  badge: "bg-amber-100 text-amber-700", icon: <FaExclamationTriangle className="text-amber-500" />, dot: "bg-amber-400"  },
    high:     { bg: "bg-red-50",    border: "border-red-200",    badge: "bg-red-100 text-red-700",    icon: <FiAlertCircle className="text-red-500" />,           dot: "bg-red-500"    },
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-x-hidden">
      <header className="hs-no-print w-full px-5 lg:px-16 py-4 md:py-6 flex justify-between items-center z-50">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-[#139dc7] font-bold hover:gap-4 transition-all active:scale-95 text-sm md:text-base">
          <FaArrowLeft /> {lang.back}
        </button>
      </header>

      <main id="hs-print-region" className="max-w-5xl mx-auto px-4 md:px-6 pb-16">

        {/* HERO */}
        <div className="hs-hero bg-white/70 backdrop-blur-xl rounded-[28px] md:rounded-[40px] p-5 md:p-8 lg:p-12 border border-white shadow-2xl mb-4 md:mb-6 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-[#139dc7] font-bold uppercase tracking-widest text-xs mb-1.5">
              <FaCalendarCheck /> {lang.header}
            </div>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-[#0a4d61]">{latestRecord.date}</h1>
            <p className="text-[#139dc7] font-medium mt-1 text-sm md:text-base">
              {language === "Tagalog" ? "Naitala noong " : "Recorded at "}{latestRecord.time} {lang.subHeader}
            </p>
          </div>
          <div className={`${isHealthy ? "bg-green-500 shadow-green-200" : "bg-orange-500 shadow-orange-200"} text-white px-6 py-3 md:px-8 md:py-4 rounded-2xl md:rounded-3xl font-bold text-center shadow-xl w-full md:min-w-48 md:w-auto`}>
            <p className="text-[9px] md:text-[10px] uppercase opacity-80 mb-0.5">{lang.condition}</p>
            <p className="text-xl md:text-2xl">{isHealthy ? lang.excellent : lang.stable}</p>
          </div>
        </div>

        {/* ACTION BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 md:mb-8 px-1 md:px-4">
          <h3 className="text-[#0a4d61] font-bold flex items-center gap-2 text-sm md:text-lg">
            <FiInfo className="text-[#139dc7]" /> {lang.summary}
          </h3>
          <div className="hs-no-print flex items-center gap-2 md:gap-3">
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 bg-white/60 hover:bg-white text-[#139dc7] rounded-full border border-white font-bold text-xs transition-all shadow-sm active:scale-95">
              <FaPrint size={11} /> {lang.print}
            </button>
            <button onClick={handleExportPDF} disabled={exporting} className="flex items-center gap-1.5 px-4 py-2 bg-[#139dc7] hover:bg-[#0a4d61] disabled:opacity-60 text-white rounded-full font-bold text-xs transition-all shadow-lg active:scale-95">
              {exporting ? (<><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />{lang.exporting}</>) : (<><FaDownload size={11} /> {lang.export}</>)}
            </button>
          </div>
        </div>

        {/* VITALS GRID */}
        <div className="hs-grid grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-5">
          {getHealthData(latestRecord).map((data, index) => (
            <ResultCard key={index} {...data} />
          ))}
        </div>

        {/* ══ HEALTH INSIGHTS SECTION ══ */}
        <section className="mt-6 md:mt-8">
          <div className="flex items-center justify-between mb-4 px-1">
            <div>
              <h2 className="text-lg md:text-xl font-black text-[#0a4d61] flex items-center gap-2">
                <FaShieldAlt className="text-[#139dc7]" />
                {lang.insightsTitle}
              </h2>
              <p className="text-[10px] text-[#139dc7]/50 font-bold uppercase tracking-widest mt-0.5">{lang.insightsSubtitle}</p>
            </div>
            {conditions.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                {highCount > 0 && (
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1.5 bg-red-100 text-red-700 rounded-full border border-red-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {highCount} {lang.riskLabels.high}
                  </span>
                )}
                {modCount > 0 && (
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {modCount} {lang.riskLabels.moderate}
                  </span>
                )}
              </div>
            )}
          </div>

          {conditions.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-md border border-green-200 rounded-3xl p-6 md:p-8 flex items-center gap-5">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center shrink-0">
                <FaCheckCircle className="text-green-500 text-2xl" />
              </div>
              <div>
                <p className="font-black text-green-700 text-base md:text-lg">{lang.allClear}</p>
                <p className="text-green-600/70 text-sm mt-0.5">{lang.allClearDesc}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {conditions.map((cond, i) => {
                const cfg = riskConfig[cond.risk];
                const isOpen = expandedCondition === i;
                const name = language === "Tagalog" ? cond.nameTagalog : cond.name;
                const explanation = language === "Tagalog" ? cond.explanationTagalog : cond.explanation;
                return (
                  <div key={i} className={`${cfg.bg} ${cfg.border} border rounded-[22px] overflow-hidden transition-all duration-200`}>
                    <button onClick={() => setExpandedCondition(isOpen ? null : i)} className="w-full flex items-center gap-4 p-4 md:p-5 text-left">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} border ${cfg.border}`}>{cfg.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-[#0a4d61] text-sm md:text-base leading-tight truncate">{name}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-[8px] font-black uppercase tracking-wider text-[#139dc7]/50">{lang.relatedVitals}:</span>
                          {cond.relatedVitals.map(v => (
                            <span key={v} className="text-[8px] font-black uppercase px-2 py-0.5 bg-white/70 text-[#139dc7] rounded-full border border-[#139dc7]/20">{v}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full hidden sm:inline ${cfg.badge}`}>{lang.riskLabels[cond.risk]}</span>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-200 ${isOpen ? "bg-[#0a4d61]/10 rotate-180" : "bg-white/50"}`}>
                          <FaChevronDown size={10} className="text-[#0a4d61]/60" />
                        </div>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-0">
                        <div className="h-px bg-white/60 mb-4" />
                        <div className="flex items-start gap-3">
                          <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                          <p className="text-sm text-[#0a4d61]/80 leading-relaxed font-medium">{explanation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-start gap-2.5 px-1">
            <FiInfo className="text-[#139dc7]/30 shrink-0 mt-0.5" size={13} />
            <p className="text-[9px] md:text-[10px] text-[#139dc7]/40 font-medium leading-relaxed">{lang.disclaimer}</p>
          </div>
        </section>
      </main>
    </div>
  );
};

const ResultCard = ({ icon, title, value, unit, status, type }: {
  icon: React.ReactNode; title: string; value: string; unit: string; status: string; type: StatusType;
}) => {
  const typeColors = {
    success: "bg-green-500/10 text-green-600 border-green-200",
    warning: "bg-orange-500/10 text-orange-600 border-orange-200",
    danger:  "bg-red-500/10 text-red-600 border-red-200"
  };
  return (
    <div className="hs-card bg-white/80 backdrop-blur-md border border-white p-4 md:p-5 lg:p-6 rounded-2xl md:rounded-3xl shadow-lg group hover:bg-white transition-all hover:-translate-y-1">
      <div className="flex justify-between items-start mb-3 md:mb-4">
        <div className="w-9 h-9 md:w-11 md:h-11 lg:w-12 lg:h-12 bg-[#139dc7]/10 rounded-xl md:rounded-2xl flex items-center justify-center text-[#139dc7] text-lg md:text-2xl group-hover:bg-[#139dc7] group-hover:text-white transition-all duration-300 shrink-0">
          {icon}
        </div>
        <span className={`text-[8px] md:text-[9px] font-black uppercase px-2 py-1 rounded-full border shadow-sm leading-none ${typeColors[type]}`}>{status}</span>
      </div>
      <div>
        <p className="text-[9px] md:text-[10px] font-bold text-[#139dc7]/50 uppercase tracking-widest mb-0.5">{title}</p>
        <div className="flex items-baseline gap-0.5 md:gap-1">
          <span className="text-2xl md:text-3xl lg:text-4xl font-black text-[#0a4d61] leading-none">{value}</span>
          <span className="text-xs md:text-sm font-bold text-[#139dc7]">{unit}</span>
        </div>
      </div>
    </div>
  );
};

export default Result;