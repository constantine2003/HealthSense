import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSearch, FaFilter, FaTimes, FaCalendarAlt } from "react-icons/fa";
import { FiActivity, FiThermometer, FiBarChart, FiHeart } from "react-icons/fi";
import { MdHeight, MdMonitorWeight } from "react-icons/md";
import { supabase } from "../supabaseClient";

// TYPES FOR HEALTH LOGIC
type StatusType = "success" | "warning" | "danger" | "Unknown";

interface Record {
  date: string;
  time: string;
  oxygen: string;
  temp: string;
  height: string;
  weight: string;
  bmi: string;
  bp: string;
}

const History: React.FC = () => {
  const navigate = useNavigate();
  
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
  const [historyData, setHistoryData] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<"English" | "Tagalog">("English");
  const [units, setUnits] = useState<"metric" | "imperial">("metric");

  // Translation Object
  const content = {
    English: {
      back: "Back to Dashboard",
      title: "Checkup History",
      subtitle: "Review your past health checkups below.",
      searchPlaceholder: "Search by date...",
      filter: "Filter",
      retrieving: "Retrieving records...",
      noRecords: "No health records found.",
      checkedAt: "Checked at",
      viewDetails: "View Details",
      diagnosticSummary: "Diagnostic Summary",
      reportTitle: "Checkup Report",
      verified: "Verified by HealthSense AI",
      download: "Download PDF",
      vitals: {
        spo2: "SpO2",
        temp: "Temperature",
        height: "Height",
        weight: "Weight",
        bmi: "BMI",
        bp: "BP"
      },
      status: {
        normal: "Normal",
        low: "Low",
        high: "High",
        fever: "Fever",
        highFever: "High Fever",
        hypo: "Hypothermia",
        ideal: "Ideal",
        elevated: "Elevated",
        average: "Average",
        belowAverage: "Below Average",
        under: "Underweight",
        over: "Overweight",
        obese: "Obese"
      }
    },
    Tagalog: {
      back: "Bumalik sa Dashboard",
      title: "Kasaysayan ng Checkup",
      subtitle: "Suriin ang iyong mga nakaraang checkup sa ibaba.",
      searchPlaceholder: "Maghanap gamit ang petsa...",
      filter: "I-filter",
      retrieving: "Kinukuha ang mga record...",
      noRecords: "Walang nahanap na record.",
      checkedAt: "Siniyasat noong",
      viewDetails: "Tingnan ang Detalye",
      diagnosticSummary: "Buod ng Pagsusuri",
      reportTitle: "Ulat ng Checkup",
      verified: "Siniyasat ng HealthSense AI",
      download: "I-download ang PDF",
      vitals: {
        spo2: "Oksiheno",
        temp: "Temperatura",
        height: "Tangkad",
        weight: "Timbang",
        bmi: "BMI",
        bp: "BP"
      },
      status: {
        normal: "Karaniwan",
        low: "Mababa",
        high: "Mataas",
        fever: "May Lagnat",
        highFever: "Mataas na Lagnat",
        hypo: "Hypothermia",
        ideal: "Tamang Presyon",
        elevated: "Tumataas",
        average: "Average",
        belowAverage: "Mababa sa Average",
        under: "Payat",
        over: "Mabigat",
        obese: "Obese"
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/");
          return;
        }

        // 2. Fetch Profile Language AND Units
        const { data: profile } = await supabase
          .from("profiles")
          .select("language, units")
          .eq("id", user.id)
          .single();
        
        if (profile?.language) setLanguage(profile.language as "English" | "Tagalog");
        // Set units from DB (fallback to metric)
        if (profile?.units) setUnits(profile.units.toLowerCase() as "metric" | "imperial");

        const { data, error } = await supabase
          .from("health_checkups")
          .select("spo2, temperature, height, weight, bmi, blood_pressure, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data) {
          const formattedData: Record[] = data.map((item) => {
            const timestamp = new Date(item.created_at);
            const locale = profile?.language === "Tagalog" ? 'tl-PH' : 'en-US';
            return {
              date: timestamp.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' }),
              time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              oxygen: item.spo2?.toString() || "0",
              temp: item.temperature?.toString() || "0",
              height: item.height?.toString() || "0",
              weight: item.weight?.toString() || "0",
              bmi: item.bmi?.toString() || "0",
              bp: item.blood_pressure || "0/0"
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

  // FULL SCREEN LOADING STATE (Language Neutral)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eaf4ff] font-['Lexend']">
        <div className="text-center animate-in fade-in duration-500">
          {/* Spinner Group */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-[#139dc7]/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-[#139dc7] border-t-transparent rounded-full animate-spin"></div>
          </div>
          
          <h2 className="text-2xl font-black text-[#139dc7] tracking-tight mb-2">
            Loading History
          </h2>
        </div>
      </div>
    );
  }

  // HEALTH LOGIC PROCESSOR WITH TRANSLATION
  const getHealthData = (record: Record) => {
    const lang = content[language];
    const isMetric = units === "metric";
    const { oxygen: spo2, temp, height, weight, bmi: bmiVal, bp } = record;
    const healthData = [];

    // SpO2 (Universal %)
    let spo2Status = lang.status.normal, spo2Type: StatusType = "success";
    const s = Number(spo2);
    if (s < 95) { spo2Status = lang.status.low; spo2Type = "danger"; }
    else if (s <= 98) { spo2Status = lang.status.normal; spo2Type = "warning"; }
    healthData.push({ title: lang.vitals.spo2, value: spo2, unit: "%", status: spo2Status, type: spo2Type, icon: <FiActivity /> });

    // Temperature (C to F)
    let tempStatus = lang.status.normal, tempType: StatusType = "success";
    const t = Number(temp);
    const displayTemp = isMetric ? t : (t * 9/5) + 32;
    if (t < 30) { tempStatus = lang.status.hypo; tempType = "danger"; }
    else if (t <= 37.5) { tempStatus = lang.status.normal; tempType = "success"; }
    else if (t <= 39) { tempStatus = lang.status.fever; tempType = "warning"; }
    else { tempStatus = lang.status.highFever; tempType = "danger"; }
    healthData.push({ title: lang.vitals.temp, value: displayTemp.toFixed(1), unit: isMetric ? "°C" : "°F", status: tempStatus, type: tempType, icon: <FiThermometer /> });

    // Height (Fixed: 180cm -> 1.80m or 70.9in)
    let heightStatus = lang.status.average, heightType: StatusType = "success";
    const rawH = Number(height);
    const heightInMeters = rawH / 100; // Corrects the 180 to 1.80
    const displayHeight = isMetric ? heightInMeters : (heightInMeters * 39.3701);
    if (heightInMeters < 1.5) { heightStatus = lang.status.belowAverage; heightType = "danger"; }
    healthData.push({ 
        title: lang.vitals.height, 
        value: isMetric ? heightInMeters.toFixed(2) : displayHeight.toFixed(1), 
        unit: isMetric ? "m" : "in", 
        status: heightStatus, 
        type: heightType, 
        icon: <MdHeight /> 
    });

    // Weight (kg to lb)
    let bmiStatus = lang.status.normal, bmiType: StatusType = "success";
    const w = Number(weight);
    const displayWeight = isMetric ? w : (w * 2.20462);
    const b = Number(bmiVal);
    if (b < 18.5) { bmiStatus = lang.status.under; bmiType = "warning"; }
    else if (b < 25) { bmiStatus = lang.status.normal; bmiType = "success"; }
    else if (b < 30) { bmiStatus = lang.status.over; bmiType = "warning"; }
    else { bmiStatus = lang.status.obese; bmiType = "danger"; }

    healthData.push({ title: lang.vitals.weight, value: displayWeight.toFixed(1), unit: isMetric ? "kg" : "lb", status: bmiStatus, type: bmiType, icon: <MdMonitorWeight /> });
    healthData.push({ title: lang.vitals.bmi, value: bmiVal, unit: "", status: bmiStatus, type: bmiType, icon: <FiBarChart /> });

    // Blood Pressure (Universal mmHg)
    let bpStatus = lang.status.ideal, bpType: StatusType = "success";
    if (bp.includes("/")) {
      const [systolic, diastolic] = bp.split("/").map(Number);
      if (systolic < 90 || diastolic < 60) { bpStatus = lang.status.low; bpType = "warning"; }
      else if (systolic <= 120 && diastolic <= 80) { bpStatus = lang.status.ideal; bpType = "success"; }
      else if (systolic <= 139 || diastolic <= 89) { bpStatus = lang.status.elevated; bpType = "warning"; }
      else { bpStatus = lang.status.high; bpType = "danger"; }
    }
    healthData.push({ title: lang.vitals.bp, value: bp, unit: "mmHg", status: bpStatus, type: bpType, icon: <FiHeart /> });

    return healthData;
  };

  return (
    <div className="min-h-screen h-screen flex flex-col bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-hidden relative">
      
      {/* HEADER */}
      <header className="w-full px-4 sm:px-8 lg:px-16 py-4 sm:py-6 flex flex-row justify-between items-center z-50 shrink-0 gap-2">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-[#139dc7] font-bold hover:gap-3 transition-all active:scale-95">
          <FaArrowLeft className="text-lg" /> 
          <span className="text-sm sm:text-base">{content[language].back}</span>
        </button>
      </header>

      <main className="flex-1 w-full max-w-360 mx-auto px-6 lg:px-12 flex flex-col min-h-0">
        <section className="mb-8 shrink-0 text-center lg:text-left">
          <h1 className="text-4xl font-bold text-[#139dc7] m-0">{content[language].title}</h1>
          <p className="text-[#139dc7]/60 mb-6">{content[language].subtitle}</p>
          <div className="flex gap-4">
            <div className="flex-1 relative">
                <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-[#139dc7]/40" />
                <input type="text" placeholder={content[language].searchPlaceholder} className="w-full h-14 bg-white/20 border border-white/40 rounded-2xl pl-12 pr-5 outline-none focus:border-[#139dc7] text-[#139dc7]" />
            </div>
            <button className="h-14 px-6 bg-white/20 border border-white/40 rounded-2xl text-[#139dc7] flex items-center gap-2 font-bold"><FaFilter /> {content[language].filter}</button>
          </div>
        </section>

        {/* LIST AREA */}
        <div className="flex-1 overflow-y-auto pr-2 pb-10 space-y-6">
          {historyData.length === 0 ? (
            <div className="bg-white/30 rounded-3xl p-20 text-center border border-white/40">
              <p className="text-[#139dc7] font-bold">{content[language].noRecords}</p>
            </div>
          ) : (
            historyData.map((record, index) => (
              <div key={index} className="group relative bg-white/70 backdrop-blur-xl rounded-4xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 transition-all hover:shadow-[0_20px_40px_rgba(19,157,199,0.1)] hover:-translate-y-1">
                <div className="flex flex-col xl:flex-row items-center gap-8">
                  <div className="w-full xl:w-52 shrink-0 border-b xl:border-b-0 xl:border-r border-[#139dc7]/20 pb-6 xl:pb-0 xl:pr-8">
                    <div className="flex items-center gap-3 text-[#0a4d61] font-extrabold text-2xl">
                      <div className="w-10 h-10 bg-[#139dc7]/10 rounded-xl flex items-center justify-center text-[#139dc7]">
                          <FaCalendarAlt size={18} />
                      </div>
                      {record.date}
                    </div>
                    <div className="mt-2 text-[11px] text-[#139dc7] font-black uppercase tracking-[0.2em] opacity-60 ml-1">
                      {content[language].checkedAt} {record.time}
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 w-full">
                    {/* We call the function here to get the converted values and correct units */}
                    {getHealthData(record).map((stat, i) => (
                      <div 
                        key={i} 
                        className="bg-white/50 border border-white p-4 rounded-2xl shadow-sm group-hover:bg-white transition-colors"
                      >
                        <p className="text-[10px] font-black text-[#139dc7] uppercase mb-2 tracking-tight opacity-50">
                          {stat.title}
                        </p>
                        <p className={`font-bold text-[#0a4d61] ${stat.title === content[language].vitals.bp ? 'text-sm md:text-base' : 'text-lg'} leading-none`}>
                          {stat.value}
                          {/* Only show the unit if it exists (BMI doesn't have one) */}
                          {stat.unit && (
                            <span className="text-[10px] ml-0.5 opacity-60 font-medium">
                              {stat.unit}
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => setSelectedRecord(record)}
                    className="w-full xl:w-auto px-8 py-5 bg-[#139dc7] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[#139dc7]/30 hover:bg-[#0a4d61] hover:scale-105 transition-all shrink-0 active:scale-95"
                  >
                    {content[language].viewDetails}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* VIEW DETAILS MODAL */}
      {selectedRecord && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-8 bg-[#001b2e]/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedRecord(null)} />
          
          {/* Adjusted max-height and overflow-y-auto to prevent cutting off on short screens */}
          <div className="bg-white/95 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[30px] sm:rounded-[50px] shadow-[0_32px_64px_rgba(0,0,0,0.2)] relative border border-white/50 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            
            <div className="sticky top-0 z-20 h-2 sm:h-3 w-full bg-linear-to-r from-[#139dc7] to-[#34A0A4]" />
            
            {/* Moved close button for better thumb-reach on mobile/kiosk */}
            <button 
              onClick={() => setSelectedRecord(null)}
              className="absolute top-4 right-4 sm:top-8 sm:right-8 w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90 shadow-sm z-30"
            >
              <FaTimes size={18} className="sm:text-[24px]" />
            </button>

            <div className="p-6 sm:p-12">
              <div className="mb-6 sm:mb-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="px-3 py-1 bg-[#139dc7]/10 rounded-lg text-[#139dc7] text-[9px] sm:text-[10px] font-black uppercase tracking-tighter">
                    {content[language].diagnosticSummary}
                  </div>
                </div>
                {/* Responsive Font Size for Title */}
                <h2 className="text-2xl sm:text-4xl font-black text-[#0a4d61] tracking-tight leading-tight">
                  {content[language].reportTitle}
                </h2>
                <div className="flex items-center gap-2 mt-2 text-xs sm:text-base">
                  <span className="text-[#139dc7] font-bold">{selectedRecord.date}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#139dc7]/30" />
                  <span className="text-[#139dc7]/60 font-medium">{selectedRecord.time}</span>
                </div>
              </div>

              {/* Changed gap-3 for mobile to save vertical space */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                {getHealthData(selectedRecord).map((data, i) => (
                  <div key={i} className="group flex items-center gap-4 sm:gap-5 p-4 sm:p-6 bg-white rounded-3xl sm:rounded-4xl border border-[#139dc7]/5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-[#139dc7]/20 transition-all">
                    {/* Responsive Icon Size */}
                    <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shrink-0 transition-transform group-hover:scale-110 ${
                      data.type === 'success' ? 'bg-green-100 text-green-600' : 
                      data.type === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {data.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] sm:text-[10px] font-black uppercase text-[#139dc7]/40 leading-none mb-1 sm:mb-1.5 tracking-widest truncate">{data.title}</p>
                      <div className="flex items-baseline gap-1">
                        <p className="text-xl sm:text-2xl font-black text-[#0a4d61] leading-none">{data.value}</p>
                        <span className="text-[10px] sm:text-sm font-bold text-[#0a4d61]/40 uppercase">{data.unit}</span>
                      </div>
                      
                      <div className={`mt-1.5 sm:mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-tighter ${
                        data.type === 'success' ? 'bg-green-500/10 text-green-600' : 
                        data.type === 'warning' ? 'bg-orange-500/10 text-orange-600' : 'bg-red-500/10 text-red-600'
                      }`}>
                        <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full animate-pulse ${
                          data.type === 'success' ? 'bg-green-500' : 
                          data.type === 'warning' ? 'bg-orange-500' : 'bg-red-500'
                        }`} />
                        {data.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer: Mobile flex-col, Tablet/Desktop flex-row */}
              <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-[#139dc7]/10 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <p className="text-[9px] sm:text-[10px] font-bold text-[#139dc7]/30 uppercase tracking-[0.2em] text-center">
                  {content[language].verified}
                </p>
                <button onClick={() => window.print()} className="text-[#139dc7] text-xs font-black uppercase hover:underline p-2">
                  {content[language].download}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    
  );
};

export default History;