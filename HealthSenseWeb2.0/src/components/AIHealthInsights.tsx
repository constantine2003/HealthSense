// src/components/AIHealthInsights.tsx
// On-demand AI health brief powered by OpenAI gpt-4o-mini.
// Insights are stored in the `aiHealthInsights` Supabase table.
// Users have a 3-hour cooldown between generations.

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

const COOLDOWN_MS = 3 * 60 * 60 * 1000; // 3 hours

// ─── Types ────────────────────────────────────────────────────────────────────

interface InsightData {
  summary: string;
  positives: string[];
  concerns: string[];
  recommendations: string[];
}

interface SavedInsight {
  id: string;
  generated_at: string;
  language: string;
  insight_json: string;
}

interface Props {
  language: "English" | "Tagalog";
}

// ─── i18n strings ─────────────────────────────────────────────────────────────

const CONTENT = {
  English: {
    badge:           "Powered by AI",
    title:           "AI Health Insights",
    generateBtn:     "Generate AI Health Insights",
    regenerateBtn:   "Regenerate Insights",
    cooldownPrefix:  "Next available in",
    loadingText:     "Analyzing your health data…",
    generatedOn:     "Generated",
    summaryTitle:    "Health Summary",
    positivesTitle:  "Positive Findings",
    concernsTitle:   "Areas of Concern",
    recsTitle:       "Recommendations",
    noDataMsg:       "Complete at least one checkup at the health kiosk to generate AI insights.",
    errorPrefix:     "Error: ",
    disclaimer:
      "AI-generated insights are based on the vitals and data collected from you through the kiosk. " +
      "Errors or inaccuracies in your recorded data may directly affect the quality and accuracy of the generated insight. " +
      "These insights are for informational purposes only and may contain inaccuracies. " +
      "They are not a substitute for professional medical advice, diagnosis, or treatment. " +
      "Always consult a qualified healthcare provider with any questions about your health.",
  },
  Tagalog: {
    badge:           "Pinapagana ng AI",
    title:           "AI Kalusugan Insights",
    generateBtn:     "Bumuo ng AI Kalusugan Insights",
    regenerateBtn:   "Bumuo Muli ng Insights",
    cooldownPrefix:  "Susunod na available sa",
    loadingText:     "Sinusuri ang iyong health data…",
    generatedOn:     "Nabuo",
    summaryTitle:    "Kabuuang Kalusugan",
    positivesTitle:  "Mga Positibong Natuklasan",
    concernsTitle:   "Mga Lugar ng Pag-aalala",
    recsTitle:       "Mga Rekomendasyon",
    noDataMsg:       "Kumpletuhin ang hindi bababa sa isang checkup sa health kiosk para bumuo ng AI insights.",
    errorPrefix:     "Error: ",
    disclaimer:
      "Ang mga AI-generated insights ay batay sa mga bital at datos na nakolekta mula sa iyo sa pamamagitan ng kiosk. " +
      "Ang mga pagkakamali o hindi tumpak na datos ay maaaring direktang makaapekto sa kalidad at katumpakan ng nabuong insight. " +
      "Ang mga insights na ito ay para sa impormasyon lamang at maaaring maglaman ng mga pagkakamali. " +
      "Hindi ito kapalit ng propesyonal na medikal na payo, diagnosis, o paggamot. " +
      "Palaging kumonsulta sa isang kwalipikadong healthcare provider para sa iyong mga katanungan sa kalusugan.",
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCooldown(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0)           return `${h}h`;
  return `${m}m`;
}

function formatDate(iso: string, lang: "English" | "Tagalog"): string {
  return new Date(iso).toLocaleString(lang === "Tagalog" ? "fil-PH" : "en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

const AIHealthInsights: React.FC<Props> = ({ language }) => {
  const c = CONTENT[language];

  const [savedInsight,   setSavedInsight]   = useState<SavedInsight | null>(null);
  const [insight,        setInsight]        = useState<InsightData | null>(null);
  const [isGenerating,   setIsGenerating]   = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [cooldownMs,     setCooldownMs]     = useState(0);
  const [hasCheckups,    setHasCheckups]    = useState(true);

  // Fetch the most recent saved insight on mount
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { count } = await supabase
          .from("health_checkups")
          .select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id);
        setHasCheckups((count ?? 0) > 0);

        const { data } = await supabase
          .from("aiHealthInsights")
          .select("id, generated_at, language, insight_json")
          .eq("user_id", session.user.id)
          .order("generated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          setSavedInsight(data);
          try { setInsight(JSON.parse(data.insight_json)); } catch { /* malformed */ }
        }
      } catch (e) {
        console.error("AIHealthInsights: fetch error", e);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  // Live countdown — recalculates every 30 s
  useEffect(() => {
    if (!savedInsight) { setCooldownMs(0); return; }
    const update = () => {
      const elapsed = Date.now() - new Date(savedInsight.generated_at).getTime();
      setCooldownMs(Math.max(0, COOLDOWN_MS - elapsed));
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [savedInsight]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("birthday, sex")
        .eq("id", session.user.id)
        .single();

      const age = profile?.birthday
        ? Math.floor(
            (Date.now() - new Date(profile.birthday).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
          )
        : "Unknown";

      const { data: checkups } = await supabase
        .from("health_checkups")
        .select("spo2, temperature, bmi, heart_rate, blood_pressure, height, weight, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!checkups || checkups.length === 0) {
        setHasCheckups(false);
        return;
      }

      const formattedCheckups = checkups.map((row: Record<string, unknown>) => ({
        date: new Date(row.created_at as string).toLocaleDateString("en-PH", {
          year: "numeric", month: "short", day: "numeric",
        }),
        spo2:           row.spo2          != null ? Number(row.spo2)        : null,
        temp:           row.temperature   != null ? Number(row.temperature) : null,
        bmi:            row.bmi           != null ? Number(row.bmi)         : null,
        heart_rate:     row.heart_rate    != null ? Number(row.heart_rate)  : null,
        blood_pressure: (row.blood_pressure as string) || null,
        height:         row.height        != null ? Number(row.height)      : null,
        weight:         row.weight        != null ? Number(row.weight)      : null,
      }));

      const response = await fetch("/api/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token:        session.access_token,
          demographics: { age, sex: profile?.sex ?? "Unknown" },
          checkups:     formattedCheckups,
          language,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error((body as { error?: string }).error ?? "Failed to generate insights");
      }

      const insightData: InsightData = await response.json();

      const { data: saved, error: saveErr } = await supabase
        .from("aiHealthInsights")
        .insert({
          user_id:      session.user.id,
          language,
          insight_json: JSON.stringify(insightData),
        })
        .select()
        .single();

      if (saveErr) throw new Error("Failed to save insight: " + saveErr.message);

      setSavedInsight(saved);
      setInsight(insightData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate insights";
      console.error("AIHealthInsights generate error:", err);
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [language]);

  const inCooldown   = cooldownMs > 0;
  const btnDisabled  = inCooldown || initialLoading || isGenerating || !hasCheckups;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mt-8 space-y-4">

      {/* ── Section header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#139dc7] to-[#0a4d61] flex items-center justify-center shadow-lg shadow-[#139dc7]/30 shrink-0">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
          </svg>
        </div>
        <div>
          <div className="text-[9px] font-black text-[#139dc7]/40 uppercase tracking-[0.3em] leading-none mb-1">{c.badge}</div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0a4d61] tracking-tight leading-none">{c.title}</h2>
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <div className="flex gap-3 p-4 bg-amber-50/80 border border-amber-200/70 rounded-2xl">
        <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
        </svg>
        <p className="text-sm text-amber-800 font-medium leading-relaxed">{c.disclaimer}</p>
      </div>

      {/* ── Generate button ── */}
      <button
        onClick={handleGenerate}
        disabled={btnDisabled}
        className={`w-full flex items-center justify-center gap-3 py-5 px-6 rounded-3xl font-black text-base uppercase tracking-widest transition-all duration-200 ${
          btnDisabled
            ? "bg-[#139dc7]/15 text-[#139dc7]/40 cursor-not-allowed shadow-none"
            : "bg-gradient-to-r from-[#139dc7] to-[#0a7fa0] text-white shadow-xl shadow-[#139dc7]/35 hover:shadow-[#139dc7]/55 hover:scale-[1.01] active:scale-[0.98]"
        }`}
      >
        {isGenerating ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
            {c.loadingText}
          </>
        ) : (
          <>
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
            </svg>
            {inCooldown
              ? `${c.cooldownPrefix} ${formatCooldown(cooldownMs)}`
              : !hasCheckups
                ? c.noDataMsg
                : insight ? c.regenerateBtn : c.generateBtn}
          </>
        )}
      </button>

      {/* ── Insight text box ── */}
      {(insight || error) && (
        <div className="bg-white/70 backdrop-blur-xl border border-white rounded-3xl overflow-hidden shadow-sm">

          {/* Error state */}
          {error && !insight && (
            <div className="flex gap-3 p-5">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <p className="text-sm text-red-700 font-medium leading-relaxed">{c.errorPrefix}{error}</p>
            </div>
          )}

          {/* Insight content */}
          {insight && (
            <div className="divide-y divide-[#139dc7]/8">

              {/* Timestamp */}
              {savedInsight && (
                <div className="px-5 py-3 bg-[#139dc7]/4">
                  <p className="text-[10px] font-black text-[#139dc7]/50 uppercase tracking-widest">
                    {c.generatedOn}: {formatDate(savedInsight.generated_at, language)}
                  </p>
                </div>
              )}

              {/* Summary */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-[#139dc7]" />
                  <span className="text-[10px] font-black text-[#139dc7] uppercase tracking-widest">{c.summaryTitle}</span>
                </div>
                <p className="text-sm text-[#0a4d61] font-medium leading-relaxed">{insight.summary}</p>
              </div>

              {/* Positives */}
              {insight.positives.length > 0 && (
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{c.positivesTitle}</span>
                  </div>
                  <ul className="space-y-2">
                    {insight.positives.map((item, i) => (
                      <li key={i} className="flex gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-2" />
                        <span className="text-sm text-[#1a5c3a] font-medium leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Concerns */}
              {insight.concerns.length > 0 && (
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">{c.concernsTitle}</span>
                  </div>
                  <ul className="space-y-2">
                    {insight.concerns.map((item, i) => (
                      <li key={i} className="flex gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-2" />
                        <span className="text-sm text-amber-900 font-medium leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {insight.recommendations.length > 0 && (
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-lg bg-[#139dc7] flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2a7 7 0 017 7c0 3.1-2 5.8-4.8 6.7L14 18H10l-.2-2.3C7 14.8 5 12.1 5 9a7 7 0 017-7zm-1 16h2v2h-2v-2z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-black text-[#139dc7] uppercase tracking-widest">{c.recsTitle}</span>
                  </div>
                  <ul className="space-y-2">
                    {insight.recommendations.map((item, i) => (
                      <li key={i} className="flex gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#139dc7] shrink-0 mt-2" />
                        <span className="text-sm text-[#0a4d61] font-medium leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default AIHealthInsights;
