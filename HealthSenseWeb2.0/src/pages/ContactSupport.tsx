import { useState } from "react";
import { FaEnvelope, FaCheckCircle } from "react-icons/fa";
import StaticPageLayout from "../components/StaticPageLayout";

export default function ContactSupport() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Replace this with your actual form submission logic (e.g. EmailJS, Supabase function, etc.)
    await new Promise((r) => setTimeout(r, 1200)); // Simulated delay
    setSubmitted(true);
    setLoading(false);
  };

  const inputClass =
    "w-full h-11 bg-white/55 border border-white/80 rounded-2xl px-4 text-[#0a4d61] placeholder:text-[#8ab8c8] focus:bg-white focus:shadow-md transition-all text-sm outline-none font-['Lexend']";

  return (
    <StaticPageLayout
      title="Contact Support"
      subtitle="We're here to help"
      lastUpdated="January 1, 2026"
    >
      {/* Contact cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white/50 border border-white/80 rounded-2xl p-5 flex items-start gap-3">
          <div className="w-9 h-9 bg-[#139dc7]/10 rounded-xl flex items-center justify-center text-[#139dc7] shrink-0">
            <FaEnvelope size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#0a4d61] uppercase tracking-wider mb-1">Email</p>
            <a href="mailto:support@healthsense.ph" className="text-sm text-[#139dc7] hover:underline font-medium">
              support@healthsense.ph
            </a>
            <p className="text-xs text-[#1e7a96] mt-0.5">Response within 1 business day</p>
          </div>
        </div>
        <div className="bg-white/50 border border-white/80 rounded-2xl p-5 flex items-start gap-3">
          <div className="w-9 h-9 bg-[#139dc7]/10 rounded-xl flex items-center justify-center text-[#139dc7] shrink-0 text-base font-bold">
            ?
          </div>
          <div>
            <p className="text-xs font-bold text-[#0a4d61] uppercase tracking-wider mb-1">Help Center</p>
            <a href="/help" className="text-sm text-[#139dc7] hover:underline font-medium">
              Browse FAQs
            </a>
            <p className="text-xs text-[#1e7a96] mt-0.5">Common questions answered instantly</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#139dc7]/10" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#1e7a96]">Or send a message</span>
        <div className="flex-1 h-px bg-[#139dc7]/10" />
      </div>

      {/* Form */}
      {submitted ? (
        <div className="bg-white/60 border border-white/80 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
          <FaCheckCircle size={32} className="text-[#34A0A4]" />
          <h3 className="text-base font-bold text-[#0a4d61]">Message sent!</h3>
          <p className="text-sm text-[#1e7a96] font-normal">
            We'll get back to you at <span className="font-medium text-[#139dc7]">{form.email}</span> within 1 business day.
          </p>
          <button
            onClick={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
            className="mt-2 text-xs font-bold text-[#1e7a96] hover:text-[#139dc7] uppercase tracking-wider transition-colors"
          >
            Send another message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#139dc7] uppercase tracking-widest ml-1">Full Name</label>
              <input
                name="name" type="text" required placeholder="Juan dela Cruz"
                value={form.name} onChange={handleChange} className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#139dc7] uppercase tracking-widest ml-1">Email Address</label>
              <input
                name="email" type="email" required placeholder="juan@email.com"
                value={form.email} onChange={handleChange} className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[#139dc7] uppercase tracking-widest ml-1">Subject</label>
            <select
              name="subject" required value={form.subject} onChange={handleChange}
              className={inputClass + " cursor-pointer"}
            >
              <option value="" disabled>Select a topic...</option>
              <option value="account">Account access / login issue</option>
              <option value="data">My health data or readings</option>
              <option value="kiosk">Kiosk issue or error</option>
              <option value="privacy">Privacy or data request</option>
              <option value="technical">Technical / portal problem</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[#139dc7] uppercase tracking-widest ml-1">Message</label>
            <textarea
              name="message" required rows={5} placeholder="Describe your issue in as much detail as possible..."
              value={form.message} onChange={handleChange}
              className="w-full bg-white/55 border border-white/80 rounded-2xl px-4 py-3 text-[#0a4d61] placeholder:text-[#8ab8c8] focus:bg-white focus:shadow-md transition-all text-sm outline-none resize-none font-['Lexend']"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className={`w-full h-12 rounded-2xl text-white font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center mt-1
              ${loading ? "bg-[#0a4d61] opacity-80 cursor-not-allowed" : "bg-[#139dc7] hover:bg-[#0a4d61] hover:-translate-y-0.5 active:scale-95 shadow-md shadow-blue-300/30"}`}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </div>
            ) : "Send Message"}
          </button>
        </form>
      )}
    </StaticPageLayout>
  );
}
