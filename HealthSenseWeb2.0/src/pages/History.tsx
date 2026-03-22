import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSearch, FaFilter, FaTimes, FaCalendarAlt, FaSortAmountDown, FaSortAmountUp, FaChevronDown, FaDownload, FaShieldAlt, FaCheckCircle, FaExclamationTriangle, FaHeartbeat } from "react-icons/fa";
import { FiActivity, FiThermometer, FiBarChart, FiHeart, FiInfo, FiAlertCircle } from "react-icons/fi";
import { MdHeight, MdMonitorWeight } from "react-icons/md";
import { supabase } from "../supabaseClient";
import { analyzeHealth } from "../utils/healthAnalysis";

type StatusType = "success" | "warning" | "danger" | "Unknown";
type SortDir = "newest" | "oldest";

interface CheckupRecord {
  date: string;
  time: string;
  rawDate: Date;
  oxygen: string;
  temp: string;
  height: string;
  weight: string;
  bmi: string;
  bp: string;
  heart_rate: string;
}

// ─── PDF LIBS ─────────────────────────────────────────────────────────────────
let jsPDFLib: typeof import("jspdf")["default"] | null = null;
async function preloadPDFLibs() {
  if (!jsPDFLib) {
    const { default: jsPDF } = await import("jspdf");
    jsPDFLib = jsPDF;
  }
}
preloadPDFLibs().catch(() => {});

