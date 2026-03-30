/**
 * app/trends.tsx
 * Health Trends — extracted from dashboard, now its own page.
 * Reached via the center + button in BottomNav.
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LineChart, BarChart } from "react-native-chart-kit";
import { supabase } from "../utils/supabaseClient";
import BottomNav from "../components/BottomNav";

const SCREEN_WIDTH = Dimensions.get("window").width;

type VitalKey = "spo2" | "temp" | "bmi" | "hr" | "bp_sys";

type ChartEntry = {
  date: string;
  spo2: number | null;
  temp: number | null;
  bmi: number | null;
  hr: number | null;
  bp_sys: number | null;
};

const VITAL_TABS: { key: VitalKey; label: string; unit: string; color: string }[] = [
  { key: "hr",     label: "Heart Rate", unit: "bpm",  color: "#ef4444" },
  { key: "spo2",   label: "SpO2",       unit: "%",    color: "#139dc7" },
  { key: "temp",   label: "Temp",       unit: "°C",   color: "#f59e0b" },
  { key: "bmi",    label: "BMI",        unit: "",     color: "#8b5cf6" },
  { key: "bp_sys", label: "BP Sys",     unit: "mmHg", color: "#10b981" },
];

const content = {
  English: {
    tagline: "Patient Portal",
    trendsTitle: "Health Trends",
    trendsSub: "Your vitals over time",
    noData: "Not enough data to show trends yet.",
  },
  Tagalog: {
    tagline: "Patient Portal",
    trendsTitle: "Mga Trend sa Kalusugan",
    trendsSub: "Ang iyong mga vital signs sa paglipas ng panahon",
    noData: "Hindi pa sapat ang data para ipakita ang mga trend.",
  },
};

export default function TrendsScreen() {
  const router = useRouter();
  const [loading, setLoading]         = useState(true);
  const [language, setLanguage]       = useState<"English" | "Tagalog">("English");
  const [chartData, setChartData]     = useState<ChartEntry[]>([]);
  const [activeVital, setActiveVital] = useState<VitalKey>("hr");
  const [activeChart, setActiveChart] = useState<"line" | "bar">("line");

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { router.replace("/"); return; }

        // Load cached language preference
        const cached = await AsyncStorage.getItem("hs_profile");
        if (cached) {
          const profile = JSON.parse(cached);
          if (profile.language) setLanguage(profile.language);
        }

        const { data: checkups } = await supabase
          .from("health_checkups")
          .select("spo2, temperature, bmi, heart_rate, blood_pressure, created_at")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: true })
          .limit(10);

        if (checkups) {
          setChartData(
            checkups.map((c) => {
              const bpSys = c.blood_pressure?.includes("/")
                ? Number(c.blood_pressure.split("/")[0])
                : null;
              return {
                date:   new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                spo2:   c.spo2        ? Number(c.spo2)        : null,
                temp:   c.temperature ? Number(c.temperature) : null,
                bmi:    c.bmi         ? Number(c.bmi)         : null,
                hr:     c.heart_rate  ? Number(c.heart_rate)  : null,
                bp_sys: bpSys,
              };
            })
          );
        }
      } catch {
        const cached = await AsyncStorage.getItem("hs_profile");
        if (cached) {
          const profile = JSON.parse(cached);
          if (profile.language) setLanguage(profile.language);
        }
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    router.replace("/");
  };

  const buildChartKitData = () => {
    const filtered = chartData.filter((d) => d[activeVital] !== null);
    return {
      labels: filtered.map((d) => d.date),
      datasets: [{ data: filtered.map((d) => d[activeVital] as number) }],
    };
  };

  const activeVitalInfo = VITAL_TABS.find((v) => v.key === activeVital)!;
  const hasEnoughData   = chartData.filter((d) => d[activeVital] !== null).length >= 2;
  const lang            = content[language];

  const chartConfig = {
    backgroundGradientFrom: "rgba(255,255,255,0)",
    backgroundGradientTo:   "rgba(255,255,255,0)",
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity:   0,
    color: (opacity = 1) =>
      `${activeVitalInfo.color}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`,
    labelColor: () => "rgba(19,157,199,0.6)",
    strokeWidth: 3,
    barPercentage: 0.55,
    decimalPlaces: 1,
    propsForDots: { r: "5", strokeWidth: "2", stroke: "#fff" },
    propsForBackgroundLines: { stroke: "rgba(19,157,199,0.1)", strokeDasharray: "4 4" },
    propsForLabels: { fontSize: 9, fontWeight: "700" },
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eaf4ff]">
        <ActivityIndicator size="large" color="#139dc7" />
        <Text className="text-[#139dc7] font-black text-base mt-4 tracking-tight">
          Loading Trends
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#eaf4ff]">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View className="flex-row justify-between items-center px-5 pt-5 pb-4">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-xl bg-[#139dc7] items-center justify-center">
              <View className="w-3 h-3 bg-white rounded-sm" />
            </View>
            <View>
              <Text className="text-xs font-black text-[#139dc7] uppercase tracking-tight">
                HealthSense
              </Text>
              <Text className="text-[7px] font-bold text-[#34A0A4] uppercase tracking-widest">
                {lang.tagline}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-1.5 px-2.5 py-1.5 bg-white/50 border border-white/70 rounded-2xl">
            <View className="w-1.5 h-1.5 rounded-full bg-[#139dc7]" />
            <Text className="text-[8px] font-black text-[#139dc7] uppercase tracking-widest">
              Trends
            </Text>
          </View>
        </View>

        {/* ── TITLE BLOCK ── */}
        <View className="px-6 pt-2 pb-4">
          <Text className="text-[10px] font-black text-[#139dc7]/50 uppercase tracking-widest mb-1">
            Overview
          </Text>
          <Text className="text-3xl font-black text-[#0a4d61] leading-tight tracking-tight">
            {lang.trendsTitle}
          </Text>
          <Text className="text-[#139dc7]/60 font-medium mt-1 text-sm">{lang.trendsSub}</Text>
          <View className="mt-4 h-px bg-[#139dc7]/20" />
        </View>

        {/* ── CHART SECTION ── */}
        <View className="px-6 mt-2">

          {/* Line / Bar toggle */}
          <View className="flex-row items-center justify-end mb-4">
            <View className="flex-row items-center gap-1 bg-white/50 border border-white/70 rounded-2xl p-1">
              {(["line", "bar"] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setActiveChart(type)}
                  className={`px-3 py-1.5 rounded-xl ${activeChart === type ? "bg-[#139dc7]" : ""}`}
                  activeOpacity={0.8}
                >
                  <Text
                    className={`text-[9px] font-black uppercase tracking-widest ${
                      activeChart === type ? "text-white" : "text-[#139dc7]/50"
                    }`}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

        {/* Vital tabs — horizontal scroll */}
        <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-4"
        style={{ marginHorizontal: -24 }}                      // ← break out of px-6
        contentContainerStyle={{ gap: 8, paddingHorizontal: 24, paddingVertical: 6 }}  // ← add paddingVertical
        >
            {VITAL_TABS.map((v) => {
              const isActive = activeVital === v.key;
              return (
                <TouchableOpacity
                  key={v.key}
                  onPress={() => setActiveVital(v.key)}
                  className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                    isActive ? "border-transparent" : "bg-white/50 border-white/70"
                  }`}
                  style={isActive ? { backgroundColor: v.color } : {}}
                  activeOpacity={0.8}
                >
                  <View
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: isActive ? "rgba(255,255,255,0.7)" : v.color }}
                  />
                  <Text
                    className="text-[10px] font-black uppercase tracking-wider"
                    style={{ color: isActive ? "#fff" : "rgba(19,157,199,0.6)" }}
                  >
                    {v.label}
                  </Text>
                  {v.unit ? (
                    <Text
                      className="text-[9px] font-bold"
                      style={{ color: isActive ? "rgba(255,255,255,0.6)" : "rgba(19,157,199,0.4)" }}
                    >
                      {v.unit}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Chart card */}
          <View
          className="bg-white border border-white/80 rounded-3xl pt-5 pb-4 overflow-hidden"  // ← bg-white instead of bg-white/60
          style={{ shadowColor: "#139dc7", shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 }}
          >
            {!hasEnoughData ? (
              <View className="h-44 items-center justify-center px-6">
                <Ionicons name="analytics-outline" size={36} color="rgba(19,157,199,0.2)" />
                <Text className="text-[#139dc7]/40 font-bold text-sm text-center mt-3">
                  {lang.noData}
                </Text>
              </View>
            ) : activeChart === "line" ? (
              <LineChart
                data={buildChartKitData()}
                width={SCREEN_WIDTH - 48}
                height={220}
                chartConfig={chartConfig}
                bezier
                withInnerLines
                withOuterLines={false}
                withShadow={false}
                style={{ marginLeft: -8 }}
              />
            ) : (
              <BarChart
                data={buildChartKitData()}
                width={SCREEN_WIDTH - 48}
                height={220}
                chartConfig={chartConfig}
                withInnerLines
                showValuesOnTopOfBars
                style={{ marginLeft: -8 }}
                yAxisLabel=""
                yAxisSuffix=""
              />
            )}

            {/* Legend */}
            <View className="flex-row items-center justify-center gap-2 mt-2 px-4">
              <View
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: activeVitalInfo.color }}
              />
              <Text className="text-[9px] font-black text-[#0a4d61]/50 uppercase tracking-widest">
                {activeVitalInfo.label}
                {activeVitalInfo.unit ? ` (${activeVitalInfo.unit})` : ""}
                {" — "}Last {chartData.filter((d) => d[activeVitalInfo.key] !== null).length} checkups
              </Text>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* ── BOTTOM NAV ── */}
      <BottomNav onLogout={handleLogout} />
    </View>
  );
}