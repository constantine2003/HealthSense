import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../utils/supabaseClient";

const COOLDOWN_MS = 3 * 60 * 60 * 1000; // 3 hours

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
  apiUrl?: string;
}

const CONTENT = {
  English: {
    badge: "Powered by AI",
    title: "AI Health Insights",
    generateBtn: "Generate AI Health Insights",
    regenerateBtn: "Regenerate Insights",
    cooldownPrefix: "Next available in",
    loadingText: "Analyzing your health data...",
    generatedOn: "Generated",
    summaryTitle: "Health Summary",
    positivesTitle: "Positive Findings",
    concernsTitle: "Areas of Concern",
    recsTitle: "Recommendations",
    noDataMsg: "Complete at least one checkup at the health kiosk to generate AI insights.",
    errorPrefix: "Error: ",
    disclaimer:
      "AI-generated insights are based on the vitals and data collected from you through the kiosk. " +
      "Errors or inaccuracies in your recorded data may directly affect the quality and accuracy of the generated insight. " +
      "These insights are for informational purposes only and may contain inaccuracies. " +
      "They are not a substitute for professional medical advice, diagnosis, or treatment. " +
      "Always consult a qualified healthcare provider with any questions about your health.",
  },
  Tagalog: {
    badge: "Pinapagana ng AI",
    title: "AI Kalusugan Insights",
    generateBtn: "Bumuo ng AI Kalusugan Insights",
    regenerateBtn: "Bumuo Muli ng Insights",
    cooldownPrefix: "Susunod na available sa",
    loadingText: "Sinusuri ang iyong health data...",
    generatedOn: "Nabuo",
    summaryTitle: "Kabuuang Kalusugan",
    positivesTitle: "Mga Positibong Natuklasan",
    concernsTitle: "Mga Lugar ng Pag-aalala",
    recsTitle: "Mga Rekomendasyon",
    noDataMsg: "Kumpletuhin ang hindi bababa sa isang checkup sa health kiosk para bumuo ng AI insights.",
    errorPrefix: "Error: ",
    disclaimer:
      "Ang mga AI-generated insights ay batay sa mga bital at datos na nakolekta mula sa iyo sa pamamagitan ng kiosk. " +
      "Ang mga pagkakamali o hindi tumpak na datos ay maaaring direktang makaapekto sa kalidad at katumpakan ng nabuong insight. " +
      "Ang mga insights na ito ay para sa impormasyon lamang at maaaring maglaman ng mga pagkakamali. " +
      "Hindi ito kapalit ng propesyonal na medikal na payo, diagnosis, o paggamot. " +
      "Palaging kumonsulta sa isang kwalipikadong healthcare provider para sa iyong mga katanungan sa kalusugan.",
  },
} as const;