// ─── PDF BUILDER ──────────────────────────────────────────────────────────────
async function exportToPDF(record: CheckupRecord, language: "English" | "Tagalog", units: "metric" | "imperial") {
  await preloadPDFLibs();
  const jsPDF = jsPDFLib!;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, MARGIN = 16, COL = W - MARGIN * 2;
  let y = 0;
  const hex = (h: string) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)] as [number,number,number];
  const setFill = (h: string) => doc.setFillColor(...hex(h));
  const setDraw = (h: string) => doc.setDrawColor(...hex(h));
  const setTxt  = (h: string) => doc.setTextColor(...hex(h));
  const wrap = (text: string, maxW: number, size: number) => { doc.setFontSize(size); return doc.splitTextToSize(text, maxW); };
  const pageH = 297;
  const checkPage = (needed: number) => { if (y + needed > pageH - 12) { doc.addPage(); y = 16; } };

  setFill("#0a4d61"); doc.rect(0, 0, W, 32, "F");
  setTxt("#ffffff"); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text("HealthSense", MARGIN, 13);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text("Health Checkup Report", MARGIN, 20);
  doc.text(`Generated: ${new Date().toLocaleString()}`, MARGIN, 26);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text(record.date, W - MARGIN, 14, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(`at ${record.time}`, W - MARGIN, 20, { align: "right" });
  y = 40;

  const isHealthy = Number(record.oxygen) >= 95 && Number(record.bmi) < 25;
  setFill(isHealthy ? "#16a34a" : "#ea580c");
  doc.roundedRect(MARGIN, y, COL, 14, 3, 3, "F");
  setTxt("#ffffff"); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text(`Overall Condition: ${isHealthy ? (language === "Tagalog" ? "NAPAKAHUSAY" : "EXCELLENT") : (language === "Tagalog" ? "MAAYOS" : "STABLE")}`, W/2, y+9, { align: "center" });
  y += 20;

  setTxt("#0a4d61"); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("Vital Signs", MARGIN, y); y += 6;

  const isMetric = units === "metric";
  const vitals: { label: string; value: string; unit: string; status: string; color: string }[] = [];
  const spo2 = Number(record.oxygen);
  vitals.push({ label: "SpO2 (Oxygen)", value: record.oxygen, unit: "%", status: isNaN(spo2) ? "No Data" : spo2 < 95 ? "Low" : "Normal", color: isNaN(spo2) ? "#f59e0b" : spo2 < 95 ? "#dc2626" : "#16a34a" });
  const t = Number(record.temp), displayTemp = isMetric ? t : (t * 9/5) + 32;
  vitals.push({ label: "Temperature", value: isNaN(t) ? "--" : displayTemp.toFixed(1), unit: isMetric ? "°C" : "°F", status: isNaN(t) ? "No Data" : t > 39 ? "High Fever" : t > 37.5 ? "Fever" : "Normal", color: isNaN(t) ? "#f59e0b" : t > 39 ? "#dc2626" : t > 37.5 ? "#ea580c" : "#16a34a" });
  const w = Number(record.weight), displayW = isMetric ? w : w * 2.20462, b = Number(record.bmi);
  vitals.push({ label: "Weight", value: isNaN(w) ? "--" : displayW.toFixed(1), unit: isMetric ? "kg" : "lb", status: isNaN(b) ? "No Data" : b < 18.5 ? "Underweight" : b >= 30 ? "Obese" : b >= 25 ? "Overweight" : "Normal", color: isNaN(b) ? "#f59e0b" : b < 18.5 || b >= 25 ? (b >= 30 ? "#dc2626" : "#ea580c") : "#16a34a" });
  vitals.push({ label: "BMI", value: record.bmi, unit: "", status: isNaN(b) ? "No Data" : b < 18.5 ? "Underweight" : b >= 30 ? "Obese" : b >= 25 ? "Overweight" : "Normal", color: isNaN(b) ? "#f59e0b" : b < 18.5 || b >= 25 ? (b >= 30 ? "#dc2626" : "#ea580c") : "#16a34a" });
  const rawH = Number(record.height), heightM = rawH/100, displayH = isMetric ? heightM : heightM * 39.3701;
  vitals.push({ label: "Height", value: isNaN(rawH) ? "--" : (isMetric ? heightM.toFixed(2) : displayH.toFixed(1)), unit: isMetric ? "m" : "in", status: "Normal", color: "#16a34a" });
  let bpStatus = "Normal", bpColor = "#16a34a";
  if (record.bp?.includes("/") && !record.bp.includes("--")) {
    const [sys, dia] = record.bp.split("/").map(Number);
    if (sys > 140 || dia > 90) { bpStatus = "High"; bpColor = "#dc2626"; }
    else if (sys > 120 || dia > 80) { bpStatus = "Elevated"; bpColor = "#ea580c"; }
  } else { bpStatus = "No Data"; bpColor = "#f59e0b"; }
  vitals.push({ label: "Blood Pressure", value: record.bp, unit: ".", status: bpStatus, color: bpColor });

  // Heart Rate
  const hrVal = Number(record.heart_rate);
  let hrPdfStatus = "Normal", hrPdfColor = "#16a34a";
  if (!record.heart_rate || record.heart_rate === "--" || isNaN(hrVal)) {
    hrPdfStatus = "No Data"; hrPdfColor = "#f59e0b";
  } else if (hrVal < 40 || hrVal > 150) {
    hrPdfStatus = hrVal > 150 ? "Critical High" : "Critical Low"; hrPdfColor = "#dc2626";
  } else if (hrVal < 60) {
    hrPdfStatus = "Bradycardia"; hrPdfColor = "#ea580c";
  } else if (hrVal > 100) {
    hrPdfStatus = "Tachycardia"; hrPdfColor = hrVal > 120 ? "#dc2626" : "#ea580c";
  }
  vitals.push({ label: "Heart Rate", value: record.heart_rate, unit: "bpm", status: hrPdfStatus, color: hrPdfColor });

  const cellW = (COL - 6) / 2, cellH = 20;
  vitals.forEach((v, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const cx = MARGIN + col * (cellW + 6), cy = y + row * (cellH + 4);
    checkPage(cellH + 4);
    setFill("#f0f8ff"); setDraw("#d0e8f0"); doc.setLineWidth(0.3);
    doc.roundedRect(cx, cy, cellW, cellH, 2, 2, "FD");
    doc.setFillColor(...hex(v.color)); doc.circle(cx+5, cy+5, 1.5, "F");
    setTxt("#139dc7"); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.text(v.label.toUpperCase(), cx+10, cy+5.5);
    setTxt("#0a4d61"); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text(`${v.value}${v.unit}`, cx+5, cy+14);
    setTxt(v.color); doc.setFont("helvetica", "bold"); doc.setFontSize(7);
    doc.text(v.status, cx+cellW-4, cy+5.5, { align: "right" });
  });
  y += Math.ceil(vitals.length / 2) * (cellH + 4) + 8;

  const conditions = analyzeHealth(record);
  checkPage(16);
  setTxt("#0a4d61"); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("AI Health Analysis", MARGIN, y);
  if (conditions.length === 0) {
    y += 5; checkPage(14);
    setFill("#f0fdf4"); setDraw("#bbf7d0"); doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, COL, 12, 2, 2, "FD");
    setTxt("#15803d"); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("✓  All Vitals Normal — readings are within healthy ranges.", MARGIN+5, y+7.5);
    y += 18;
  } else {
    const high = conditions.filter(c => c.risk === "high").length;
    const mod  = conditions.filter(c => c.risk === "moderate").length;
    const low  = conditions.filter(c => c.risk === "low").length;
    y += 5; doc.setFont("helvetica", "normal"); doc.setFontSize(8); setTxt("#64748b");
    doc.text(`${conditions.length} condition(s) detected — ${high} High Risk · ${mod} Moderate · ${low} Low Risk`, MARGIN, y);
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
      setFill(cfg.bg); setDraw(cfg.border); doc.setLineWidth(0.4);
      doc.roundedRect(MARGIN, y, COL, blockH, 2, 2, "FD");
      doc.setFillColor(...hex(cfg.text)); doc.rect(MARGIN, y, 3, blockH, "F");
      setTxt(cfg.text); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.text(name, MARGIN+7, y+6);
      doc.setFontSize(6.5); doc.text(cfg.label, W-MARGIN-2, y+6, { align: "right" });
      setTxt("#64748b"); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      doc.text(`Vitals: ${cond.relatedVitals.join(", ")}`, MARGIN+7, y+11);
      setTxt("#374151"); doc.setFontSize(8);
      doc.text(lines, MARGIN+7, y+16);
      y += blockH + 4;
    }
  }
  checkPage(14); y += 4;
  setFill("#f8fafc"); setDraw("#e2e8f0"); doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, COL, 12, 2, 2, "FD");
  setTxt("#94a3b8"); doc.setFont("helvetica", "italic"); doc.setFontSize(7);
  doc.text(wrap("This analysis is for informational purposes only and does not constitute medical advice. Consult a qualified healthcare professional for diagnosis and treatment.", COL-8, 7), MARGIN+4, y+4.5);
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p); setTxt("#94a3b8"); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.text("HealthSense Kiosk — Confidential Health Report", MARGIN, 291);
    doc.text(`Page ${p} of ${totalPages}`, W-MARGIN, 291, { align: "right" });
  }
  doc.save(`HealthSense_Report_${record.date.replace(/[\s,]+/g, "_")}.pdf`);
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
const DetailModal: React.FC<{
  record: CheckupRecord;
  language: "English" | "Tagalog";
  units: "metric" | "imperial";
  lang: any;
  onClose: () => void;
  getHealthData: (r: CheckupRecord) => any[];
}> = ({ record, language, lang, onClose, getHealthData }) => {
  const [expandedCondition, setExpandedCondition] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const conditions = analyzeHealth(record);
  const highCount = conditions.filter(c => c.risk === "high").length;
  const modCount  = conditions.filter(c => c.risk === "moderate").length;

  const riskConfig = {
    low:      { bg: "bg-sky-50",   border: "border-sky-200",   badge: "bg-sky-100 text-sky-700",     icon: <FaCheckCircle className="text-sky-500" />,          dot: "bg-sky-400"   },
    moderate: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700",  icon: <FaExclamationTriangle className="text-amber-500" />, dot: "bg-amber-400" },
    high:     { bg: "bg-red-50",   border: "border-red-200",   badge: "bg-red-100 text-red-700",      icon: <FiAlertCircle className="text-red-500" />,           dot: "bg-red-500"   },
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-8 bg-[#001b2e]/70 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal shell: overflow-hidden clips scrollbar inside the rounded corners */}
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-4xl border border-[#d0e8f0] shadow-2xl shadow-[#0a4d61]/20 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-6 duration-200">

        {/* ── Sticky header ── */}
        <div className="shrink-0 border-b border-[#139dc7]/10">
          <div className="h-1.5 bg-linear-to-r from-[#139dc7] via-[#34A0A4] to-[#0a4d61]" />
          <div className="flex items-start justify-between px-6 sm:px-8 pt-5 pb-4">
            <div>
              <span className="text-[9px] font-black text-[#139dc7] uppercase tracking-widest">{lang.diagnosticSummary}</span>
              <h2 className="text-xl sm:text-2xl font-black text-[#0a4d61] leading-tight mt-0.5">{lang.reportTitle}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-[#139dc7]">{record.date}</span>
                <span className="w-1 h-1 rounded-full bg-[#139dc7]/30" />
                <span className="text-sm text-[#139dc7]/50 font-medium">{record.time}</span>
              </div>
            </div>
            <button onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90 shrink-0 mt-0.5">
              <FaTimes size={13} />
            </button>
          </div>
        </div>

        {/* ── Scrollable body — scrollbar is clipped inside the rounded shell ── */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-5
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-[#139dc7]/20
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb:hover]:bg-[#139dc7]/50">

          {/* Vitals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {getHealthData(record).map((data, i) => (
              <div key={i} className="group flex items-center gap-4 p-4 sm:p-5 bg-slate-50/80 rounded-2xl border border-[#139dc7]/5 hover:bg-white hover:border-[#139dc7]/20 hover:shadow-sm transition-all">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 transition-transform group-hover:scale-110
                  ${data.type === "success" ? "bg-green-100 text-green-600" : data.type === "warning" ? "bg-orange-100 text-orange-600" : "bg-red-100 text-red-600"}`}>
                  {data.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase text-[#139dc7]/40 tracking-widest mb-1">{data.title}</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-xl font-black text-[#0a4d61] leading-none">{data.value}</p>
                    {data.unit && <span className="text-xs font-bold text-[#0a4d61]/40">{data.unit}</span>}
                  </div>
                  <div className={`mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase
                    ${data.type === "success" ? "bg-green-500/10 text-green-600" : data.type === "warning" ? "bg-orange-500/10 text-orange-600" : "bg-red-500/10 text-red-600"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${data.type === "success" ? "bg-green-500" : data.type === "warning" ? "bg-orange-500" : "bg-red-500"}`} />
                    {data.status}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Health Analysis */}
          <div className="border-t border-[#139dc7]/10 pt-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-[#0a4d61] flex items-center gap-2 text-sm sm:text-base">
                  <FaShieldAlt className="text-[#139dc7]" />
                  {lang.insightsTitle}
                </h3>
                <p className="text-[9px] text-[#139dc7]/40 font-bold uppercase tracking-widest mt-0.5">{lang.insightsSubtitle}</p>
              </div>
              {conditions.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {highCount > 0 && (
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1 bg-red-100 text-red-700 rounded-full border border-red-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />{highCount} {lang.riskLabels.high}
                    </span>
                  )}
                  {modCount > 0 && (
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{modCount} {lang.riskLabels.moderate}
                    </span>
                  )}
                </div>
              )}
            </div>

            {conditions.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                  <FaCheckCircle className="text-green-500 text-lg" />
                </div>
                <div>
                  <p className="font-black text-green-700 text-sm">{lang.allClear}</p>
                  <p className="text-green-600/70 text-xs mt-0.5">{lang.allClearDesc}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {conditions.map((cond, i) => {
                  const cfg = riskConfig[cond.risk];
                  const isOpen = expandedCondition === i;
                  const name = language === "Tagalog" ? cond.nameTagalog : cond.name;
                  const explanation = language === "Tagalog" ? cond.explanationTagalog : cond.explanation;
                  return (
                    <div key={i} className={`${cfg.bg} ${cfg.border} border rounded-2xl overflow-hidden`}>
                      <button onClick={() => setExpandedCondition(isOpen ? null : i)}
                        className="w-full flex items-center gap-3 p-3.5 text-left">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg} border ${cfg.border}`}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-[#0a4d61] text-xs sm:text-sm leading-tight truncate">{name}</p>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <span className="text-[7px] font-black uppercase tracking-wider text-[#139dc7]/50">{lang.relatedVitals}:</span>
                            {cond.relatedVitals.map(v => (
                              <span key={v} className="text-[7px] font-black uppercase px-1.5 py-0.5 bg-white/70 text-[#139dc7] rounded-full border border-[#139dc7]/20">{v}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full hidden sm:inline ${cfg.badge}`}>
                            {lang.riskLabels[cond.risk]}
                          </span>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-200 ${isOpen ? "bg-[#0a4d61]/10 rotate-180" : "bg-white/50"}`}>
                            <FaChevronDown size={9} className="text-[#0a4d61]/60" />
                          </div>
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4">
                          <div className="h-px bg-white/80 mb-3" />
                          <div className="flex items-start gap-2.5">
                            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                            <p className="text-xs text-[#0a4d61]/80 leading-relaxed font-medium">{explanation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex items-start gap-2">
              <FiInfo className="text-[#139dc7]/30 shrink-0 mt-0.5" size={11} />
              <p className="text-[8px] text-[#139dc7]/40 font-medium leading-relaxed">{lang.disclaimer}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 pt-4 border-t border-[#139dc7]/10 flex flex-col sm:flex-row gap-3 justify-between items-center pb-1">
            <p className="text-[9px] font-bold text-[#139dc7]/30 uppercase tracking-[0.2em] text-center">{lang.verified}</p>
            <button
              onClick={async () => {
                setExporting(true);
                try { await exportToPDF(record, language, "metric"); }
                catch (err) { alert(`PDF export failed: ${(err as Error).message}`); }
                finally { setExporting(false); }
              }}
              disabled={exporting}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#139dc7] hover:bg-[#0a4d61] disabled:opacity-60 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#139dc7]/20 active:scale-95">
              {exporting
                ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />{lang.exporting}</>
                : <><FaDownload size={11} />{lang.exportPDF}</>}
            </button>
          </div>

        </div>{/* end scrollable body */}
      </div>{/* end modal shell */}
    </div>
  );
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const History: React.FC = () => {
  const navigate = useNavigate();
  const filterPanelRef = useRef<HTMLDivElement>(null);

  const [selectedRecord, setSelectedRecord] = useState<CheckupRecord | null>(null);
  const [historyData, setHistoryData] = useState<CheckupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<"English" | "Tagalog">("English");
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [sortDir, setSortDir] = useState<SortDir>("newest");

  const content = {
    English: {
      back: "Back to Dashboard", title: "Checkup History",
      subtitle: "Review your past health checkups below.",
      searchPlaceholder: "Search by date (e.g. March 2025)...",
      filter: "Filter", noRecords: "No records match your filters.",
      checkedAt: "Checked at", viewDetails: "View Details",
      diagnosticSummary: "Diagnostic Summary", reportTitle: "Checkup Report",
      verified: "Verified by HealthSense AI", exportPDF: "Export PDF", exporting: "Generating...",
      filterTitle: "Filter & Sort", filterMonth: "Month", filterSort: "Sort Order",
      allMonths: "All Months", newestFirst: "Newest First", oldestFirst: "Oldest First",
      clearFilters: "Clear All",
      insightsTitle: "AI Health Analysis", insightsSubtitle: "Rule-based analysis of your vitals",
      allClear: "All Vitals Normal", allClearDesc: "Readings are within healthy ranges.",
      riskLabels: { low: "Low Risk", moderate: "Moderate", high: "High Risk" },
      relatedVitals: "Related Vitals",
      disclaimer: "For informational purposes only. Not a substitute for medical advice.",
      vitals: { spo2: "SpO2", temp: "Temperature", height: "Height", weight: "Weight", bmi: "BMI", bp: "BP", hr: "Heart Rate" },
      status: { normal: "Normal", low: "Low", high: "High", fever: "Fever", highFever: "High Fever", hypo: "Hypothermia", ideal: "Ideal", elevated: "Elevated", average: "Average", belowAverage: "Below Average", under: "Underweight", over: "Overweight", obese: "Obese" }
    },
    Tagalog: {
      back: "Bumalik sa Dashboard", title: "Kasaysayan ng Checkup",
      subtitle: "Suriin ang iyong mga nakaraang checkup sa ibaba.",
      searchPlaceholder: "Maghanap gamit ang petsa (hal. Marso 2025)...",
      filter: "I-filter", noRecords: "Walang record na tumutugma sa filter.",
      checkedAt: "Siniyasat noong", viewDetails: "Tingnan ang Detalye",
      diagnosticSummary: "Buod ng Pagsusuri", reportTitle: "Ulat ng Checkup",
      verified: "Siniyasat ng HealthSense AI", exportPDF: "I-download ang PDF", exporting: "Ginagawa...",
      filterTitle: "Filter at Ayos", filterMonth: "Buwan", filterSort: "Pagkakasunod",
      allMonths: "Lahat ng Buwan", newestFirst: "Pinakabago Muna", oldestFirst: "Pinakamatanda Muna",
      clearFilters: "I-clear Lahat",
      insightsTitle: "AI Pagsusuri ng Kalusugan", insightsSubtitle: "Pagsusuri batay sa iyong mga vital signs",
      allClear: "Lahat ng Vital Signs ay Normal", allClearDesc: "Ang mga resulta ay nasa malusog na range.",
      riskLabels: { low: "Mababang Panganib", moderate: "Katamtamang Panganib", high: "Mataas na Panganib" },
      relatedVitals: "Kaugnay na Vital Signs",
      disclaimer: "Para sa impormasyon lamang. Hindi kapalit ng medikal na payo.",
      vitals: { spo2: "Oksiheno", temp: "Temperatura", height: "Tangkad", weight: "Timbang", bmi: "BMI", bp: "BP", hr: "Heart Rate" },
      status: { normal: "Karaniwan", low: "Mababa", high: "Mataas", fever: "May Lagnat", highFever: "Mataas na Lagnat", hypo: "Hypothermia", ideal: "Tamang Presyon", elevated: "Tumataas", average: "Average", belowAverage: "Mababa sa Average", under: "Payat", over: "Mabigat", obese: "Obese" }
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
          .from("health_checkups").select("spo2, temperature, height, weight, bmi, blood_pressure, heart_rate, created_at")
          .eq("user_id", user.id).order("created_at", { ascending: false });
        if (error) throw error;
        if (data) {
          const locale = profile?.language === "Tagalog" ? "tl-PH" : "en-US";
          setHistoryData(data.map(item => {
            const ts = new Date(item.created_at);
            return {
              rawDate: ts,
              date: ts.toLocaleDateString(locale, { month: "long", day: "numeric", year: "numeric" }),
              time: ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              oxygen: item.spo2?.toString() || "0", temp: item.temperature?.toString() || "0",
              height: item.height?.toString() || "0", weight: item.weight?.toString() || "0",
              bmi: item.bmi?.toString() || "0", bp: item.blood_pressure || "0/0",
              heart_rate: item.heart_rate?.toString() || "--",
            };
          }));
        }
      } catch (err) { console.error("Error fetching health history:", err); }
      finally { setTimeout(() => setLoading(false), 800); }
    };
    fetchData();
  }, [navigate]);

  const availableMonths = useMemo(() => {
    const seen = new Set<string>();
    historyData.forEach(r => seen.add(`${r.rawDate.getFullYear()}-${String(r.rawDate.getMonth()+1).padStart(2,"0")}`));
    return Array.from(seen).sort().reverse();
  }, [historyData]);

  const activeFilterCount = useMemo(() => (monthFilter !== "all" ? 1 : 0) + (sortDir !== "newest" ? 1 : 0), [monthFilter, sortDir]);

  const filteredData = useMemo(() => {
    let result = [...historyData];
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); result = result.filter(r => r.date.toLowerCase().includes(q)); }
    if (monthFilter !== "all") { const [yr, mo] = monthFilter.split("-").map(Number); result = result.filter(r => r.rawDate.getFullYear() === yr && r.rawDate.getMonth()+1 === mo); }
    result.sort((a, b) => sortDir === "newest" ? b.rawDate.getTime()-a.rawDate.getTime() : a.rawDate.getTime()-b.rawDate.getTime());
    return result;
  }, [historyData, searchQuery, monthFilter, sortDir]);

  const clearFilters = () => { setMonthFilter("all"); setSortDir("newest"); setSearchQuery(""); };

  const getHealthData = (record: CheckupRecord) => {
    const l = content[language];
    const isMetric = units === "metric";
    const healthData = [];
    const s = Number(record.oxygen);
    let spo2Status = l.status.normal, spo2Type: StatusType = "success";
    if (s < 95) { spo2Status = l.status.low; spo2Type = "danger"; } else if (s <= 98) { spo2Status = l.status.normal; spo2Type = "warning"; }
    healthData.push({ title: l.vitals.spo2, value: record.oxygen, unit: "%", status: spo2Status, type: spo2Type, icon: <FiActivity /> });
    const t = Number(record.temp), displayTemp = isMetric ? t : (t*9/5)+32;
    let tempStatus = l.status.normal, tempType: StatusType = "success";
    if (t < 30) { tempStatus = l.status.hypo; tempType = "danger"; } else if (t <= 37.5) { tempStatus = l.status.normal; tempType = "success"; } else if (t <= 39) { tempStatus = l.status.fever; tempType = "warning"; } else { tempStatus = l.status.highFever; tempType = "danger"; }
    healthData.push({ title: l.vitals.temp, value: displayTemp.toFixed(1), unit: isMetric ? "°C" : "°F", status: tempStatus, type: tempType, icon: <FiThermometer /> });
    const rawH = Number(record.height), heightM = rawH/100, displayH = isMetric ? heightM : heightM*39.3701;
    let heightStatus = l.status.average, heightType: StatusType = "success";
    if (heightM < 1.5) { heightStatus = l.status.belowAverage; heightType = "danger"; }
    healthData.push({ title: l.vitals.height, value: isMetric ? heightM.toFixed(2) : displayH.toFixed(1), unit: isMetric ? "m" : "in", status: heightStatus, type: heightType, icon: <MdHeight /> });
    const w = Number(record.weight), displayWeight = isMetric ? w : w*2.20462, b = Number(record.bmi);
    let bmiStatus = l.status.normal, bmiType: StatusType = "success";
    if (b < 18.5) { bmiStatus = l.status.under; bmiType = "warning"; } else if (b < 25) { bmiStatus = l.status.normal; bmiType = "success"; } else if (b < 30) { bmiStatus = l.status.over; bmiType = "warning"; } else { bmiStatus = l.status.obese; bmiType = "danger"; }
    healthData.push({ title: l.vitals.weight, value: displayWeight.toFixed(1), unit: isMetric ? "kg" : "lb", status: bmiStatus, type: bmiType, icon: <MdMonitorWeight /> });
    healthData.push({ title: l.vitals.bmi, value: record.bmi, unit: "", status: bmiStatus, type: bmiType, icon: <FiBarChart /> });
    let bpStatus = l.status.ideal, bpType: StatusType = "success";
    if (record.bp.includes("/")) {
      const [sys, dia] = record.bp.split("/").map(Number);
      if (sys < 90 || dia < 60) { bpStatus = l.status.low; bpType = "warning"; }
      else if (sys <= 120 && dia <= 80) { bpStatus = l.status.ideal; bpType = "success"; }
      else if (sys <= 139 || dia <= 89) { bpStatus = l.status.elevated; bpType = "warning"; }
      else { bpStatus = l.status.high; bpType = "danger"; }
    }
    healthData.push({ title: l.vitals.bp, value: record.bp, unit: ".", status: bpStatus, type: bpType, icon: <FiHeart /> });

    // Heart Rate
    const hrNum = Number(record.heart_rate);
    let hrStatus = l.status.normal, hrType: StatusType = "success";
    if (!record.heart_rate || record.heart_rate === "--" || isNaN(hrNum)) {
      hrStatus = "No Data"; hrType = "warning";
    } else if (hrNum < 40 || hrNum > 150) {
      hrStatus = hrNum > 150 ? l.status.high : l.status.low; hrType = "danger";
    } else if (hrNum < 60) {
      hrStatus = l.status.low; hrType = "warning";
    } else if (hrNum > 100) {
      hrStatus = l.status.high; hrType = "warning";
    }
    healthData.push({ title: l.vitals.hr, value: record.heart_rate, unit: "bpm", status: hrStatus, type: hrType, icon: <FaHeartbeat /> });

    return healthData;
  };

  const lang = content[language];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eaf4ff] font-['Lexend']">
        <div className="text-center animate-in fade-in duration-500">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-[#139dc7]/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-[#139dc7] border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-2xl font-black text-[#139dc7] tracking-tight mb-2">Loading History</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen flex flex-col bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-hidden relative">

      <header className="w-full px-4 sm:px-8 lg:px-16 py-4 sm:py-6 flex justify-between items-center z-50 shrink-0">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-[#139dc7] font-bold hover:gap-3 transition-all active:scale-95">
          <FaArrowLeft className="text-lg" />
          <span className="text-sm sm:text-base">{lang.back}</span>
        </button>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 lg:px-12 flex flex-col min-h-0">

        <section className="mb-6 shrink-0">
          <h1 className="text-4xl font-bold text-[#139dc7] mb-1">{lang.title}</h1>
          <p className="text-[#139dc7]/60 mb-5 text-sm">{lang.subtitle}</p>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-[#139dc7]/40 pointer-events-none" />
              <input type="text" placeholder={lang.searchPlaceholder} value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-13 bg-white/60 backdrop-blur-md border-2 border-white/60 focus:border-[#139dc7]/40 rounded-2xl pl-12 pr-5 outline-none text-[#139dc7] font-bold text-sm placeholder:text-[#139dc7]/30 transition-all" />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#139dc7]/40 hover:text-[#139dc7] transition-colors">
                  <FaTimes size={14} />
                </button>
              )}
            </div>
            <button onClick={() => setSortDir(d => d === "newest" ? "oldest" : "newest")}
              className="h-13 px-4 bg-white/60 backdrop-blur-md border-2 border-white/60 hover:border-[#139dc7]/30 rounded-2xl text-[#139dc7] flex items-center gap-2 font-bold text-xs transition-all hover:bg-white active:scale-95">
              {sortDir === "newest" ? <FaSortAmountDown size={15} /> : <FaSortAmountUp size={15} />}
              <span className="hidden sm:inline">{sortDir === "newest" ? lang.newestFirst : lang.oldestFirst}</span>
            </button>
            <div className="relative" ref={filterPanelRef}>
              <button onClick={() => setShowFilterPanel(p => !p)}
                className={`h-13 px-5 border-2 rounded-2xl flex items-center gap-2 font-bold text-xs transition-all active:scale-95
                  ${showFilterPanel || activeFilterCount > 0
                    ? "bg-[#139dc7] border-[#139dc7] text-white shadow-lg shadow-[#139dc7]/20"
                    : "bg-white/60 backdrop-blur-md border-white/60 hover:border-[#139dc7]/30 text-[#139dc7] hover:bg-white"}`}>
                <FaFilter size={13} />
                <span className="hidden sm:inline">{lang.filter}</span>
                {activeFilterCount > 0 && <span className="w-5 h-5 rounded-full bg-white text-[#139dc7] text-[9px] font-black flex items-center justify-center">{activeFilterCount}</span>}
                <FaChevronDown size={10} className={`transition-transform ${showFilterPanel ? "rotate-180" : ""}`} />
              </button>
              {showFilterPanel && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white/95 backdrop-blur-xl rounded-[28px] border border-white shadow-2xl shadow-[#139dc7]/10 z-50 p-6 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-xs font-black text-[#0a4d61] uppercase tracking-widest">{lang.filterTitle}</span>
                    <button onClick={clearFilters} className="text-[9px] font-black text-[#139dc7]/50 uppercase tracking-wider hover:text-[#139dc7] transition-colors">{lang.clearFilters}</button>
                  </div>
                  <div className="mb-5">
                    <label className="text-[9px] font-black text-[#139dc7]/50 uppercase tracking-widest block mb-2">{lang.filterMonth}</label>
                    <div className="relative">
                      <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
                        className="w-full appearance-none bg-slate-50 border-none rounded-xl px-4 py-2.5 text-[11px] font-bold text-[#0a4d61] outline-none cursor-pointer">
                        <option value="all">{lang.allMonths}</option>
                        {availableMonths.map(m => {
                          const [yr, mo] = m.split("-");
                          return <option key={m} value={m}>{new Date(Number(yr), Number(mo)-1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</option>;
                        })}
                      </select>
                      <FaChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#139dc7]/40 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[#139dc7]/50 uppercase tracking-widest block mb-2">{lang.filterSort}</label>
                    <div className="flex gap-1.5">
                      {([
                        { key: "newest", label: lang.newestFirst, icon: <FaSortAmountDown size={11} /> },
                        { key: "oldest", label: lang.oldestFirst, icon: <FaSortAmountUp size={11} /> },
                      ] as { key: SortDir; label: string; icon: React.ReactNode }[]).map(opt => (
                        <button key={opt.key} onClick={() => setSortDir(opt.key)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all
                            ${sortDir === opt.key ? "bg-[#139dc7] text-white shadow-md shadow-[#139dc7]/20" : "bg-slate-50 text-[#0a4d61]/60 hover:bg-slate-100"}`}>
                          {opt.icon} {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-[9px] font-black text-[#139dc7]/40 uppercase tracking-widest">Active:</span>
              {monthFilter !== "all" && (
                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-3 py-1.5 bg-[#139dc7]/10 text-[#139dc7] rounded-full border border-[#139dc7]/20">
                  {new Date(Number(monthFilter.split("-")[0]), Number(monthFilter.split("-")[1])-1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  <button onClick={() => setMonthFilter("all")} className="hover:text-[#0a4d61]"><FaTimes size={8} /></button>
                </span>
              )}
              {sortDir !== "newest" && (
                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-3 py-1.5 bg-[#139dc7]/10 text-[#139dc7] rounded-full border border-[#139dc7]/20">
                  {lang.oldestFirst}
                  <button onClick={() => setSortDir("newest")} className="hover:text-[#0a4d61]"><FaTimes size={8} /></button>
                </span>
              )}
              <button onClick={clearFilters} className="text-[9px] font-black text-red-400 hover:text-red-600 uppercase tracking-wider px-2">{lang.clearFilters}</button>
            </div>
          )}
        </section>

        <div className="flex items-center justify-between mb-3 shrink-0">
          <p className="text-[10px] font-black text-[#139dc7]/40 uppercase tracking-widest">
            {filteredData.length} {filteredData.length === 1 ? "record" : "records"}
            {(searchQuery || activeFilterCount > 0) && ` of ${historyData.length}`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-10 space-y-4">
          {filteredData.length === 0 ? (
            <div className="bg-white/40 rounded-3xl p-16 text-center border border-white/40 flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#139dc7]/10 flex items-center justify-center">
                <FaSearch className="text-[#139dc7]/40" size={20} />
              </div>
              <p className="text-[#139dc7] font-bold">{lang.noRecords}</p>
              {activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs font-black text-[#139dc7] underline underline-offset-2">{lang.clearFilters}</button>}
            </div>
          ) : (
            filteredData.map((record, index) => (
              <div key={index} className="group relative bg-white/70 backdrop-blur-xl rounded-4xl border border-white shadow-sm p-6 md:p-8 transition-all hover:shadow-lg hover:shadow-[#139dc7]/8 hover:-translate-y-0.5">
                <div className="flex flex-col xl:flex-row items-center gap-6 md:gap-8">
                  <div className="w-full xl:w-52 shrink-0 border-b xl:border-b-0 xl:border-r border-[#139dc7]/10 pb-4 xl:pb-0 xl:pr-8">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-[#139dc7]/10 rounded-xl flex items-center justify-center text-[#139dc7] shrink-0 mt-0.5">
                        <FaCalendarAlt size={16} />
                      </div>
                      <div>
                        <p className="text-[#0a4d61] font-extrabold text-base leading-tight">{record.date}</p>
                        <p className="text-[10px] text-[#139dc7] font-black uppercase tracking-[0.15em] opacity-60 mt-1">{lang.checkedAt} {record.time}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-3 w-full">
                    {getHealthData(record).map((stat, i, arr) => (
                      <div key={i} className={`bg-white/60 border border-white p-3 md:p-4 rounded-2xl group-hover:bg-white transition-colors${i === arr.length - 1 && arr.length % 3 !== 0 ? " col-start-2 md:col-start-auto" : ""}`}>
                        <p className="text-[8px] md:text-[9px] font-black text-[#139dc7] uppercase mb-1.5 tracking-tight opacity-50">{stat.title}</p>
                        <p className={`font-bold text-[#0a4d61] leading-none ${stat.title === lang.vitals.bp ? "text-xs md:text-sm" : "text-base md:text-lg"}`}>
                          {stat.value}{stat.unit && <span className="text-[8px] ml-0.5 opacity-50 font-medium">{stat.unit}</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setSelectedRecord(record)}
                    className="w-full xl:w-auto px-6 py-4 bg-[#139dc7] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#139dc7]/20 hover:bg-[#0a4d61] hover:scale-105 transition-all shrink-0 active:scale-95">
                    {lang.viewDetails}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* ── MODAL ── */}
      {selectedRecord && (
        <DetailModal
          record={selectedRecord}
          language={language}
          units={units}
          lang={lang}
          onClose={() => setSelectedRecord(null)}
          getHealthData={getHealthData}
        />
      )}
    </div>
  );
};

export default History;