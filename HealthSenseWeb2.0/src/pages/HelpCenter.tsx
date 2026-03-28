import { useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import StaticPageLayout from "../components/StaticPageLayout";

const FAQS = [
  {
    category: "Account & Login",
    items: [
      {
        q: "How do I log in to the Patient Portal?",
        a: "Use the Patient ID assigned to you at the kiosk (usually in firstname.lastname format) and the password you set during registration. Visit the Login page and enter your credentials.",
      },
      {
        q: "I forgot my password. How do I recover my account?",
        a: "On the Login page, click 'Recover Account' and enter the personal email address linked to your account. You'll receive a password reset link within a few minutes. Check your spam folder if it doesn't arrive.",
      },
      {
        q: "Why is my Patient ID not working?",
        a: "Make sure you're entering your ID in lowercase (e.g. juan.delacruz). If you're still unable to log in, contact support and provide the name on your kiosk registration.",
      },
      {
        q: "Can I change my password?",
        a: "Yes. Once logged in, go to your Profile page and look for the security settings section to update your password.",
      },
    ],
  },
  {
    category: "Health Data & Readings",
    items: [
      {
        q: "Where can I see my past health readings?",
        a: "Log in to the Patient Portal and go to the History page. You'll find a full timeline of your kiosk visits with all recorded vitals.",
      },
      {
        q: "Are my kiosk readings medically accurate?",
        a: "HealthSense kiosks are calibrated for general wellness monitoring. Readings may vary due to body position, movement, or environmental conditions. They are not a replacement for clinical assessment by a doctor.",
      },
      {
        q: "How do I share my results with my doctor?",
        a: "From the Dashboard or History page, use the 'Download PDF' option to export your health report. You can then print it or email it to your healthcare provider.",
      },
      {
        q: "How long is my health data kept?",
        a: "We retain your data for up to 5 years from your last kiosk visit. You can request early deletion by contacting support.",
      },
    ],
  },
  {
    category: "Privacy & Security",
    items: [
      {
        q: "Who can see my health data?",
        a: "Only you can view your data through your authenticated account. HealthSense staff cannot access individual patient records without explicit written consent.",
      },
      {
        q: "How do I request deletion of my data?",
        a: "Email privacy@healthsense.ph with your Patient ID and full name. We will process your request within 30 days and confirm once complete.",
      },
      {
        q: "Is my data encrypted?",
        a: "Yes. All data is encrypted in transit using TLS and at rest using AES-256 encryption. Your health records are stored securely and cannot be read by unauthorised parties.",
      },
    ],
  },
  {
    category: "Technical Issues",
    items: [
      {
        q: "The portal isn't loading properly. What should I do?",
        a: "Try refreshing the page or clearing your browser cache. The portal works best on modern browsers (Chrome, Firefox, Edge, Safari). If the issue persists, contact support.",
      },
      {
        q: "I can't download the Android app. What should I check?",
        a: "Make sure your device allows installation from unknown sources (Settings > Security > Install unknown apps). The APK is only compatible with Android 8.0 and above.",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#139dc7]/10 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 group"
      >
        <span className="text-sm font-bold text-[#0a4d61] group-hover:text-[#139dc7] transition-colors leading-snug">
          {q}
        </span>
        <FaChevronDown
          size={12}
          className={`text-[#139dc7] shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="text-sm text-[#1e7a96] font-normal leading-relaxed pb-4 -mt-1">
          {a}
        </p>
      )}
    </div>
  );
}

export default function HelpCenter() {
  const [search, setSearch] = useState("");

  const filtered = FAQS.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <StaticPageLayout
      title="Help Center"
      subtitle="Frequently asked questions"
      lastUpdated="January 1, 2026"
    >
      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search questions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-12 bg-white/55 border border-white/80 rounded-2xl px-5 text-[#0a4d61] placeholder:text-[#8ab8c8] focus:bg-white focus:shadow-md transition-all text-sm outline-none font-['Lexend']"
        />
      </div>

      {/* FAQ categories */}
      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-[#1e7a96] font-normal">
            No results for <span className="font-medium text-[#139dc7]">"{search}"</span>.{" "}
            <a href="/support" className="text-[#139dc7] hover:underline font-medium">
              Contact support
            </a>{" "}
            for personalised help.
          </p>
        </div>
      ) : (
        filtered.map((cat) => (
          <div key={cat.category}>
            <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-[#139dc7] mb-2">
              {cat.category}
            </h2>
            <div className="bg-white/50 border border-white/80 rounded-2xl px-5 divide-y divide-[#139dc7]/10">
              {cat.items.map((item) => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))
      )}

      {/* Still stuck CTA */}
      <div className="bg-[#0a4d61] rounded-2xl p-7 text-center">
        <p className="text-white font-bold text-base mb-1">Still need help?</p>
        <p className="text-white/70 text-sm font-normal mb-5">
          Our support team usually replies within one business day.
        </p>
        <a
          href="/support"
          className="inline-block px-8 py-3 bg-white text-[#139dc7] font-bold text-sm uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-md active:scale-95"
        >
          Contact Support
        </a>
      </div>
    </StaticPageLayout>
  );
}