function formatCooldown(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatDate(iso: string, lang: "English" | "Tagalog"): string {
  return new Date(iso).toLocaleString(lang === "Tagalog" ? "fil-PH" : "en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const AIHealthInsights: React.FC<Props> = ({ language, apiUrl }) => {
  const c = CONTENT[language];

  const [savedInsight, setSavedInsight] = useState<SavedInsight | null>(null);
  const [insight, setInsight] = useState<InsightData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [hasCheckups, setHasCheckups] = useState(true);

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
          try { setInsight(JSON.parse(data.insight_json)); } catch {}
        }
      } catch (e) {
        console.error("AIHealthInsights: fetch error", e);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!savedInsight) {
      setCooldownMs(0);
      return;
    }
    const update = () => {
      const elapsed = Date.now() - new Date(savedInsight.generated_at).getTime();
      setCooldownMs(Math.max(0, COOLDOWN_MS - elapsed));
    };
    update();
    const id = setInterval(update, 30000);
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
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        spo2: row.spo2 != null ? Number(row.spo2) : null,
        temp: row.temperature != null ? Number(row.temperature) : null,
        bmi: row.bmi != null ? Number(row.bmi) : null,
        heart_rate: row.heart_rate != null ? Number(row.heart_rate) : null,
        blood_pressure: (row.blood_pressure as string) || null,
        height: row.height != null ? Number(row.height) : null,
        weight: row.weight != null ? Number(row.weight) : null,
      }));

      const response = await fetch(apiUrl ?? "/api/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: session.access_token,
          demographics: { age, sex: profile?.sex ?? "Unknown" },
          checkups: formattedCheckups,
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
          user_id: session.user.id,
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
  }, [language, apiUrl]);

  const inCooldown = cooldownMs > 0;
  const btnDisabled = inCooldown || initialLoading || isGenerating || !hasCheckups;

  return (
    <View className="mt-8">
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-2xl bg-[#139dc7] items-center justify-center">
          <Ionicons name="sparkles" size={18} color="white" />
        </View>
        <View>
          <Text className="text-[9px] font-black text-[#139dc7]/40 uppercase tracking-[3px] leading-none mb-1">
            {c.badge}
          </Text>
          <Text className="text-xl font-black text-[#0a4d61] tracking-tight leading-none">
            {c.title}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-3 p-4 bg-amber-50/80 border border-amber-200/70 rounded-2xl mt-4">
        <Ionicons name="warning" size={18} color="#d97706" />
        <Text className="text-xs text-amber-800 font-medium leading-relaxed flex-1">
          {c.disclaimer}
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleGenerate}
        disabled={btnDisabled}
        activeOpacity={0.85}
        className={`mt-4 px-5 py-4 rounded-3xl flex-row items-center justify-center gap-2 ${
          btnDisabled
            ? "bg-[#139dc7]/15"
            : "bg-[#139dc7]"
        }`}
      >
        {isGenerating ? (
          <>
            <ActivityIndicator color={btnDisabled ? "#139dc7" : "white"} />
            <Text className={`text-sm font-black uppercase tracking-widest ${btnDisabled ? "text-[#139dc7]/60" : "text-white"}`}>
              {c.loadingText}
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="sparkles" size={16} color={btnDisabled ? "#139dc7" : "white"} />
            <Text className={`text-xs font-black uppercase tracking-widest ${btnDisabled ? "text-[#139dc7]/60" : "text-white"}`}>
              {inCooldown
                ? `${c.cooldownPrefix} ${formatCooldown(cooldownMs)}`
                : !hasCheckups
                  ? c.noDataMsg
                  : insight ? c.regenerateBtn : c.generateBtn}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {(insight || error) && (
        <View className="bg-white/70 border border-white rounded-3xl overflow-hidden shadow-sm mt-4">
          {error && !insight && (
            <View className="flex-row gap-3 p-5">
              <Ionicons name="alert-circle" size={18} color="#ef4444" />
              <Text className="text-xs text-red-700 font-medium flex-1">
                {c.errorPrefix}{error}
              </Text>
            </View>
          )}

          {insight && (
            <View>
              {savedInsight && (
                <View className="px-5 py-3 bg-[#139dc7]/4">
                  <Text className="text-[10px] font-black text-[#139dc7]/50 uppercase tracking-widest">
                    {c.generatedOn}: {formatDate(savedInsight.generated_at, language)}
                  </Text>
                </View>
              )}

              <View className="p-5">
                <View className="flex-row items-center gap-2 mb-3">
                  <View className="w-1 h-4 rounded-full bg-[#139dc7]" />
                  <Text className="text-[10px] font-black text-[#139dc7] uppercase tracking-widest">
                    {c.summaryTitle}
                  </Text>
                </View>
                <Text className="text-sm text-[#0a4d61] font-medium leading-relaxed">
                  {insight.summary}
                </Text>
              </View>

              {insight.positives.length > 0 && (
                <View className="p-5 border-t border-[#139dc7]/10">
                  <View className="flex-row items-center gap-2 mb-3">
                    <View className="w-5 h-5 rounded-lg bg-emerald-500 items-center justify-center">
                      <Ionicons name="checkmark" size={12} color="white" />
                    </View>
                    <Text className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                      {c.positivesTitle}
                    </Text>
                  </View>
                  {insight.positives.map((item, i) => (
                    <View key={i} className="flex-row gap-2.5 mb-2">
                      <View className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
                      <Text className="text-sm text-[#1a5c3a] font-medium flex-1">
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {insight.concerns.length > 0 && (
                <View className="p-5 border-t border-[#139dc7]/10">
                  <View className="flex-row items-center gap-2 mb-3">
                    <View className="w-5 h-5 rounded-lg bg-amber-500 items-center justify-center">
                      <Ionicons name="warning" size={12} color="white" />
                    </View>
                    <Text className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                      {c.concernsTitle}
                    </Text>
                  </View>
                  {insight.concerns.map((item, i) => (
                    <View key={i} className="flex-row gap-2.5 mb-2">
                      <View className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2" />
                      <Text className="text-sm text-amber-900 font-medium flex-1">
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {insight.recommendations.length > 0 && (
                <View className="p-5 border-t border-[#139dc7]/10">
                  <View className="flex-row items-center gap-2 mb-3">
                    <View className="w-5 h-5 rounded-lg bg-[#139dc7] items-center justify-center">
                      <Ionicons name="bulb" size={12} color="white" />
                    </View>
                    <Text className="text-[10px] font-black text-[#139dc7] uppercase tracking-widest">
                      {c.recsTitle}
                    </Text>
                  </View>
                  {insight.recommendations.map((item, i) => (
                    <View key={i} className="flex-row gap-2.5 mb-2">
                      <View className="w-1.5 h-1.5 rounded-full bg-[#139dc7] mt-2" />
                      <Text className="text-sm text-[#0a4d61] font-medium flex-1">
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default AIHealthInsights;
