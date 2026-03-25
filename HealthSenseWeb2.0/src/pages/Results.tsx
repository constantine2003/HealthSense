import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft, FaDownload, FaCalendarCheck, FaPrint,
  FaShieldAlt, FaExclamationTriangle, FaCheckCircle,
  FaChevronDown, FaHeartbeat
} from "react-icons/fa";
import { FiActivity, FiThermometer, FiBarChart, FiHeart, FiInfo, FiAlertCircle } from "react-icons/fi";
import { MdHeight, MdMonitorWeight } from "react-icons/md";
import { supabase } from "../supabaseClient";
import { analyzeHealth } from "../utils/healthAnalysis";

type StatusType = "success" | "warning" | "danger";

interface HealthRecord {
  date: string; time: string;
  oxygen: string; temp: string; height: string;
  weight: string; bmi: string; bp: string; heart_rate: string;
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

// ─── PDF BUILDER ──────────────────────────────────────────────────────────────
let jsPDFLib: typeof import("jspdf")["default"] | null = null;
async function preloadPDFLibs() {
  if (!jsPDFLib) { const { default: jsPDF } = await import("jspdf"); jsPDFLib = jsPDF; }
}
preloadPDFLibs().catch(() => {});

async function exportToPDF(record: HealthRecord, language: "English" | "Tagalog", units: "metric" | "imperial") {
  await preloadPDFLibs(); const jsPDF = jsPDFLib!;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, MARGIN = 16, COL = W - MARGIN * 2; let y = 0;
  const hex = (h: string) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)] as [number,number,number];
  const setFill = (h: string) => doc.setFillColor(...hex(h));
  const setDraw = (h: string) => doc.setDrawColor(...hex(h));
  const setTxt  = (h: string) => doc.setTextColor(...hex(h));
  const wrap = (text: string, maxW: number, size: number) => { doc.setFontSize(size); return doc.splitTextToSize(text, maxW); };
  const pageH = 297;
  const checkPage = (needed: number) => { if (y + needed > pageH - 12) { doc.addPage(); y = 16; } };
  setFill("#0a4d61"); doc.rect(0, 0, W, 32, "F");
  setTxt("#ffffff"); doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.text("HealthSense", MARGIN, 13);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text("Health Checkup Report", MARGIN, 20); doc.text(`Generated: ${new Date().toLocaleString()}`, MARGIN, 26);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text(record.date, W - MARGIN, 14, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(`at ${record.time}`, W - MARGIN, 20, { align: "right" }); y = 40;
  const isHealthy = Number(record.oxygen) >= 95 && Number(record.bmi) < 25;
  setFill(isHealthy ? "#16a34a" : "#ea580c"); doc.roundedRect(MARGIN, y, COL, 14, 3, 3, "F");
  setTxt("#ffffff"); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text(`Overall Condition: ${isHealthy ? (language === "Tagalog" ? "NAPAKAHUSAY" : "EXCELLENT") : (language === "Tagalog" ? "MAAYOS" : "STABLE")}`, W/2, y+9, { align: "center" }); y += 20;
  setTxt("#0a4d61"); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("Vital Signs", MARGIN, y); y += 6;
  const isMetric = units === "metric";
  const vitals: { label: string; value: string; unit: string; status: string; color: string }[] = [];
  const spo2 = Number(record.oxygen); vitals.push({ label: "SpO2 (Oxygen)", value: record.oxygen, unit: "%", status: isNaN(spo2) ? "No Data" : spo2 < 95 ? "Low" : "Normal", color: isNaN(spo2) ? "#f59e0b" : spo2 < 95 ? "#dc2626" : "#16a34a" });
  const t = Number(record.temp), displayTemp = isMetric ? t : (t*9/5)+32; vitals.push({ label: "Temperature", value: isNaN(t) ? "--" : displayTemp.toFixed(1), unit: isMetric ? "°C" : "°F", status: isNaN(t) ? "No Data" : t > 39 ? "High Fever" : t > 37.5 ? "Fever" : "Normal", color: isNaN(t) ? "#f59e0b" : t > 39 ? "#dc2626" : t > 37.5 ? "#ea580c" : "#16a34a" });
  const w = Number(record.weight), displayW = isMetric ? w : w*2.20462, b = Number(record.bmi); vitals.push({ label: "Weight", value: isNaN(w) ? "--" : displayW.toFixed(1), unit: isMetric ? "kg" : "lb", status: isNaN(b) ? "No Data" : b < 18.5 ? "Underweight" : b >= 30 ? "Obese" : b >= 25 ? "Overweight" : "Normal", color: isNaN(b) ? "#f59e0b" : b < 18.5 || b >= 25 ? (b >= 30 ? "#dc2626" : "#ea580c") : "#16a34a" });
  vitals.push({ label: "BMI", value: record.bmi, unit: "", status: isNaN(b) ? "No Data" : b < 18.5 ? "Underweight" : b >= 30 ? "Obese" : b >= 25 ? "Overweight" : "Normal", color: isNaN(b) ? "#f59e0b" : b < 18.5 || b >= 25 ? (b >= 30 ? "#dc2626" : "#ea580c") : "#16a34a" });
  const rawH = Number(record.height), heightM = rawH/100, displayH = isMetric ? heightM : heightM*39.3701; vitals.push({ label: "Height", value: isNaN(rawH) ? "--" : (isMetric ? heightM.toFixed(2) : displayH.toFixed(1)), unit: isMetric ? "m" : "in", status: "Normal", color: "#16a34a" });
  let bpStatus = "Normal", bpColor = "#16a34a";
  if (record.bp?.includes("/") && !record.bp.includes("--")) { const [sys, dia] = record.bp.split("/").map(Number); if (sys > 140 || dia > 90) { bpStatus = "High"; bpColor = "#dc2626"; } else if (sys > 120 || dia > 80) { bpStatus = "Elevated"; bpColor = "#ea580c"; } } else { bpStatus = "No Data"; bpColor = "#f59e0b"; }
  vitals.push({ label: "Blood Pressure", value: record.bp, unit: ".", status: bpStatus, color: bpColor });
  const hrVal = Number(record.heart_rate); let hrPdfStatus = "Normal", hrPdfColor = "#16a34a";
  if (!record.heart_rate || record.heart_rate === "--" || isNaN(hrVal)) { hrPdfStatus = "No Data"; hrPdfColor = "#f59e0b"; } else if (hrVal < 40 || hrVal > 150) { hrPdfStatus = hrVal > 150 ? "Critical High" : "Critical Low"; hrPdfColor = "#dc2626"; } else if (hrVal < 60) { hrPdfStatus = "Bradycardia"; hrPdfColor = "#ea580c"; } else if (hrVal > 100) { hrPdfStatus = "Tachycardia"; hrPdfColor = hrVal > 120 ? "#dc2626" : "#ea580c"; }
  vitals.push({ label: "Heart Rate", value: record.heart_rate, unit: "bpm", status: hrPdfStatus, color: hrPdfColor });
  const cellW = (COL - 6) / 2, cellH = 20;
  vitals.forEach((v, i) => {
    const col = i % 2, row = Math.floor(i / 2), cx = MARGIN + col * (cellW + 6), cy = y + row * (cellH + 4);
    checkPage(cellH + 4); setFill("#f0f8ff"); setDraw("#d0e8f0"); doc.setLineWidth(0.3); doc.roundedRect(cx, cy, cellW, cellH, 2, 2, "FD");
    doc.setFillColor(...hex(v.color)); doc.circle(cx+5, cy+5, 1.5, "F");
    setTxt("#139dc7"); doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text(v.label.toUpperCase(), cx+10, cy+5.5);
    setTxt("#0a4d61"); doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(`${v.value}${v.unit}`, cx+5, cy+14);
    setTxt(v.color); doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.text(v.status, cx+cellW-4, cy+5.5, { align: "right" });
  });
  y += Math.ceil(vitals.length / 2) * (cellH + 4) + 8;
  const conditions = analyzeHealth(record); checkPage(16); setTxt("#0a4d61"); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("AI Health Analysis", MARGIN, y);
  if (conditions.length === 0) { y += 5; checkPage(14); setFill("#f0fdf4"); setDraw("#bbf7d0"); doc.setLineWidth(0.3); doc.roundedRect(MARGIN, y, COL, 12, 2, 2, "FD"); setTxt("#15803d"); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("✓  All Vitals Normal — readings are within healthy ranges.", MARGIN+5, y+7.5); y += 18; }
  else {
    const high = conditions.filter(c => c.risk === "high").length, mod = conditions.filter(c => c.risk === "moderate").length, low = conditions.filter(c => c.risk === "low").length;
    y += 5; doc.setFont("helvetica", "normal"); doc.setFontSize(8); setTxt("#64748b"); doc.text(`${conditions.length} condition(s) detected — ${high} High Risk · ${mod} Moderate · ${low} Low Risk`, MARGIN, y); y += 6;
    const riskColors: Record<string, { bg: string; border: string; text: string; label: string }> = { high: { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626", label: "HIGH RISK" }, moderate: { bg: "#fffbeb", border: "#fcd34d", text: "#b45309", label: "MODERATE" }, low: { bg: "#f0f9ff", border: "#bae6fd", text: "#0369a1", label: "LOW RISK" } };
    for (const cond of conditions) {
      const cfg = riskColors[cond.risk], name = language === "Tagalog" ? cond.nameTagalog : cond.name, explanation = language === "Tagalog" ? cond.explanationTagalog : cond.explanation;
      const lines = wrap(explanation, COL - 20, 8), blockH = 8 + lines.length * 4.2 + 8; checkPage(blockH + 4);
      setFill(cfg.bg); setDraw(cfg.border); doc.setLineWidth(0.4); doc.roundedRect(MARGIN, y, COL, blockH, 2, 2, "FD");
      doc.setFillColor(...hex(cfg.text)); doc.rect(MARGIN, y, 3, blockH, "F"); setTxt(cfg.text); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text(name, MARGIN+7, y+6);
      doc.setFontSize(6.5); doc.text(cfg.label, W-MARGIN-2, y+6, { align: "right" }); setTxt("#64748b"); doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text(`Vitals: ${cond.relatedVitals.join(", ")}`, MARGIN+7, y+11);
      setTxt("#374151"); doc.setFontSize(8); doc.text(lines, MARGIN+7, y+16); y += blockH + 4;
    }
  }
  checkPage(14); y += 4; setFill("#f8fafc"); setDraw("#e2e8f0"); doc.setLineWidth(0.3); doc.roundedRect(MARGIN, y, COL, 12, 2, 2, "FD");
  setTxt("#94a3b8"); doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.text(wrap("This analysis is for informational purposes only and does not constitute medical advice. Consult a qualified healthcare professional for diagnosis and treatment.", COL-8, 7), MARGIN+4, y+4.5);
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) { doc.setPage(p); setTxt("#94a3b8"); doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text("HealthSense Kiosk — Confidential Health Report", MARGIN, 291); doc.text(`Page ${p} of ${totalPages}`, W-MARGIN, 291, { align: "right" }); }
  doc.save(`HealthSense_Report_${record.date.replace(/[\s,]+/g, "_")}.pdf`);
}

// ─── RESULT CARD ──────────────────────────────────────────────────────────────
const ResultCard = ({ icon, title, value, unit, status, type, isLast }: {
  icon: React.ReactNode; title: string; value: string; unit: string;
  status: string; type: StatusType; isLast?: boolean;
}) => {
  const colors = {
    success: { dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-400" },
    warning: { dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200",       bar: "bg-amber-400"   },
    danger:  { dot: "bg-red-500",     badge: "bg-red-50 text-red-700 border-red-200",             bar: "bg-red-500"     },
  };
  const c = colors[type];
  return (
    <div className={`hs-card relative bg-white/80 backdrop-blur-md border border-white rounded-2xl md:rounded-3xl p-4 md:p-5 shadow-lg overflow-hidden group hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-200${isLast ? " col-span-2 sm:col-span-1 sm:col-start-2 w-1/2 sm:w-auto mx-auto sm:mx-0" : ""}`}>
      {/* colored top bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${c.bar} opacity-60 group-hover:opacity-100 transition-opacity`} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 md:w-10 md:h-10 bg-[#139dc7]/8 rounded-xl flex items-center justify-center text-[#139dc7] text-base md:text-lg group-hover:bg-[#139dc7] group-hover:text-white transition-all duration-200 shrink-0">
          {icon}
        </div>
        <span className={`text-[7px] md:text-[8px] font-black uppercase px-2 py-0.5 rounded-full border leading-none ${c.badge}`}>
          {status}
        </span>
      </div>
      <p className="text-[8px] md:text-[9px] font-black text-[#139dc7]/50 uppercase tracking-widest mb-0.5">{title}</p>
      <div className="flex items-baseline gap-0.5">
        <span className="text-xl md:text-2xl lg:text-3xl font-black text-[#0a4d61] leading-none">{value}</span>
        {unit && <span className="text-[10px] md:text-xs font-bold text-[#139dc7]/60 ml-0.5">{unit}</span>}
      </div>
    </div>
  );
};

// ─── RESULT COMPONENT ─────────────────────────────────────────────────────────
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
      summary: "Vital Signs", print: "Print", export: "Export PDF", exporting: "Generating...",
      noRecord: "No Records Found", returnBtn: "Return to Dashboard",
      insightsTitle: "AI Health Analysis", insightsSubtitle: "Rule-based analysis of your vitals",
      allClear: "All Vitals Normal", allClearDesc: "Your readings are within healthy ranges. Keep up the great work!",
      riskLabels: { low: "Low Risk", moderate: "Moderate", high: "High Risk" },
      relatedVitals: "Related Vitals",
      disclaimer: "This analysis is for informational purposes only and does not constitute medical advice. Consult a qualified healthcare professional for diagnosis and treatment.",
      vitals: { spo2: "SpO2", temp: "Temperature", height: "Height", weight: "Weight", bmi: "BMI", bp: "Blood Pressure", hr: "Heart Rate" },
      status: { normal: "Normal", low: "Low", high: "High", fever: "Fever", highFever: "High Fever", ideal: "Ideal", elevated: "Elevated", under: "Underweight", over: "Overweight", obese: "Obese", noData: "No Data" }
    },
    Tagalog: {
      back: "Bumalik sa Dashboard", header: "Pinakabagong Resulta", subHeader: "gamit ang HealthSense Kiosk",
      condition: "Pangkalahatang Kalagayan", excellent: "NAPAKAHUSAY", stable: "MAAYOS",
      summary: "Mga Vital Signs", print: "I-print", export: "I-download", exporting: "Ginagawa...",
      noRecord: "Walang Nahanap na Record", returnBtn: "Bumalik sa Dashboard",
      insightsTitle: "AI Pagsusuri ng Kalusugan", insightsSubtitle: "Pagsusuri batay sa iyong mga vital signs",
      allClear: "Lahat ng Vital Signs ay Normal", allClearDesc: "Ang iyong mga resulta ay nasa malusog na range. Ipagpatuloy ang magandang gawi!",
      riskLabels: { low: "Mababang Panganib", moderate: "Katamtamang Panganib", high: "Mataas na Panganib" },
      relatedVitals: "Kaugnay na Vital Signs",
      disclaimer: "Ang pagsusuring ito ay para lamang sa impormasyon at hindi kapalit ng medikal na payo. Kumonsulta sa kwalipikadong doktor para sa diagnosis at lunas.",
      vitals: { spo2: "Oksiheno", temp: "Temperatura", height: "Tangkad", weight: "Timbang", bmi: "BMI", bp: "Presyon ng Dugo", hr: "Heart Rate" },
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
          .from("health_checkups").select("spo2, temperature, height, weight, bmi, blood_pressure, heart_rate, created_at")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single();
        if (error) throw error;
        if (data) {
          const ts = new Date(data.created_at);
          setLatestRecord({
            date: ts.toLocaleDateString(profile?.language === "Tagalog" ? "tl-PH" : "en-US", { month: "long", day: "numeric", year: "numeric" }),
            time: ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            oxygen: data.spo2?.toString() || "--", temp: data.temperature?.toString() || "--",
            height: data.height?.toString() || "--", weight: data.weight?.toString() || "--",
            bmi: data.bmi?.toString() || "--", bp: data.blood_pressure || "--/--",
            heart_rate: data.heart_rate?.toString() || "--",
          });
        }
      } catch (err) { console.error("Error fetching data:", err); }
      finally { setTimeout(() => setLoading(false), 800); }
    };
    fetchData();
  }, [navigate]);

  const getHealthData = (record: HealthRecord) => {
    const lang = content[language]; const isMetric = units === "metric";
    const healthData: { title: string; value: string; unit: string; status: string; type: StatusType; icon: React.ReactNode }[] = [];

    const s = Number(record.oxygen); let spo2Status = lang.status.normal, spo2Type: StatusType = "success";
    if (isNaN(s)) { spo2Status = lang.status.noData; spo2Type = "warning"; } else if (s < 95) { spo2Status = lang.status.low; spo2Type = "danger"; }
    healthData.push({ title: lang.vitals.spo2, value: record.oxygen, unit: "%", status: spo2Status, type: spo2Type, icon: <FiActivity /> });

    const t = Number(record.temp), displayTemp = isMetric ? t : (t*9/5)+32; let tempStatus = lang.status.normal, tempType: StatusType = "success";
    if (isNaN(t)) { tempStatus = lang.status.noData; tempType = "warning"; } else if (t > 37.5 && t <= 39) { tempStatus = lang.status.fever; tempType = "warning"; } else if (t > 39) { tempStatus = lang.status.highFever; tempType = "danger"; }
    healthData.push({ title: lang.vitals.temp, value: isNaN(t) ? "--" : displayTemp.toFixed(1), unit: isMetric ? "°C" : "°F", status: tempStatus, type: tempType, icon: <FiThermometer /> });

    const b = Number(record.bmi); let bmiStatus = lang.status.normal, bmiType: StatusType = "success";
    if (isNaN(b)) { bmiStatus = lang.status.noData; bmiType = "warning"; } else if (b < 18.5) { bmiStatus = lang.status.under; bmiType = "warning"; } else if (b >= 25 && b < 30) { bmiStatus = lang.status.over; bmiType = "warning"; } else if (b >= 30) { bmiStatus = lang.status.obese; bmiType = "danger"; }
    const w = Number(record.weight), displayWeight = isMetric ? w : w*2.20462;
    healthData.push({ title: lang.vitals.weight, value: isNaN(w) ? "--" : displayWeight.toFixed(1), unit: isMetric ? "kg" : "lb", status: bmiStatus, type: bmiType, icon: <MdMonitorWeight /> });
    healthData.push({ title: lang.vitals.bmi, value: record.bmi, unit: "", status: bmiStatus, type: bmiType, icon: <FiBarChart /> });

    const rawH = Number(record.height), heightM = rawH/100, displayH = isMetric ? heightM : heightM*39.3701;
    healthData.push({ title: lang.vitals.height, value: isNaN(rawH) ? "--" : (isMetric ? heightM.toFixed(2) : displayH.toFixed(1)), unit: isMetric ? "m" : "in", status: lang.status.normal, type: "success", icon: <MdHeight /> });

    let bpStatus = lang.status.ideal, bpType: StatusType = "success";
    if (record.bp?.includes("/") && !record.bp.includes("--")) { const [sys, dia] = record.bp.split("/").map(Number); if (sys > 140 || dia > 90) { bpStatus = lang.status.high; bpType = "danger"; } else if (sys > 120 || dia > 80) { bpStatus = lang.status.elevated; bpType = "warning"; } } else { bpStatus = lang.status.noData; bpType = "warning"; }
    healthData.push({ title: lang.vitals.bp, value: record.bp, unit: ".", status: bpStatus, type: bpType, icon: <FiHeart /> });

    const hr = Number(record.heart_rate); let hrStatus = lang.status.normal, hrType: StatusType = "success";
    if (!record.heart_rate || record.heart_rate === "--" || isNaN(hr)) { hrStatus = lang.status.noData; hrType = "warning"; } else if (hr < 40 || hr > 150) { hrStatus = hr > 150 ? lang.status.high : lang.status.low; hrType = "danger"; } else if (hr < 60) { hrStatus = lang.status.low; hrType = "warning"; } else if (hr > 100) { hrStatus = lang.status.high; hrType = "warning"; }
    healthData.push({ title: lang.vitals.hr, value: record.heart_rate, unit: "bpm", status: hrStatus, type: hrType, icon: <FaHeartbeat /> });

    return healthData;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eaf4ff] font-['Lexend']">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 border-4 border-[#139dc7]/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-[#139dc7] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-[#139dc7] font-black text-sm uppercase tracking-widest animate-pulse">Loading Results</p>
        </div>
      </div>
    );
  }

  if (!latestRecord) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eaf4ff] font-['Lexend']">
        <div className="text-center p-10 bg-white/60 rounded-[32px] backdrop-blur-md border border-white shadow-xl">
          <h2 className="text-2xl font-black text-[#0a4d61] mb-4">{content[language].noRecord}</h2>
          <button onClick={() => navigate("/dashboard")} className="text-[#139dc7] font-bold flex items-center gap-2 mx-auto hover:gap-4 transition-all">
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
  const healthData = getHealthData(latestRecord);

  const riskConfig = {
    low:      { bg: "bg-sky-50",   border: "border-sky-200",   badge: "bg-sky-100 text-sky-700",    icon: <FaCheckCircle className="text-sky-500" />,          dot: "bg-sky-400"   },
    moderate: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", icon: <FaExclamationTriangle className="text-amber-500" />, dot: "bg-amber-400" },
    high:     { bg: "bg-red-50",   border: "border-red-200",   badge: "bg-red-100 text-red-700",    icon: <FiAlertCircle className="text-red-500" />,           dot: "bg-red-500"   },
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-x-hidden">

      {/* HEADER */}
      <header className="hs-no-print w-full px-5 sm:px-8 lg:px-16 py-4 sm:py-6 flex justify-between items-center">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-[#139dc7] font-bold hover:gap-3 transition-all active:scale-95 text-sm sm:text-base">
          <FaArrowLeft size={14} /> {lang.back}
        </button>
        {/* Export actions in header on desktop */}
        <div className="hs-no-print hidden sm:flex items-center gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2 bg-white/60 hover:bg-white text-[#139dc7] rounded-xl border border-white/80 font-bold text-xs transition-all shadow-sm active:scale-95">
            <FaPrint size={11} /> {lang.print}
          </button>
          <button onClick={async () => { setExporting(true); try { await exportToPDF(latestRecord, language, units); } catch (err) { alert(`PDF export failed: ${(err as Error).message}`); } finally { setExporting(false); } }} disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#139dc7] hover:bg-[#0a4d61] disabled:opacity-60 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-[#139dc7]/20 active:scale-95">
            {exporting ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />{lang.exporting}</> : <><FaDownload size={11} /> {lang.export}</>}
          </button>
        </div>
      </header>

      <main id="hs-print-region" className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">

        {/* ── HERO ── */}
        <div className="hs-hero bg-white/70 backdrop-blur-xl rounded-2xl sm:rounded-[32px] border border-white shadow-2xl shadow-[#0a4d61]/10 mb-5 overflow-hidden">
          {/* Top accent bar */}
          <div className={`h-1.5 w-full ${isHealthy ? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" : "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500"}`} />

          <div className="p-5 sm:p-7 lg:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            {/* Date + label */}
            <div>
              <div className="flex items-center gap-2 text-[#139dc7] font-black uppercase tracking-widest text-[10px] mb-2">
                <FaCalendarCheck size={11} />
                {lang.header}
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black text-[#0a4d61] leading-tight">{latestRecord.date}</h1>
              <p className="text-[#139dc7]/60 font-medium mt-1 text-sm">
                {language === "Tagalog" ? "Naitala noong " : "Recorded at "}{latestRecord.time} — {lang.subHeader}
              </p>
            </div>

            {/* Condition badge — fixed: uses correct color based on isHealthy */}
            <div className={`shrink-0 px-6 py-4 sm:px-8 sm:py-5 rounded-2xl sm:rounded-3xl font-black text-center shadow-xl w-full sm:w-auto sm:min-w-44
              ${isHealthy
                ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-200"
                : "bg-gradient-to-br from-amber-500 to-orange-600 shadow-orange-200"}`}>
              <p className="text-[9px] uppercase opacity-75 tracking-widest mb-1 text-white">{lang.condition}</p>
              <p className="text-xl sm:text-2xl text-white">{isHealthy ? lang.excellent : lang.stable}</p>
            </div>
          </div>
        </div>

        {/* ── VITALS SECTION LABEL ── */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#0a4d61]">{lang.summary}</h2>
            <p className="text-[9px] text-[#139dc7]/40 font-bold uppercase tracking-widest mt-0.5">
              {language === "English" ? "Latest recorded measurements" : "Pinakabagong naitalang sukat"}
            </p>
          </div>
          {/* Mobile export buttons */}
          <div className="hs-no-print flex sm:hidden items-center gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-1 px-3 py-1.5 bg-white/60 hover:bg-white text-[#139dc7] rounded-xl border border-white/80 font-bold text-[10px] transition-all active:scale-95">
              <FaPrint size={10} /> {lang.print}
            </button>
            <button onClick={async () => { setExporting(true); try { await exportToPDF(latestRecord, language, units); } catch (err) { alert(`PDF export failed: ${(err as Error).message}`); } finally { setExporting(false); } }} disabled={exporting}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#139dc7] hover:bg-[#0a4d61] disabled:opacity-60 text-white rounded-xl font-bold text-[10px] transition-all active:scale-95">
              {exporting ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><FaDownload size={9} /> {lang.export}</>}
            </button>
          </div>
        </div>

        {/* ── VITALS GRID: 2 cols mobile → 3 cols sm+ → 4 cols lg ── */}
        <div className="hs-grid grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          {healthData.map((data, index, arr) => {
            // On mobile (2-col): center last card if arr length is odd
            const isLastAndAlone = index === arr.length - 1 && arr.length % 2 !== 0;
            return (
              <ResultCard
                key={index}
                {...data}
                isLast={isLastAndAlone}
              />
            );
          })}
        </div>

        {/* ── AI HEALTH INSIGHTS ── */}
        <section>
          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 px-1">
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#0a4d61] flex items-center gap-2">
                <FaShieldAlt className="text-[#139dc7]" size={15} />
                {lang.insightsTitle}
              </h2>
              <p className="text-[9px] text-[#139dc7]/40 font-bold uppercase tracking-widest mt-0.5">{lang.insightsSubtitle}</p>
            </div>
            {/* Risk summary badges — on their own row on mobile so they never overlap */}
            {conditions.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {highCount > 0 && (
                  <span className="flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-1.5 bg-red-100 text-red-700 rounded-full border border-red-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {highCount} {lang.riskLabels.high}
                  </span>
                )}
                {modCount > 0 && (
                  <span className="flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {modCount} {lang.riskLabels.moderate}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* All clear */}
          {conditions.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-md border border-emerald-200 rounded-3xl p-5 sm:p-7 flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-100 rounded-2xl flex items-center justify-center shrink-0">
                <FaCheckCircle className="text-emerald-500 text-xl sm:text-2xl" />
              </div>
              <div>
                <p className="font-black text-emerald-700 text-sm sm:text-base">{lang.allClear}</p>
                <p className="text-emerald-600/70 text-xs sm:text-sm mt-0.5">{lang.allClearDesc}</p>
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
                  <div key={i} className={`${cfg.bg} ${cfg.border} border rounded-2xl sm:rounded-[22px] overflow-hidden transition-all duration-200`}>
                    <button onClick={() => setExpandedCondition(isOpen ? null : i)}
                      className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-left">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} border ${cfg.border}`}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-[#0a4d61] text-sm sm:text-base leading-tight">{name}</p>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <span className="text-[7px] font-black uppercase tracking-wider text-[#139dc7]/50">{lang.relatedVitals}:</span>
                          {cond.relatedVitals.map(v => (
                            <span key={v} className="text-[7px] font-black uppercase px-1.5 py-0.5 bg-white/70 text-[#139dc7] rounded-full border border-[#139dc7]/20">{v}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[7px] sm:text-[8px] font-black uppercase px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full hidden xs:inline ${cfg.badge}`}>
                          {lang.riskLabels[cond.risk]}
                        </span>
                        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-transform duration-200 ${isOpen ? "bg-[#0a4d61]/10 rotate-180" : "bg-white/50"}`}>
                          <FaChevronDown size={9} className="text-[#0a4d61]/60" />
                        </div>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                        <div className="h-px bg-white/60 mb-3" />
                        <div className="flex items-start gap-2.5">
                          <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                          <p className="text-xs sm:text-sm text-[#0a4d61]/80 leading-relaxed font-medium">{explanation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-5 flex items-start gap-2 px-1">
            <FiInfo className="text-[#139dc7]/30 shrink-0 mt-0.5" size={12} />
            <p className="text-[8px] sm:text-[9px] text-[#139dc7]/40 font-medium leading-relaxed">{lang.disclaimer}</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Result;