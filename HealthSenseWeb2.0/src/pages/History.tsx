import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSearch, FaFilter, FaTimes, FaCalendarAlt, FaSortAmountDown, FaSortAmountUp, FaChevronDown } from "react-icons/fa";
import { FiActivity, FiThermometer, FiBarChart, FiHeart } from "react-icons/fi";
import { MdHeight, MdMonitorWeight } from "react-icons/md";
import { supabase } from "../supabaseClient";

type StatusType = "success" | "warning" | "danger" | "Unknown";
type SortDir = "newest" | "oldest";

interface Record {
  date: string;
  time: string;
  rawDate: Date;
  oxygen: string;
  temp: string;
  height: string;
  weight: string;
  bmi: string;
  bp: string;
}

const History: React.FC = () => {
  const navigate = useNavigate();
  const filterPanelRef = useRef<HTMLDivElement>(null);

  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
  const [historyData, setHistoryData] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<"English" | "Tagalog">("English");
  const [units, setUnits] = useState<"metric" | "imperial">("metric");

  // ── Filter / Search State ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [monthFilter, setMonthFilter] = useState<string>("all"); // "all" | "2025-03" etc.
  const [sortDir, setSortDir] = useState<SortDir>("newest");

  const content = {
    English: {
      back: "Back to Dashboard", title: "Checkup History",
      subtitle: "Review your past health checkups below.",
      searchPlaceholder: "Search by date (e.g. March 2025)...",
      filter: "Filter", retrieving: "Retrieving records...",
      noRecords: "No records match your filters.", checkedAt: "Checked at",
      viewDetails: "View Details", diagnosticSummary: "Diagnostic Summary",
      reportTitle: "Checkup Report", verified: "Verified by HealthSense AI",
      download: "Download PDF",
      filterTitle: "Filter & Sort",
      filterMonth: "Month",
      filterSort: "Sort Order",
      allMonths: "All Months", newestFirst: "Newest First", oldestFirst: "Oldest First",
      clearFilters: "Clear All",
      vitals: { spo2: "SpO2", temp: "Temperature", height: "Height", weight: "Weight", bmi: "BMI", bp: "BP" },
      status: {
        normal: "Normal", low: "Low", high: "High", fever: "Fever", highFever: "High Fever",
        hypo: "Hypothermia", ideal: "Ideal", elevated: "Elevated",
        average: "Average", belowAverage: "Below Average", under: "Underweight", over: "Overweight", obese: "Obese"
      }
    },
    Tagalog: {
      back: "Bumalik sa Dashboard", title: "Kasaysayan ng Checkup",
      subtitle: "Suriin ang iyong mga nakaraang checkup sa ibaba.",
      searchPlaceholder: "Maghanap gamit ang petsa (hal. Marso 2025)...",
      filter: "I-filter", retrieving: "Kinukuha ang mga record...",
      noRecords: "Walang record na tumutugma sa filter.", checkedAt: "Siniyasat noong",
      viewDetails: "Tingnan ang Detalye", diagnosticSummary: "Buod ng Pagsusuri",
      reportTitle: "Ulat ng Checkup", verified: "Siniyasat ng HealthSense AI",
      download: "I-download ang PDF",
      filterTitle: "Filter at Ayos",
      filterMonth: "Buwan",
      filterSort: "Pagkakasunod",
      allMonths: "Lahat ng Buwan", newestFirst: "Pinakabago Muna", oldestFirst: "Pinakamatanda Muna",
      clearFilters: "I-clear Lahat",
      vitals: { spo2: "Oksiheno", temp: "Temperatura", height: "Tangkad", weight: "Timbang", bmi: "BMI", bp: "BP" },
      status: {
        normal: "Karaniwan", low: "Mababa", high: "Mataas", fever: "May Lagnat", highFever: "Mataas na Lagnat",
        hypo: "Hypothermia", ideal: "Tamang Presyon", elevated: "Tumataas",
        average: "Average", belowAverage: "Mababa sa Average", under: "Payat", over: "Mabigat", obese: "Obese"
      }
    }
  };

  // ── Fetch Data ─────────────────────────────────────────────────────────────
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
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data) {
          const locale = profile?.language === "Tagalog" ? "tl-PH" : "en-US";
          const formattedData: Record[] = data.map((item) => {
            const timestamp = new Date(item.created_at);
            return {
              rawDate: timestamp,
              date: timestamp.toLocaleDateString(locale, { month: "long", day: "numeric", year: "numeric" }),
              time: timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              oxygen: item.spo2?.toString() || "0",
              temp: item.temperature?.toString() || "0",
              height: item.height?.toString() || "0",
              weight: item.weight?.toString() || "0",
              bmi: item.bmi?.toString() || "0",
              bp: item.blood_pressure || "0/0",
            };
          });
          setHistoryData(formattedData);
        }
      } catch (err) {
        console.error("Error fetching health history:", err);
      } finally {
        setTimeout(() => setLoading(false), 800);
      }
    };
    fetchData();
  }, [navigate]);

  // ── Available month options derived from data ──────────────────────────────
  const availableMonths = useMemo(() => {
    const seen = new Set<string>();
    historyData.forEach(r => {
      const key = `${r.rawDate.getFullYear()}-${String(r.rawDate.getMonth() + 1).padStart(2, "0")}`;
      seen.add(key);
    });
    return Array.from(seen).sort().reverse(); // newest month first
  }, [historyData]);

  // ── Active filter count (for badge) ───────────────────────────────────────
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (monthFilter !== "all") count++;
    if (sortDir !== "newest") count++;
    return count;
  }, [monthFilter, sortDir]);

  // ── Filtered + Sorted records ──────────────────────────────────────────────
  const filteredData = useMemo(() => {
    let result = [...historyData];

    // 1. Text search on date string
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => r.date.toLowerCase().includes(q));
    }

    // 2. Month filter
    if (monthFilter !== "all") {
      const [yr, mo] = monthFilter.split("-").map(Number);
      result = result.filter(r => r.rawDate.getFullYear() === yr && r.rawDate.getMonth() + 1 === mo);
    }

    // 3. Sort
    result.sort((a, b) =>
      sortDir === "newest"
        ? b.rawDate.getTime() - a.rawDate.getTime()
        : a.rawDate.getTime() - b.rawDate.getTime()
    );

    return result;
  }, [historyData, searchQuery, monthFilter, sortDir, units]);

  const clearFilters = () => {
    setMonthFilter("all");
    setSortDir("newest");
    setSearchQuery("");
  };

  // ── Health data processor ──────────────────────────────────────────────────
  const getHealthData = (record: Record) => {
    const lang = content[language];
    const isMetric = units === "metric";
    const { oxygen: spo2, temp, height, weight, bmi: bmiVal, bp } = record;
    const healthData = [];

    let spo2Status = lang.status.normal, spo2Type: StatusType = "success";
    const s = Number(spo2);
    if (s < 95) { spo2Status = lang.status.low; spo2Type = "danger"; }
    else if (s <= 98) { spo2Status = lang.status.normal; spo2Type = "warning"; }
    healthData.push({ title: lang.vitals.spo2, value: spo2, unit: "%", status: spo2Status, type: spo2Type, icon: <FiActivity /> });

    let tempStatus = lang.status.normal, tempType: StatusType = "success";
    const t = Number(temp);
    const displayTemp = isMetric ? t : (t * 9 / 5) + 32;
    if (t < 30) { tempStatus = lang.status.hypo; tempType = "danger"; }
    else if (t <= 37.5) { tempStatus = lang.status.normal; tempType = "success"; }
    else if (t <= 39) { tempStatus = lang.status.fever; tempType = "warning"; }
    else { tempStatus = lang.status.highFever; tempType = "danger"; }
    healthData.push({ title: lang.vitals.temp, value: displayTemp.toFixed(1), unit: isMetric ? "°C" : "°F", status: tempStatus, type: tempType, icon: <FiThermometer /> });

    const rawH = Number(height);
    const heightInMeters = rawH / 100;
    const displayHeight = isMetric ? heightInMeters : heightInMeters * 39.3701;
    let heightStatus = lang.status.average, heightType: StatusType = "success";
    if (heightInMeters < 1.5) { heightStatus = lang.status.belowAverage; heightType = "danger"; }
    healthData.push({ title: lang.vitals.height, value: isMetric ? heightInMeters.toFixed(2) : displayHeight.toFixed(1), unit: isMetric ? "m" : "in", status: heightStatus, type: heightType, icon: <MdHeight /> });

    const w = Number(weight);
    const displayWeight = isMetric ? w : w * 2.20462;
    const b = Number(bmiVal);
    let bmiStatus = lang.status.normal, bmiType: StatusType = "success";
    if (b < 18.5) { bmiStatus = lang.status.under; bmiType = "warning"; }
    else if (b < 25) { bmiStatus = lang.status.normal; bmiType = "success"; }
    else if (b < 30) { bmiStatus = lang.status.over; bmiType = "warning"; }
    else { bmiStatus = lang.status.obese; bmiType = "danger"; }
    healthData.push({ title: lang.vitals.weight, value: displayWeight.toFixed(1), unit: isMetric ? "kg" : "lb", status: bmiStatus, type: bmiType, icon: <MdMonitorWeight /> });
    healthData.push({ title: lang.vitals.bmi, value: bmiVal, unit: "", status: bmiStatus, type: bmiType, icon: <FiBarChart /> });

    let bpStatus = lang.status.ideal, bpType: StatusType = "success";
    if (bp.includes("/")) {
      const [sys, dia] = bp.split("/").map(Number);
      if (sys < 90 || dia < 60) { bpStatus = lang.status.low; bpType = "warning"; }
      else if (sys <= 120 && dia <= 80) { bpStatus = lang.status.ideal; bpType = "success"; }
      else if (sys <= 139 || dia <= 89) { bpStatus = lang.status.elevated; bpType = "warning"; }
      else { bpStatus = lang.status.high; bpType = "danger"; }
    }
    healthData.push({ title: lang.vitals.bp, value: bp, unit: "mmHg", status: bpStatus, type: bpType, icon: <FiHeart /> });

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

      {/* HEADER */}
      <header className="w-full px-4 sm:px-8 lg:px-16 py-4 sm:py-6 flex justify-between items-center z-50 shrink-0">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-[#139dc7] font-bold hover:gap-3 transition-all active:scale-95">
          <FaArrowLeft className="text-lg" />
          <span className="text-sm sm:text-base">{lang.back}</span>
        </button>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 lg:px-12 flex flex-col min-h-0">

        {/* PAGE TITLE + SEARCH BAR */}
        <section className="mb-6 shrink-0">
          <h1 className="text-4xl font-bold text-[#139dc7] mb-1">{lang.title}</h1>
          <p className="text-[#139dc7]/60 mb-5 text-sm">{lang.subtitle}</p>

          <div className="flex gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-[#139dc7]/40 pointer-events-none" />
              <input
                type="text"
                placeholder={lang.searchPlaceholder}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-13 bg-white/60 backdrop-blur-md border-2 border-white/60 focus:border-[#139dc7]/40 rounded-2xl pl-12 pr-5 outline-none text-[#139dc7] font-bold text-sm placeholder:text-[#139dc7]/30 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#139dc7]/40 hover:text-[#139dc7] transition-colors">
                  <FaTimes size={14} />
                </button>
              )}
            </div>

            {/* Sort toggle */}
            <button
              onClick={() => setSortDir(d => d === "newest" ? "oldest" : "newest")}
              className="h-13 px-4 bg-white/60 backdrop-blur-md border-2 border-white/60 hover:border-[#139dc7]/30 rounded-2xl text-[#139dc7] flex items-center gap-2 font-bold text-xs transition-all hover:bg-white active:scale-95"
              title={sortDir === "newest" ? lang.newestFirst : lang.oldestFirst}
            >
              {sortDir === "newest" ? <FaSortAmountDown size={15} /> : <FaSortAmountUp size={15} />}
              <span className="hidden sm:inline">{sortDir === "newest" ? lang.newestFirst : lang.oldestFirst}</span>
            </button>

            {/* Filter button with active badge */}
            <div className="relative" ref={filterPanelRef}>
              <button
                onClick={() => setShowFilterPanel(p => !p)}
                className={`h-13 px-5 border-2 rounded-2xl flex items-center gap-2 font-bold text-xs transition-all active:scale-95
                  ${showFilterPanel || activeFilterCount > 0
                    ? "bg-[#139dc7] border-[#139dc7] text-white shadow-lg shadow-[#139dc7]/20"
                    : "bg-white/60 backdrop-blur-md border-white/60 hover:border-[#139dc7]/30 text-[#139dc7] hover:bg-white"}`}
              >
                <FaFilter size={13} />
                <span className="hidden sm:inline">{lang.filter}</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-white text-[#139dc7] text-[9px] font-black flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
                <FaChevronDown size={10} className={`transition-transform ${showFilterPanel ? "rotate-180" : ""}`} />
              </button>

              {/* ── FILTER DROPDOWN PANEL ── */}
              {showFilterPanel && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white/95 backdrop-blur-xl rounded-[28px] border border-white shadow-2xl shadow-[#139dc7]/10 z-50 p-6 animate-in fade-in zoom-in-95 duration-150">

                  <div className="flex items-center justify-between mb-5">
                    <span className="text-xs font-black text-[#0a4d61] uppercase tracking-widest">{lang.filterTitle}</span>
                    <button onClick={clearFilters} className="text-[9px] font-black text-[#139dc7]/50 uppercase tracking-wider hover:text-[#139dc7] transition-colors">
                      {lang.clearFilters}
                    </button>
                  </div>

                  {/* Month filter */}
                  <div className="mb-5">
                    <label className="text-[9px] font-black text-[#139dc7]/50 uppercase tracking-widest block mb-2">{lang.filterMonth}</label>
                    <div className="relative">
                      <select
                        value={monthFilter}
                        onChange={e => setMonthFilter(e.target.value)}
                        className="w-full appearance-none bg-slate-50 border-none rounded-xl px-4 py-2.5 text-[11px] font-bold text-[#0a4d61] outline-none cursor-pointer"
                      >
                        <option value="all">{lang.allMonths}</option>
                        {availableMonths.map(m => {
                          const [yr, mo] = m.split("-");
                          const label = new Date(Number(yr), Number(mo) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
                          return <option key={m} value={m}>{label}</option>;
                        })}
                      </select>
                      <FaChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#139dc7]/40 pointer-events-none" />
                    </div>
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="text-[9px] font-black text-[#139dc7]/50 uppercase tracking-widest block mb-2">{lang.filterSort}</label>
                    <div className="flex gap-1.5">
                      {([
                        { key: "newest", label: lang.newestFirst, icon: <FaSortAmountDown size={11} /> },
                        { key: "oldest", label: lang.oldestFirst, icon: <FaSortAmountUp size={11} /> },
                      ] as { key: SortDir; label: string; icon: React.ReactNode }[]).map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => setSortDir(opt.key)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all
                            ${sortDir === opt.key
                              ? "bg-[#139dc7] text-white shadow-md shadow-[#139dc7]/20"
                              : "bg-slate-50 text-[#0a4d61]/60 hover:bg-slate-100"}`}
                        >
                          {opt.icon} {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-[9px] font-black text-[#139dc7]/40 uppercase tracking-widest">Active:</span>
              {monthFilter !== "all" && (
                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-3 py-1.5 bg-[#139dc7]/10 text-[#139dc7] rounded-full border border-[#139dc7]/20">
                  {new Date(Number(monthFilter.split("-")[0]), Number(monthFilter.split("-")[1]) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  <button onClick={() => setMonthFilter("all")} className="hover:text-[#0a4d61]"><FaTimes size={8} /></button>
                </span>
              )}
              {sortDir !== "newest" && (
                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-3 py-1.5 bg-[#139dc7]/10 text-[#139dc7] rounded-full border border-[#139dc7]/20">
                  {lang.oldestFirst}
                  <button onClick={() => setSortDir("newest")} className="hover:text-[#0a4d61]"><FaTimes size={8} /></button>
                </span>
              )}
              <button onClick={clearFilters} className="text-[9px] font-black text-red-400 hover:text-red-600 uppercase tracking-wider px-2">
                {lang.clearFilters}
              </button>
            </div>
          )}
        </section>

        {/* Result count */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <p className="text-[10px] font-black text-[#139dc7]/40 uppercase tracking-widest">
            {filteredData.length} {filteredData.length === 1 ? "record" : "records"}
            {(searchQuery || activeFilterCount > 0) && ` of ${historyData.length}`}
          </p>
        </div>

        {/* LIST */}
        <div className="flex-1 overflow-y-auto pr-2 pb-10 space-y-4">
          {filteredData.length === 0 ? (
            <div className="bg-white/40 rounded-3xl p-16 text-center border border-white/40 flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#139dc7]/10 flex items-center justify-center">
                <FaSearch className="text-[#139dc7]/40" size={20} />
              </div>
              <p className="text-[#139dc7] font-bold">{lang.noRecords}</p>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs font-black text-[#139dc7] underline underline-offset-2">
                  {lang.clearFilters}
                </button>
              )}
            </div>
          ) : (
            filteredData.map((record, index) => {
              return (
                <div key={index} className="group relative bg-white/70 backdrop-blur-xl rounded-4xl border border-white shadow-sm p-6 md:p-8 transition-all hover:shadow-lg hover:shadow-[#139dc7]/8 hover:-translate-y-0.5">
                  <div className="flex flex-col xl:flex-row items-center gap-6 md:gap-8">

                    {/* Date block */}
                    <div className="w-full xl:w-52 shrink-0 border-b xl:border-b-0 xl:border-r border-[#139dc7]/10 pb-4 xl:pb-0 xl:pr-8">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-[#139dc7]/10 rounded-xl flex items-center justify-center text-[#139dc7] shrink-0 mt-0.5">
                          <FaCalendarAlt size={16} />
                        </div>
                        <div>
                          <p className="text-[#0a4d61] font-extrabold text-base leading-tight">{record.date}</p>
                          <p className="text-[10px] text-[#139dc7] font-black uppercase tracking-[0.15em] opacity-60 mt-1">
                            {lang.checkedAt} {record.time}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Vitals grid */}
                    <div className="flex-1 grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2 md:gap-3 w-full">
                      {getHealthData(record).map((stat, i) => (
                        <div key={i} className="bg-white/60 border border-white p-3 md:p-4 rounded-2xl group-hover:bg-white transition-colors">
                          <p className="text-[8px] md:text-[9px] font-black text-[#139dc7] uppercase mb-1.5 tracking-tight opacity-50">{stat.title}</p>
                          <p className={`font-bold text-[#0a4d61] leading-none ${stat.title === lang.vitals.bp ? "text-xs md:text-sm" : "text-base md:text-lg"}`}>
                            {stat.value}
                            {stat.unit && <span className="text-[8px] ml-0.5 opacity-50 font-medium">{stat.unit}</span>}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* View details */}
                    <button
                      onClick={() => setSelectedRecord(record)}
                      className="w-full xl:w-auto px-6 py-4 bg-[#139dc7] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#139dc7]/20 hover:bg-[#0a4d61] hover:scale-105 transition-all shrink-0 active:scale-95"
                    >
                      {lang.viewDetails}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* ── DETAIL MODAL ── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-8 bg-[#001b2e]/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedRecord(null)} />
          <div className="bg-white/95 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[30px] sm:rounded-[50px] shadow-2xl relative border border-white/50 animate-in zoom-in-95 slide-in-from-bottom-10 duration-300">
            <div className="sticky top-0 z-20 h-2 sm:h-3 w-full bg-linear-to-r from-[#139dc7] to-[#34A0A4]" />
            <button
              onClick={() => setSelectedRecord(null)}
              className="absolute top-4 right-4 sm:top-8 sm:right-8 w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90 shadow-sm z-30"
            >
              <FaTimes size={16} />
            </button>

            <div className="p-6 sm:p-12">
              <div className="mb-6 sm:mb-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="px-3 py-1 bg-[#139dc7]/10 rounded-lg text-[#139dc7] text-[9px] sm:text-[10px] font-black uppercase tracking-tighter">
                    {lang.diagnosticSummary}
                  </div>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-[#0a4d61] tracking-tight leading-tight">{lang.reportTitle}</h2>
                <div className="flex items-center gap-2 mt-2 text-xs sm:text-base">
                  <span className="text-[#139dc7] font-bold">{selectedRecord.date}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#139dc7]/30" />
                  <span className="text-[#139dc7]/60 font-medium">{selectedRecord.time}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                {getHealthData(selectedRecord).map((data, i) => (
                  <div key={i} className="group flex items-center gap-4 sm:gap-5 p-4 sm:p-6 bg-white rounded-3xl sm:rounded-[28px] border border-[#139dc7]/5 shadow-sm hover:border-[#139dc7]/20 transition-all">
                    <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shrink-0 transition-transform group-hover:scale-110
                      ${data.type === "success" ? "bg-green-100 text-green-600" : data.type === "warning" ? "bg-orange-100 text-orange-600" : "bg-red-100 text-red-600"}`}>
                      {data.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] sm:text-[10px] font-black uppercase text-[#139dc7]/40 leading-none mb-1 sm:mb-1.5 tracking-widest">{data.title}</p>
                      <div className="flex items-baseline gap-1">
                        <p className="text-xl sm:text-2xl font-black text-[#0a4d61] leading-none">{data.value}</p>
                        <span className="text-[10px] sm:text-sm font-bold text-[#0a4d61]/40 uppercase">{data.unit}</span>
                      </div>
                      <div className={`mt-1.5 sm:mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-tighter
                        ${data.type === "success" ? "bg-green-500/10 text-green-600" : data.type === "warning" ? "bg-orange-500/10 text-orange-600" : "bg-red-500/10 text-red-600"}`}>
                        <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full animate-pulse
                          ${data.type === "success" ? "bg-green-500" : data.type === "warning" ? "bg-orange-500" : "bg-red-500"}`} />
                        {data.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-[#139dc7]/10 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <p className="text-[9px] sm:text-[10px] font-bold text-[#139dc7]/30 uppercase tracking-[0.2em] text-center">{lang.verified}</p>
                <button onClick={() => window.print()} className="text-[#139dc7] text-xs font-black uppercase hover:underline p-2">{lang.download}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;