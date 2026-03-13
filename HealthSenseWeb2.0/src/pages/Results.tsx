import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaDownload, FaCalendarCheck, FaPrint } from "react-icons/fa";
import { FiActivity, FiThermometer, FiBarChart, FiHeart, FiInfo } from "react-icons/fi";
import { MdHeight, MdMonitorWeight } from "react-icons/md";
import { supabase } from "../supabaseClient";

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

// ─── Inject @media print styles once into <head> ─────────────────────────────
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
        position: fixed;
        inset: 0;
        width: 100%;
        padding: 32px;
        background: white !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .hs-no-print { display: none !important; }
      #hs-print-region .hs-card {
        background: #f0f8ff !important;
        backdrop-filter: none !important;
        box-shadow: none !important;
        border: 1px solid #d0e8f8 !important;
      }
      #hs-print-region .hs-hero {
        background: #eaf4ff !important;
        backdrop-filter: none !important;
        box-shadow: none !important;
        border: 1px solid #c0d8f0 !important;
      }
      #hs-print-region .hs-grid {
        grid-template-columns: repeat(3, 1fr) !important;
      }
      #hs-print-region * { transform: none !important; }
    }
  `;
  document.head.appendChild(style);
}

// ─── Preload PDF libs at module level ────────────────────────────────────────
let html2canvasLib: typeof import("html2canvas")["default"] | null = null;
let jsPDFLib: typeof import("jspdf")["default"] | null = null;

async function preloadPDFLibs() {
  if (!html2canvasLib || !jsPDFLib) {
    const [{ default: h2c }, { default: jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    html2canvasLib = h2c;
    jsPDFLib = jsPDF;
  }
}
preloadPDFLibs().catch(() => {});

const Result: React.FC = () => {
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [latestRecord, setLatestRecord] = useState<HealthRecord | null>(null);
  const [language, setLanguage] = useState<"English" | "Tagalog">("English");
  const [units, setUnits] = useState<"metric" | "imperial">("metric");

  useEffect(() => { injectPrintStyles(); }, []);

  const content = {
    English: {
      back: "Back to Dashboard",
      header: "Latest Checkup Result",
      subHeader: "via HealthSense Kiosk",
      condition: "Overall Condition",
      excellent: "EXCELLENT",
      stable: "STABLE",
      summary: "Report Summary",
      print: "Print",
      export: "Export PDF",
      exporting: "Generating...",
      insights: "Health Insights",
      noRecord: "No Records Found",
      returnBtn: "Return to Dashboard",
      vitals: { spo2: "SpO2", temp: "Temperature", height: "Height", weight: "Weight", bmi: "BMI", bp: "Blood Pressure" },
      status: {
        normal: "Normal", low: "Low", high: "High", fever: "Fever", highFever: "High Fever",
        ideal: "Ideal", elevated: "Elevated", under: "Underweight", over: "Overweight", obese: "Obese", noData: "No Data"
      }
    },
    Tagalog: {
      back: "Bumalik sa Dashboard",
      header: "Pinakabagong Resulta",
      subHeader: "gamit ang HealthSense Kiosk",
      condition: "Pangkalahatang Kalagayan",
      excellent: "NAPAKAHUSAY",
      stable: "MAAYOS",
      summary: "Buod ng Report",
      print: "I-print",
      export: "I-download",
      exporting: "Ginagawa...",
      insights: "Kaalaman sa Kalusugan",
      noRecord: "Walang Nahanap na Record",
      returnBtn: "Bumalik sa Dashboard",
      vitals: { spo2: "Oksiheno", temp: "Temperatura", height: "Tangkad", weight: "Timbang", bmi: "BMI", bp: "Presyon ng Dugo" },
      status: {
        normal: "Normal", low: "Mababa", high: "Mataas", fever: "May Lagnat", highFever: "Mataas na Lagnat",
        ideal: "Tamang Presyon", elevated: "Tumataas", under: "Payat", over: "Mabigat", obese: "Obese", noData: "Walang Data"
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/"); return; }

        const { data: profile } = await supabase
          .from("profiles").select("language, units").eq("id", user.id).single();

        if (profile?.language) setLanguage(profile.language as "English" | "Tagalog");
        if (profile?.units) setUnits(profile.units.toLowerCase() as "metric" | "imperial");

        const { data, error } = await supabase
          .from("health_checkups")
          .select("spo2, temperature, height, weight, bmi, blood_pressure, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1).single();

        if (error) throw error;

        if (data) {
          const timestamp = new Date(data.created_at);
          setLatestRecord({
            date: timestamp.toLocaleDateString(profile?.language === "Tagalog" ? "tl-PH" : "en-US", { month: "long", day: "numeric", year: "numeric" }),
            time: timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            oxygen: data.spo2?.toString() || "--",
            temp: data.temperature?.toString() || "--",
            height: data.height?.toString() || "--",
            weight: data.weight?.toString() || "--",
            bmi: data.bmi?.toString() || "--",
            bp: data.blood_pressure || "--/--"
          });
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setTimeout(() => setLoading(false), 800);
      }
    };
    fetchData();
  }, [navigate]);

  // ─── PRINT ───────────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  // ─── EXPORT PDF ──────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (!printRef.current || !latestRecord) return;
    setExporting(true);
    try {
      await preloadPDFLibs();
      const html2canvas = html2canvasLib!;
      const jsPDF = jsPDFLib!;

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#eaf4ff",
        logging: false,
        ignoreElements: (el) => el.classList.contains("hs-no-print"),
        onclone: (cloned: Document) => {
          // ── 1. Inject a patch stylesheet to override all oklch colors ──────────
          // html2canvas cannot parse oklch() (used by Tailwind v4).
          // Injecting explicit hex overrides into the cloned document's <head>
          // forces color resolution before html2canvas reads computed styles.
          const patch = cloned.createElement("style");
          patch.textContent = `
            *, *::before, *::after {
              backdrop-filter: none !important;
              -webkit-backdrop-filter: none !important;
              transition: none !important;
              transform: none !important;
              animation: none !important;
            }
            .text-green-400  { color: #4ade80 !important; }
            .text-green-600  { color: #16a34a !important; }
            .text-orange-600 { color: #ea580c !important; }
            .text-red-600    { color: #dc2626 !important; }
            .text-blue-100   { color: #dbeafe !important; }
            .text-blue-300   { color: #93c5fd !important; }
            .text-white      { color: #ffffff !important; }
            [class*="bg-white/"]    { background-color: #f0f8ff !important; }
            [class*="bg-green-500/"]  { background-color: #f0fdf4 !important; }
            [class*="bg-orange-500/"] { background-color: #fff7ed !important; }
            [class*="bg-red-500/"]    { background-color: #fef2f2 !important; }
            [class*="text-blue-100/"] { color: #dbeafe !important; }
            [class*="text-[#139dc7]/"] { color: #139dc7 !important; }
            [class*="bg-[#139dc7]/"]  { background-color: #e0f5fb !important; }
            [class*="bg-white/5"]     { background-color: transparent !important; }
            .border-green-200  { border-color: #bbf7d0 !important; }
            .border-orange-200 { border-color: #fed7aa !important; }
            .border-red-200    { border-color: #fecaca !important; }
            .bg-green-500  { background-color: #22c55e !important; }
            .bg-orange-500 { background-color: #f97316 !important; }
            .bg-blue-300   { background-color: #93c5fd !important; }
            .bg-green-400  { background-color: #4ade80 !important; }
            [class*="shadow-green-"], [class*="shadow-orange-"] { box-shadow: none !important; }
            .hs-card {
              background: #f0f8ff !important;
              border: 1px solid #d0e8f8 !important;
              box-shadow: none !important;
            }
            .hs-hero {
              background: #eaf4ff !important;
              border: 1px solid #c0d8f0 !important;
              box-shadow: none !important;
            }
            .blur-3xl { filter: none !important; opacity: 0 !important; }
          `;
          cloned.head.appendChild(patch);

          // ── 2. Also zero out backdrop-filter inline (belt-and-suspenders) ──────
          cloned.querySelectorAll("*").forEach((el) => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.backdropFilter = "none";
            (htmlEl.style as CSSStyleDeclaration & { webkitBackdropFilter: string }).webkitBackdropFilter = "none";
            htmlEl.style.transform = "none";
            htmlEl.style.transition = "none";
          });

          // ── 3. Force root background ─────────────────────────────────────────
          const root = cloned.querySelector("#hs-print-region") as HTMLElement | null;
          if (root) {
            root.style.background = "#eaf4ff";
            root.style.padding = "32px";
          }

          // ── 4. Force 3-col grid ──────────────────────────────────────────────
          const grid = cloned.querySelector(".hs-grid") as HTMLElement | null;
          if (grid) grid.style.gridTemplateColumns = "repeat(3, 1fr)";
        },
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * pageW) / canvas.width;

      if (imgH <= pageH) {
        pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH);
      } else {
        let yOffset = 0;
        let remaining = imgH;
        while (remaining > 0) {
          pdf.addImage(imgData, "PNG", 0, -yOffset, imgW, imgH);
          remaining -= pageH;
          yOffset += pageH;
          if (remaining > 0) pdf.addPage();
        }
      }

      const fileName = `HealthSense_Report_${latestRecord.date.replace(/[\s,]+/g, "_")}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert(`PDF export failed: ${(err as Error).message ?? "Unknown error"}. Try the Print button instead.`);
    } finally {
      setExporting(false);
    }
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
    const displayWeight = isMetric ? w : (w * 2.20462);
    healthData.push({ title: lang.vitals.weight, value: displayWeight.toFixed(1), unit: isMetric ? "kg" : "lb", status: bmiStatus, type: bmiType, icon: <MdMonitorWeight /> });
    healthData.push({ title: lang.vitals.bmi, value: bmiVal, unit: "", status: bmiStatus, type: bmiType, icon: <FiBarChart /> });

    const rawHeight = Number(height);
    const heightInMeters = rawHeight / 100;
    const displayHeight = isMetric ? heightInMeters : (heightInMeters * 39.3701);
    healthData.push({ title: lang.vitals.height, value: isMetric ? heightInMeters.toFixed(2) : displayHeight.toFixed(1), unit: isMetric ? "m" : "in", status: lang.status.normal, type: "success" as StatusType, icon: <MdHeight /> });

    let bpStatus = lang.status.ideal, bpType: StatusType = "success";
    if (bp && bp.includes("/") && !bp.includes("--")) {
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
          <div className="w-16 h-16 border-4 border-[#139dc7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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

  return (
    <div className="min-h-screen bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-x-hidden">

      {/* Back button — hidden when printing */}
      <header className="hs-no-print w-full px-5 lg:px-16 py-4 md:py-6 flex justify-between items-center z-50">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-[#139dc7] font-bold hover:gap-4 transition-all active:scale-95 text-sm md:text-base"
        >
          <FaArrowLeft /> {lang.back}
        </button>
      </header>

      {/* ══ PRINTABLE / PDF-CAPTURABLE REGION ══ */}
      <main id="hs-print-region" ref={printRef} className="max-w-5xl mx-auto px-4 md:px-6 pb-16">

        {/* HERO */}
        <div className="hs-hero bg-white/70 backdrop-blur-xl rounded-[28px] md:rounded-[40px] p-5 md:p-8 lg:p-12 border border-white shadow-2xl mb-4 md:mb-6 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-[#139dc7] font-bold uppercase tracking-widest text-xs mb-1.5">
              <FaCalendarCheck /> {lang.header}
            </div>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-[#0a4d61]">{latestRecord.date}</h1>
            <p className="text-[#139dc7] font-medium mt-1 text-sm md:text-base">
              {language === "Tagalog" ? "Naitala noong " : "Recorded at "}
              {latestRecord.time} {lang.subHeader}
            </p>
          </div>
          <div className={`${isHealthy ? "bg-green-500 shadow-green-200" : "bg-orange-500 shadow-orange-200"} text-white px-6 py-3 md:px-8 md:py-4 rounded-2xl md:rounded-3xl font-bold text-center shadow-xl transition-colors duration-500 w-full md:min-w-48 md:w-auto`}>
            <p className="text-[9px] md:text-[10px] uppercase opacity-80 mb-0.5">{lang.condition}</p>
            <p className="text-xl md:text-2xl">{isHealthy ? lang.excellent : lang.stable}</p>
          </div>
        </div>

        {/* ACTION BAR — hidden in print + stripped from PDF clone via .hs-no-print */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 md:mb-8 px-1 md:px-4">
          <h3 className="text-[#0a4d61] font-bold flex items-center gap-2 text-sm md:text-lg">
            <FiInfo className="text-[#139dc7]" /> {lang.summary}
          </h3>
          <div className="hs-no-print flex items-center gap-2 md:gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/60 hover:bg-white text-[#139dc7] rounded-full border border-white font-bold text-xs transition-all shadow-sm active:scale-95"
            >
              <FaPrint size={11} /> {lang.print}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#139dc7] hover:bg-[#0a4d61] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-full font-bold text-xs transition-all shadow-lg active:scale-95"
            >
              {exporting ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                  {lang.exporting}
                </>
              ) : (
                <>
                  <FaDownload size={11} /> {lang.export}
                </>
              )}
            </button>
          </div>
        </div>

        {/* RESULTS GRID */}
        <div className="hs-grid grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-5">
          {getHealthData(latestRecord).map((data, index) => (
            <ResultCard key={index} {...data} />
          ))}
        </div>

        {/* HEALTH INSIGHTS */}
        <section className="mt-8 md:mt-12 bg-[#0a4d61] rounded-[28px] md:rounded-[40px] p-6 md:p-8 lg:p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="flex items-center gap-2 text-base md:text-xl font-bold mb-3 md:mb-4">
              <FiInfo className="text-[#9fc5f8]" /> {lang.insights}
            </h3>
            <div className="grid md:grid-cols-2 gap-5 md:gap-8">
              <p className="text-blue-100/80 leading-relaxed text-sm md:text-lg">
                {language === "English" ? (
                  <>Your SpO2 levels of <span className="text-white font-bold">{latestRecord.oxygen}%</span> are within the optimal range. Your BMI of <span className="text-white font-bold">{latestRecord.bmi}</span> indicates a {Number(latestRecord.bmi) < 25 ? "healthy" : "monitored"} weight.</>
                ) : (
                  <>Ang iyong SpO2 na <span className="text-white font-bold">{latestRecord.oxygen}%</span> ay nasa tamang range. Ang iyong BMI na <span className="text-white font-bold">{latestRecord.bmi}</span> ay nagpapakita ng {Number(latestRecord.bmi) < 25 ? "malusog" : "binabantayang"} timbang.</>
                )}
              </p>
              <ul className="space-y-3 md:space-y-4">
                <li className="flex items-center gap-3 text-xs md:text-sm font-medium">
                  <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-green-400 shrink-0" />
                  {language === "English" ? "Maintain hydration." : "Uminom ng sapat na tubig."}
                </li>
                <li className="flex items-center gap-3 text-xs md:text-sm font-medium">
                  <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-blue-300 shrink-0" />
                  {language === "English" ? "Data synced with Cloud." : "Naka-sync ang data sa Cloud."}
                </li>
              </ul>
            </div>
          </div>
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
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
    danger: "bg-red-500/10 text-red-600 border-red-200"
  };

  return (
    <div className="hs-card bg-white/80 backdrop-blur-md border border-white p-4 md:p-5 lg:p-6 rounded-2xl md:rounded-3xl shadow-lg group hover:bg-white transition-all hover:-translate-y-1">
      <div className="flex justify-between items-start mb-3 md:mb-4">
        <div className="w-9 h-9 md:w-11 md:h-11 lg:w-12 lg:h-12 bg-[#139dc7]/10 rounded-xl md:rounded-2xl flex items-center justify-center text-[#139dc7] text-lg md:text-2xl group-hover:bg-[#139dc7] group-hover:text-white transition-all duration-300 shrink-0">
          {icon}
        </div>
        <span className={`text-[8px] md:text-[9px] font-black uppercase px-2 py-1 rounded-full border shadow-sm leading-none ${typeColors[type]}`}>
          {status}
        </span>
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