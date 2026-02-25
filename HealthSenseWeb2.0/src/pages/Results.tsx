import React, { useState, useEffect } from "react";
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

const Result: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [latestRecord, setLatestRecord] = useState<HealthRecord | null>(null);
  const [language, setLanguage] = useState<"English" | "Tagalog">("English");
  const [units, setUnits] = useState<"metric" | "imperial">("metric");

  // Translation Object
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
      insights: "Health Insights",
      sync: "Syncing Latest Vitals...",
      noRecord: "No Records Found",
      returnBtn: "Return to Dashboard",
      vitals: {
        spo2: "SpO2",
        temp: "Temperature",
        height: "Height",
        weight: "Weight",
        bmi: "BMI",
        bp: "Blood Pressure"
      },
      status: {
        normal: "Normal",
        low: "Low",
        high: "High",
        fever: "Fever",
        highFever: "High Fever",
        ideal: "Ideal",
        elevated: "Elevated",
        under: "Underweight",
        over: "Overweight",
        obese: "Obese",
        noData: "No Data"
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
      insights: "Kaalaman sa Kalusugan",
      sync: "Sini-sync ang mga Resulta...",
      noRecord: "Walang Nahanap na Record",
      returnBtn: "Bumalik sa Dashboard",
      vitals: {
        spo2: "Oksiheno",
        temp: "Temperatura",
        height: "Tangkad",
        weight: "Timbang",
        bmi: "BMI",
        bp: "Presyon ng Dugo"
      },
      status: {
        normal: "Normal",
        low: "Mababa",
        high: "Mataas",
        fever: "May Lagnat",
        highFever: "Mataas na Lagnat",
        ideal: "Tamang Presyon",
        elevated: "Tumataas",
        under: "Payat",
        over: "Mabigat",
        obese: "Obese",
        noData: "Walang Data"
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

        // 1. Fetch Profile for Language AND Unit preference
        const { data: profile } = await supabase
          .from("profiles")
          .select("language, units")
          .eq("id", user.id)
          .single();
        
        if (profile?.language) setLanguage(profile.language as "English" | "Tagalog");
        // Set units from DB (fallback to metric)
        if (profile?.units) setUnits(profile.units.toLowerCase() as "metric" | "imperial");

        // 2. Fetch Latest Health Record
        const { data, error } = await supabase
          .from("health_checkups")
          .select("spo2, temperature, height, weight, bmi, blood_pressure, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;

        if (data) {
          const timestamp = new Date(data.created_at);
          setLatestRecord({
            date: timestamp.toLocaleDateString(profile?.language === "Tagalog" ? 'tl-PH' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

  const getHealthData = (record: HealthRecord) => {
    const lang = content[language];
    const isMetric = units === "metric";
    const { oxygen: spo2, temp, height, weight, bmi: bmiVal, bp } = record;
    const healthData = [];

    // SpO2 logic (Remains % for both)
    let spo2Status = lang.status.normal, spo2Type: StatusType = "success";
    const s = Number(spo2);
    if (isNaN(s)) { spo2Status = lang.status.noData; spo2Type = "warning"; }
    else if (s < 95) { spo2Status = lang.status.low; spo2Type = "danger"; }
    healthData.push({ title: lang.vitals.spo2, value: spo2, unit: "%", status: spo2Status, type: spo2Type, icon: <FiActivity /> });

    // Temp logic (Metric: °C | Imperial: °F)
    let tempStatus = lang.status.normal, tempType: StatusType = "success";
    const t = Number(temp); // Raw Celsius from DB
    const displayTemp = isMetric ? t : (t * 9/5) + 32;
    
    if (isNaN(t)) { tempStatus = lang.status.noData; tempType = "warning"; }
    else if (t > 37.5 && t <= 39) { tempStatus = lang.status.fever; tempType = "warning"; }
    else if (t > 39) { tempStatus = lang.status.highFever; tempType = "danger"; }
    
    healthData.push({ 
        title: lang.vitals.temp, 
        value: displayTemp.toFixed(1), 
        unit: isMetric ? "°C" : "°F", 
        status: tempStatus, 
        type: tempType, 
        icon: <FiThermometer /> 
    });

    // BMI logic (BMI is a universal ratio, calculation remains the same)
    let bmiStatus = lang.status.normal, bmiType: StatusType = "success";
    const b = Number(bmiVal);
    if (isNaN(b)) { bmiStatus = lang.status.noData; bmiType = "warning"; }
    else if (b < 18.5) { bmiStatus = lang.status.under; bmiType = "warning"; }
    else if (b >= 25 && b < 30) { bmiStatus = lang.status.over; bmiType = "warning"; }
    else if (b >= 30) { bmiStatus = lang.status.obese; bmiType = "danger"; }
    
    // Weight logic (Metric: kg | Imperial: lb)
    const w = Number(weight);
    const displayWeight = isMetric ? w : (w * 2.20462);
    healthData.push({ 
        title: lang.vitals.weight, 
        value: displayWeight.toFixed(1), 
        unit: isMetric ? "kg" : "lb", 
        status: bmiStatus, 
        type: bmiType, 
        icon: <MdMonitorWeight /> 
    });

    healthData.push({ title: lang.vitals.bmi, value: bmiVal, unit: "", status: bmiStatus, type: bmiType, icon: <FiBarChart /> });

    // Height logic (DB stores cm, display m or in)
    const rawHeight = Number(height); // e.g., 180
    const heightInMeters = rawHeight / 100; // converts 180 to 1.80
    const displayHeight = isMetric ? heightInMeters : (heightInMeters * 39.3701);

    healthData.push({ 
        title: lang.vitals.height, 
        value: isMetric ? heightInMeters.toFixed(2) : displayHeight.toFixed(1), 
        unit: isMetric ? "m" : "in", 
        status: lang.status.normal, 
        type: "success" as StatusType, 
        icon: <MdHeight /> 
    });

    // Blood Pressure (mmHg is universal)
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
          <button onClick={() => navigate('/dashboard')} className="text-[#139dc7] font-bold flex items-center gap-2 mx-auto">
            <FaArrowLeft /> {content[language].returnBtn}
          </button>
        </div>
      </div>
    );
  }

  const isHealthy = Number(latestRecord.oxygen) >= 95 && Number(latestRecord.bmi) < 25;

  return (
    <div className="min-h-screen bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-x-hidden">
      
      <header className="w-full px-8 lg:px-16 py-6 flex justify-between items-center z-50">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-[#139dc7] font-bold hover:gap-4 transition-all active:scale-95"
        >
          <FaArrowLeft /> {content[language].back}
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-20">
        
        {/* HERO SECTION */}
        <div className="bg-white/70 backdrop-blur-xl rounded-[40px] p-8 md:p-12 border border-white shadow-2xl mb-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 text-[#139dc7] font-bold uppercase tracking-widest text-sm mb-2">
              <FaCalendarCheck /> {content[language].header}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-[#0a4d61]">{latestRecord.date}</h1>
            <p className="text-[#139dc7] font-medium mt-1">
                {language === "Tagalog" ? "Naitala noong " : "Recorded at "}
                {latestRecord.time} {content[language].subHeader}
            </p>
          </div>
          <div className={`${isHealthy ? 'bg-green-500 shadow-green-200' : 'bg-orange-500 shadow-orange-200'} text-white px-8 py-4 rounded-3xl font-bold text-center shadow-xl transition-colors duration-500 min-w-48`}>
            <p className="text-[10px] uppercase opacity-80 mb-1">{content[language].condition}</p>
            <p className="text-2xl">{isHealthy ? content[language].excellent : content[language].stable}</p>
          </div>
        </div>

        {/* ACTION BAR */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 px-4">
          <h3 className="text-[#0a4d61] font-bold flex items-center gap-2 text-lg">
            <FiInfo className="text-[#139dc7]" /> {content[language].summary}
          </h3>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white/60 hover:bg-white text-[#139dc7] rounded-full border border-white font-bold text-xs transition-all shadow-sm">
              <FaPrint size={12} /> {content[language].print}
            </button>
            <button className="flex items-center gap-2 px-6 py-2.5 bg-[#139dc7] hover:bg-[#0a4d61] text-white rounded-full font-bold text-xs transition-all shadow-lg">
              <FaDownload size={12} /> {content[language].export}
            </button>
          </div>
        </div>

        {/* RESULTS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {getHealthData(latestRecord).map((data, index) => (
            <ResultCard 
              key={index}
              {...data}
            />
          ))}
        </div>

        {/* HEALTH INSIGHTS */}
        <section className="mt-12 bg-[#0a4d61] rounded-[40px] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="flex items-center gap-2 text-xl font-bold mb-4">
              <FiInfo className="text-[#9fc5f8]" /> {content[language].insights}
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              <p className="text-blue-100/80 leading-relaxed text-lg">
                {language === "English" ? (
                  <>Your SpO2 levels of <span className="text-white font-bold">{latestRecord.oxygen}%</span> are within the optimal range. Your BMI of <span className="text-white font-bold">{latestRecord.bmi}</span> indicates a {Number(latestRecord.bmi) < 25 ? "healthy" : "monitored"} weight.</>
                ) : (
                  <>Ang iyong SpO2 na <span className="text-white font-bold">{latestRecord.oxygen}%</span> ay nasa tamang range. Ang iyong BMI na <span className="text-white font-bold">{latestRecord.bmi}</span> ay nagpapakita ng {Number(latestRecord.bmi) < 25 ? "malusog" : "binabantayang"} timbang.</>
                )}
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-sm font-medium">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" /> 
                  {language === "English" ? "Maintain hydration." : "Uminom ng sapat na tubig."}
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-300" /> 
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

const ResultCard = ({ icon, title, value, unit, status, type }: { icon: any, title: string, value: string, unit: string, status: string, type: StatusType }) => {
  const typeColors = {
    success: "bg-green-500/10 text-green-600 border-green-200",
    warning: "bg-orange-500/10 text-orange-600 border-orange-200",
    danger: "bg-red-500/10 text-red-600 border-red-200"
  };

  return (
    <div className="bg-white/80 backdrop-blur-md border border-white p-7 rounded-4xl shadow-lg group hover:bg-white transition-all hover:-translate-y-1">
      <div className="flex justify-between items-start mb-6">
        <div className="w-14 h-14 bg-[#139dc7]/10 rounded-2xl flex items-center justify-center text-[#139dc7] text-3xl group-hover:bg-[#139dc7] group-hover:text-white transition-all duration-300">
          {icon}
        </div>
        <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border shadow-sm ${typeColors[type]}`}>
          {status}
        </span>
      </div>
      <div>
        <p className="text-xs font-bold text-[#139dc7]/50 uppercase tracking-widest mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black text-[#0a4d61]">{value}</span>
          <span className="text-sm font-bold text-[#139dc7]">{unit}</span>
        </div>
      </div>
    </div>
  );
};

export default Result;