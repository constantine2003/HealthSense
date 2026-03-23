import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaUserShield, FaShieldAlt, FaLock, FaArrowLeft, 
  FaCheckCircle, FaSpinner, FaExclamationTriangle,
  FaEye, FaEyeSlash, FaQuestionCircle, FaChevronDown,
  FaHeartbeat, FaShieldVirus, FaUserMd, FaDatabase, FaBrain
} from "react-icons/fa";
import { supabase } from "../supabaseClient";

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(false);
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [profile, setProfile] = useState<{
    first_name: string;
    middle_name: string;
    last_name: string;
    birthday: string;
    sex: string;
    username: string;
  } | null>(null);

  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [largeText, setLargeText] = useState(false);
  const [language, setLanguage] = useState<"English" | "Tagalog">("English");
  const [pendingLanguage, setPendingLanguage] = useState<"English" | "Tagalog">("English");

  const [showPassModal, setShowPassModal] = useState(false);
  const [passData, setPassData] = useState({ old: "", new: "", confirm: "" });
  const [passError, setPassError] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/"); return; }
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, middle_name, last_name, birthday, sex, recovery_email, language, username, units, large_text")
          .eq("id", user.id).single();
        if (error) throw error;
        if (data) {
          setProfile(data);
          setLanguage(data.language || "English");
          setPendingLanguage(data.language || "English");
          const isLarge = !!data.large_text;
          setLargeText(isLarge);
          if (isLarge) document.documentElement.classList.add("large-text-mode");
          else document.documentElement.classList.remove("large-text-mode");
          setUnits(data.units ? data.units.toLowerCase() as "metric" | "imperial" : "metric");
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchProfileData();
  }, [navigate]);

  const calculateAge = (birthday: string) => {
    if (!birthday) return "N/A";
    const birth = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("profiles").update({
        language: pendingLanguage, units, large_text: largeText
      }).eq("id", user.id);
      if (error) throw error;
      if (largeText) document.documentElement.classList.add("large-text-mode");
      else document.documentElement.classList.remove("large-text-mode");
      setLanguage(pendingLanguage);
      setSaveStatus(true);
      setTimeout(() => setSaveStatus(false), 3000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    setPassError("");
    if (!passData.old || !passData.new || !passData.confirm) { setPassError("All fields are required."); return; }
    if (passData.new !== passData.confirm) { setPassError("New passwords do not match."); return; }
    if (passData.new.length < 6) { setPassError("Password must be at least 6 characters."); return; }
    try {
      setPassLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("User email not found.");
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: passData.old });
      if (signInError) { setPassError("The current password you entered is incorrect."); return; }
      const { error: updateError } = await supabase.auth.updateUser({ password: passData.new });
      if (updateError) throw updateError;
      setSaveStatus(true);
      setShowPassModal(false);
      setPassData({ old: "", new: "", confirm: "" });
      setTimeout(() => setSaveStatus(false), 3000);
    } catch (err: any) { setPassError(err.message || "An unexpected error occurred."); }
    finally { setPassLoading(false); }
  };

  const content = {
    English: {
      back: "Back to Dashboard", title: "Account Settings", desc: "Manage profile & viewing preferences",
      personal: "Personal Information", sync: "Synchronize Profile",
      passTitle: "Update Password", passDesc: "Ensure your account stays secure.",
      currPass: "Current Password", newPass: "New Password", confPass: "Confirm New Password",
      cancel: "Cancel", update: "Update Password"
    },
    Tagalog: {
      back: "Bumalik sa Dashboard", title: "Ayos ng Account", desc: "Pamahalaan ang profile at mga kagustuhan",
      personal: "Impormasyon ng Personal", sync: "I-sync ang Profile",
      passTitle: "I-update ang Password", passDesc: "Siguraduhing ligtas ang iyong account.",
      currPass: "Kasalukuyang Password", newPass: "Bagong Password", confPass: "Kumpirmahin ang Bagong Password",
      cancel: "Kanselahin", update: "I-update ang Password"
    }
  };

  const lang = content[language];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eaf4ff] font-['Lexend']">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#139dc7] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#139dc7] font-bold animate-pulse">Loading Account Settings...</p>
        </div>
      </div>
    );
  }

  const fullName = `${profile?.first_name ?? ""} ${profile?.middle_name ? profile.middle_name + " " : ""}${profile?.last_name ?? ""}`.trim();

  return (
    <div className="min-h-screen w-full flex flex-col bg-[linear-gradient(120deg,#eaf4ff_0%,#cbe5ff_40%,#b0d0ff_70%,#9fc5f8_100%)] font-['Lexend'] overflow-x-hidden">

      {/* HEADER */}
      <header className="w-full px-6 lg:px-16 py-6 flex justify-between items-center z-50">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-[#139dc7] font-bold hover:gap-3 transition-all active:scale-95">
          <FaArrowLeft /> <span className="text-sm sm:text-base">{lang.back}</span>
        </button>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 pb-16">

        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-5xl font-black text-[#139dc7] tracking-tight italic">{lang.title}</h1>
          <p className="text-[10px] font-black text-[#139dc7]/40 uppercase tracking-[0.3em] mt-1">{lang.desc}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">

          {/* ── LEFT: Personal Info ── */}
          <section className="lg:col-span-7 bg-white/70 backdrop-blur-xl rounded-4xl border border-white shadow-sm p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#139dc7]/10 rounded-2xl flex items-center justify-center text-[#139dc7] shrink-0">
                <FaUserShield size={18} />
              </div>
              <h2 className="text-lg font-black text-[#0a4d61]">{lang.personal}</h2>
            </div>

            {/* Name — full width hero row */}
            <div className="bg-[#139dc7] rounded-2xl p-5 mb-3">
              <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1">
                {language === "English" ? "Full Name" : "Buong Pangalan"}
              </p>
              <p className="text-xl sm:text-2xl font-black text-white leading-tight">{fullName || "—"}</p>
            </div>

            {/* Birthdate | Age | Sex — one card, 3 columns with dividers */}
            <div className="bg-white/60 border border-white rounded-2xl hover:bg-white transition-colors mb-3">
              <div className="grid grid-cols-3 divide-x divide-[#139dc7]/10">
                <div className="p-4">
                  <p className="text-[8px] font-black text-[#139dc7] uppercase tracking-widest opacity-50 mb-1.5">
                    {language === "English" ? "Birthdate" : "Kapanganakan"}
                  </p>
                  <p className="text-sm font-black text-[#0a4d61] leading-none">
                    {profile?.birthday ? new Date(profile.birthday).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-[8px] font-black text-[#139dc7] uppercase tracking-widest opacity-50 mb-1.5">
                    {language === "English" ? "Age" : "Edad"}
                  </p>
                  <p className="text-sm font-black text-[#0a4d61] leading-none">
                    {profile ? calculateAge(profile.birthday) : "—"}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-[8px] font-black text-[#139dc7] uppercase tracking-widest opacity-50 mb-1.5">
                    {language === "English" ? "Sex" : "Kasarian"}
                  </p>
                  <p className="text-sm font-black text-[#0a4d61] leading-none">
                    {profile?.sex || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Patient ID — full width */}
            <div className="bg-white/60 border border-white rounded-2xl p-4 hover:bg-white transition-colors">
              <p className="text-[8px] font-black text-[#139dc7] uppercase tracking-widest opacity-50 mb-1.5">Patient ID</p>
              <p className="text-sm font-black text-[#0a4d61] font-mono">{profile?.username || "—"}</p>
            </div>

            {/* Lock notice */}
            <div className="mt-4 flex items-center gap-2.5 text-[9px] font-bold italic text-[#139dc7]/50 bg-[#139dc7]/5 p-3.5 rounded-2xl border border-[#139dc7]/10">
              <span className="w-1.5 h-1.5 bg-[#139dc7] rounded-full animate-pulse shrink-0" />
              {language === "English" ? "Identity data is locked for security." : "Naka-lock ang pagkakakilanlan para sa seguridad."}
            </div>
          </section>

          {/* ── RIGHT: Preferences + Save ── */}
          <div className="lg:col-span-5 flex flex-col gap-4">

            {/* Preferences card */}
            <section className="bg-white/70 backdrop-blur-xl rounded-4xl border border-white shadow-sm p-6 lg:p-7">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#139dc7]/10 rounded-2xl flex items-center justify-center text-[#139dc7] shrink-0">
                  <FaShieldAlt size={18} />
                </div>
                <h2 className="text-lg font-black text-[#0a4d61]">
                  {language === "English" ? "Preferences" : "Kagustuhan"}
                </h2>
              </div>

              <div className="space-y-5">

                {/* Large Text toggle */}
                <div className="flex items-center justify-between p-4 bg-white/50 rounded-2xl border border-white/70">
                  <div>
                    <p className="text-xs font-black text-[#0a4d61] uppercase tracking-wide">
                      {language === "English" ? "Large Display" : "Malaking Display"}
                    </p>
                    <p className="text-[8px] text-[#139dc7]/50 font-medium mt-0.5">
                      {language === "English" ? "Bigger text & buttons" : "Mas malaking teksto"}
                    </p>
                  </div>
                  <button
                    onClick={() => setLargeText(!largeText)}
                    className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${largeText ? "bg-[#139dc7]" : "bg-gray-200"}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${largeText ? "left-7" : "left-1"}`} />
                  </button>
                </div>

                {/* Units */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-[#139dc7]/50 uppercase tracking-widest ml-1">
                    {language === "English" ? "Measurement Units" : "Yunit ng Sukat"}
                  </p>
                  <div className="flex gap-2">
                    {[
                      { key: "metric",   label: "kg, cm, °C" },
                      { key: "imperial", label: "lb, in, °F" },
                    ].map(u => (
                      <button key={u.key} onClick={() => setUnits(u.key as "metric" | "imperial")}
                        className={`flex-1 h-11 rounded-xl font-black text-[10px] uppercase border-2 transition-all
                          ${units === u.key ? "bg-[#139dc7] border-[#139dc7] text-white shadow-md" : "bg-white/50 border-white text-[#139dc7] hover:bg-white"}`}>
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-[#139dc7]/50 uppercase tracking-widest ml-1">
                    {language === "English" ? "Language" : "Wika"}
                  </p>
                  <div className="flex gap-2">
                    {["English", "Tagalog"].map(l => (
                      <button key={l} onClick={() => setPendingLanguage(l as "English" | "Tagalog")}
                        className={`flex-1 h-11 rounded-xl font-black text-[10px] uppercase border-2 transition-all
                          ${pendingLanguage === l ? "bg-[#139dc7] border-[#139dc7] text-white shadow-md" : "bg-white/50 border-white text-[#139dc7] hover:bg-white"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Change password link */}
                <button onClick={() => setShowPassModal(true)}
                  className="group w-full flex items-center justify-center gap-2 text-[#139dc7] font-black uppercase text-[9px] tracking-widest py-3 rounded-2xl border border-[#139dc7]/15 hover:bg-[#139dc7]/5 transition-all active:scale-95">
                  <div className="w-5 h-5 rounded-full bg-[#139dc7]/10 flex items-center justify-center group-hover:bg-[#139dc7] group-hover:text-white transition-all">
                    <FaLock size={8} />
                  </div>
                  {language === "English" ? "Update Security Password" : "I-update ang Password"}
                </button>
              </div>
            </section>

            {/* Save button */}
            <button onClick={handleSave} disabled={saveStatus || saving}
              className={`w-full h-14 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-xl transition-all flex items-center justify-center gap-3
                ${saveStatus ? "bg-green-500 text-white" : "bg-[#139dc7] text-white hover:bg-[#0a4d61] hover:-translate-y-0.5 active:scale-95 shadow-[#139dc7]/30"}`}>
              {saving ? <FaSpinner className="animate-spin" size={16} />
                : saveStatus ? <><FaCheckCircle size={15} /> {language === "English" ? "Changes Applied" : "Nailapat na"}</>
                : lang.sync}
            </button>
          </div>
        </div>
      </main>

      {/* PASSWORD MODAL */}
      {showPassModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-[#001b2e]/50 backdrop-blur-xl">
          <div className="bg-white w-full max-w-md rounded-4xl shadow-2xl border border-[#d0e8f0] p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black text-[#0a4d61] mb-1">{lang.passTitle}</h2>
            <p className="text-[#139dc7]/50 text-sm mb-7 font-medium">{lang.passDesc}</p>

            <div className="space-y-4">
              {[
                { label: lang.currPass, key: "old" as const, show: showOldPass, toggle: () => setShowOldPass(p => !p) },
                { label: lang.newPass,  key: "new" as const, show: showNewPass, toggle: () => setShowNewPass(p => !p) },
                { label: lang.confPass, key: "confirm" as const, show: showConfirmPass, toggle: () => setShowConfirmPass(p => !p) },
              ].map(f => (
                <div key={f.key} className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-[#139dc7]/40 ml-1">{f.label}</label>
                  <div className="relative">
                    <input type={f.show ? "text" : "password"}
                      className="w-full h-12 bg-slate-50 border border-[#139dc7]/10 rounded-2xl px-4 pr-12 text-[#0a4d61] font-bold outline-none focus:border-[#139dc7] focus:bg-white transition-all text-sm"
                      value={passData[f.key]}
                      onChange={e => setPassData({ ...passData, [f.key]: e.target.value })}
                    />
                    <button type="button" onClick={f.toggle}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#139dc7]/30 hover:text-[#139dc7] transition-colors">
                      {f.show ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </button>
                  </div>
                </div>
              ))}

              {passError && (
                <div className="bg-red-50 text-red-500 text-[10px] font-bold p-3 rounded-xl border border-red-100 flex items-center gap-2">
                  <FaExclamationTriangle size={11} /> {passError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowPassModal(false); setPassError(""); setPassData({ old: "", new: "", confirm: "" }); setShowOldPass(false); setShowNewPass(false); setShowConfirmPass(false); }}
                  className="flex-1 h-12 rounded-2xl font-bold text-sm text-[#139dc7] border border-[#139dc7]/20 hover:bg-slate-50 transition-all">
                  {lang.cancel}
                </button>
                <button onClick={handleChangePassword} disabled={passLoading}
                  className="flex-1 h-12 rounded-2xl font-bold text-sm bg-[#139dc7] text-white hover:bg-[#0a4d61] shadow-lg shadow-[#139dc7]/20 transition-all flex items-center justify-center">
                  {passLoading ? <FaSpinner className="animate-spin" /> : lang.update}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FAQ SECTION ── */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 pb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 bg-[#139dc7]/10 rounded-2xl flex items-center justify-center text-[#139dc7] shrink-0">
            <FaQuestionCircle size={16} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#0a4d61]">
              {language === "English" ? "Frequently Asked Questions" : "Mga Madalas na Tanong"}
            </h2>
            <p className="text-[9px] font-black text-[#139dc7]/40 uppercase tracking-widest">
              {language === "English" ? "Everything you need to know" : "Lahat ng kailangan mong malaman"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {([
            {
              icon: <FaHeartbeat className="text-[#139dc7]" size={14} />,
              q: language === "English" ? "What do my vital signs mean?" : "Ano ang ibig sabihin ng aking mga vital signs?",
              a: language === "English"
                ? "Your vitals give a snapshot of your body's key functions:\n\n• SpO2 (Oxygen Saturation) — measures how much oxygen your blood is carrying. Normal is 97–100%. Below 95% needs attention.\n• Temperature — normal body temp is 36.1–37.2°C. Above 37.2°C may indicate fever.\n• Blood Pressure — shown as systolic/diastolic (e.g. 120/80 mmHg). Normal is below 120/80. Stage 1 hypertension starts at 130/80.\n• BMI — Body Mass Index uses your height and weight. For Asians, 23–24.9 is already considered at-risk.\n• Heart Rate — normal resting rate is 60–100 bpm. Below 60 is bradycardia; above 100 is tachycardia."
                : "Ang iyong mga vital signs ay nagbibigay ng snapshot ng mga pangunahing function ng iyong katawan:\n\n• SpO2 — sinusukat kung gaano karaming oxygen ang dala ng iyong dugo. Normal: 97–100%. Mas mababa sa 95% ay nangangailangan ng atensyon.\n• Temperatura — normal na temperatura ng katawan ay 36.1–37.2°C. Higit sa 37.2°C ay maaaring lagnat.\n• Presyon ng Dugo — ipinapakita bilang systolic/diastolic (hal. 120/80 mmHg). Normal ay mas mababa sa 120/80.\n• BMI — gumagamit ng iyong taas at timbang. Para sa mga Asyano, ang 23–24.9 ay itinuturing nang at-risk.\n• Heart Rate — normal na resting rate ay 60–100 bpm."
            },
            {
              icon: <FaBrain className="text-[#139dc7]" size={14} />,
              q: language === "English" ? "What is the AI Health Analysis and where are the thresholds from?" : "Ano ang AI Health Analysis at saan nagmula ang mga threshold?",
              a: language === "English"
                ? "The AI Health Analysis is a rule-based clinical decision system — not a machine learning model. It evaluates your vitals against established medical thresholds and flags conditions that may need attention.\n\nSources used:\n• ACC/AHA 2017 Hypertension Guidelines (Blood Pressure)\n• WHO & Asian-Pacific BMI Standards (BMI thresholds adjusted for Filipino/Asian populations)\n• Standard clinical SpO2 ranges (American Thoracic Society)\n• SIRS Criteria for sepsis screening\n• Standard bradycardia/tachycardia definitions (AHA)\n\nImportant: This is for informational purposes only. It is not a diagnosis. Always consult a licensed healthcare professional."
                : "Ang AI Health Analysis ay isang rule-based clinical decision system — hindi isang machine learning model. Sinusuri nito ang iyong mga vital signs laban sa mga napatunayang medikal na threshold.\n\nMga pinagmulan:\n• ACC/AHA 2017 Hypertension Guidelines\n• WHO & Asian-Pacific BMI Standards (naka-adjust para sa mga Pilipino/Asyano)\n• Standard clinical SpO2 ranges (American Thoracic Society)\n• SIRS Criteria para sa sepsis screening\n• Standard bradycardia/tachycardia definitions (AHA)\n\nMahalaga: Para sa impormasyon lamang. Hindi ito diagnosis. Kumonsulta sa lisensyadong doktor."
            },
            {
              icon: <FaUserMd className="text-[#139dc7]" size={14} />,
              q: language === "English" ? "How do I read my results?" : "Paano ko mababasa ang aking mga resulta?",
              a: language === "English"
                ? "Your Results page shows your latest checkup data in two parts:\n\n1. Vital Signs Cards — each card shows the measured value, unit, and a status badge (Normal, Low, High, Fever, etc.) color-coded green (normal), orange (warning), or red (danger).\n\n2. AI Health Analysis — expandable condition cards below the vitals. Each card shows:\n   • The condition name\n   • Risk level (Low / Moderate / High)\n   • Which vitals triggered it\n   • A detailed explanation\n\nThe History page lets you browse all past checkups and view the same analysis for any record. You can also export a PDF report of any checkup."
                : "Ang iyong Results page ay nagpapakita ng iyong pinakabagong checkup data sa dalawang bahagi:\n\n1. Vital Signs Cards — bawat card ay nagpapakita ng measured value, unit, at status badge na may kulay (Normal, Mababa, Mataas, atbp.).\n\n2. AI Health Analysis — mga expandable condition cards sa ilalim ng vitals. Bawat card ay nagpapakita ng:\n   • Pangalan ng kondisyon\n   • Antas ng panganib (Low / Moderate / High)\n   • Kung aling vitals ang nag-trigger\n   • Detalyadong paliwanag\n\nAng History page ay nagbibigay-daan sa iyo na tingnan ang lahat ng nakaraang checkup at i-export ang PDF report."
            },
            {
              icon: <FaDatabase className="text-[#139dc7]" size={14} />,
              q: language === "English" ? "How is my data stored and kept private?" : "Paano nakaimbak at napoprotektahan ang aking data?",
              a: language === "English"
                ? "Your health data is stored securely using Supabase, a PostgreSQL-based cloud database with enterprise-grade security.\n\n• Authentication — your account uses encrypted password storage (bcrypt hashing). Passwords are never stored in plain text.\n• Data isolation — your checkup records are linked to your unique user ID and can only be accessed by you when logged in.\n• Encryption — all data is transmitted over HTTPS (TLS 1.3) and stored encrypted at rest.\n• No third-party sharing — your health data is never sold or shared with advertisers or third parties.\n\nOnly you and authorized HealthSense administrators can access your records."
                : "Ang iyong health data ay ligtas na nakaimbak gamit ang Supabase, isang PostgreSQL-based cloud database.\n\n• Authentication — gumagamit ng encrypted password storage (bcrypt hashing). Hindi kailanman nakaimbak ang mga password sa plain text.\n• Data isolation — ang iyong mga checkup record ay naka-link sa iyong natatanging user ID.\n• Encryption — lahat ng data ay ipinapadala sa pamamagitan ng HTTPS at nakaimbak nang naka-encrypt.\n• Walang third-party sharing — hindi ibinebenta o ibinabahagi ang iyong health data."
            },
            {
              icon: <FaShieldVirus className="text-[#139dc7]" size={14} />,
              q: language === "English" ? "When should I see a doctor based on my results?" : "Kailan ako dapat pumunta sa doktor batay sa aking mga resulta?",
              a: language === "English"
                ? "Seek immediate emergency care if any of these appear:\n• SpO2 below 90%\n• Temperature above 40°C (Hyperpyrexia)\n• Blood pressure at or above 180/120 mmHg (Hypertensive Crisis)\n• Heart rate below 40 bpm or above 150 bpm\n• Any HIGH RISK condition flagged by the AI Analysis\n\nSchedule a doctor visit soon if:\n• Any MODERATE risk condition is flagged\n• SpO2 is 90–94%\n• Blood pressure is Stage 1 or Stage 2 Hypertension\n• BMI is below 16 or above 30\n\nMonitor and follow up if:\n• Only LOW RISK conditions are flagged\n• Vitals are slightly outside normal but not critical\n\nRemember: This system is a screening tool, not a diagnosis. Even normal results don't replace regular medical checkups."
                : "Humingi ng agarang emergency care kung may alinman sa mga ito:\n• SpO2 na mas mababa sa 90%\n• Temperatura na higit sa 40°C (Hyperpyrexia)\n• Presyon ng dugo na 180/120 mmHg o mas mataas (Hypertensive Crisis)\n• Heart rate na mas mababa sa 40 bpm o higit sa 150 bpm\n• Anumang HIGH RISK condition na na-flag ng AI Analysis\n\nMag-schedule ng doktor visit sa lalong madaling panahon kung:\n• May MODERATE risk condition na na-flag\n• Ang SpO2 ay 90–94%\n• Ang presyon ng dugo ay Stage 1 o Stage 2 Hypertension\n\nBantayan at mag-follow up kung:\n• LOW RISK conditions lamang ang na-flag\n\nAlalahanin: Ang system na ito ay isang screening tool, hindi diagnosis. Kahit normal ang mga resulta, huwag papalitan ang regular na medikal na checkup."
            },
          ] as { icon: React.ReactNode; q: string; a: string }[]).map((faq, i) => {
            const isOpen = expandedFaq === i;
            return (
              <div key={i} className={`bg-white/70 backdrop-blur-xl border rounded-3xl overflow-hidden transition-all duration-200 ${isOpen ? "border-[#139dc7]/30 shadow-md shadow-[#139dc7]/10" : "border-white"}`}>
                <button
                  onClick={() => setExpandedFaq(isOpen ? null : i)}
                  className="w-full flex items-center gap-4 p-5 text-left"
                >
                  <div className="w-8 h-8 bg-[#139dc7]/10 rounded-xl flex items-center justify-center shrink-0">
                    {faq.icon}
                  </div>
                  <p className="flex-1 font-black text-[#0a4d61] text-sm leading-snug">{faq.q}</p>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${isOpen ? "bg-[#139dc7] rotate-180" : "bg-[#139dc7]/10"}`}>
                    <FaChevronDown size={10} className={isOpen ? "text-white" : "text-[#139dc7]"} />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-0">
                    <div className="h-px bg-[#139dc7]/10 mb-4" />
                    <div className="pl-12">
                      {faq.a.split("\n\n").map((para, pi) => (
                        <div key={pi} className="mb-3 last:mb-0">
                          {para.split("\n").map((line, li) => (
                            <p key={li} className={`text-sm text-[#0a4d61]/75 leading-relaxed font-medium ${line.startsWith("•") ? "ml-3 mt-0.5" : li === 0 && pi > 0 ? "font-black text-[#0a4d61] mb-1" : ""}`}>
                              {line}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <footer className="w-full py-8 text-center">
        <span className="text-[9px] font-black uppercase tracking-[0.5em] text-[#139dc7]/30">
          HealthSense Infrastructure v2.0
        </span>
      </footer>
    </div>
  );
};

export default Profile;