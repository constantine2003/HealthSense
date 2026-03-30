/**
 * app/trends.tsx
 * Health Trends — improved UI, deployment-safe.
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Platform,
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

const VITAL_TABS: {
  key: VitalKey;
  label: string;
  unit: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  normalRange: string;
}[] = [
  { key: "hr",     label: "Heart Rate", unit: "bpm",  color: "#ef4444", icon: "heart",           normalRange: "60–100" },
  { key: "spo2",   label: "SpO₂",       unit: "%",    color: "#139dc7", icon: "water",            normalRange: "95–100" },
  { key: "temp",   label: "Temp",        unit: "°C",   color: "#f59e0b", icon: "thermometer",      normalRange: "36.5–37.5" },
  { key: "bmi",    label: "BMI",         unit: "",     color: "#8b5cf6", icon: "body",             normalRange: "18.5–24.9" },
  { key: "bp_sys", label: "BP Sys",      unit: "mmHg", color: "#10b981", icon: "pulse",            normalRange: "90–120" },
];

const content = {
  English: {
    tagline: "Patient Portal",
    trendsTitle: "Health Trends",
    trendsSub: "Your vitals over time",
    noData: "Not enough data to show trends yet.",
    normalRange: "Normal range",
    checkups: "checkups",
    last: "Last",
  },
  Tagalog: {
    tagline: "Patient Portal",
    trendsTitle: "Mga Trend sa Kalusugan",
    trendsSub: "Ang iyong mga vital signs sa paglipas ng panahon",
    noData: "Hindi pa sapat ang data para ipakita ang mga trend.",
    normalRange: "Normal na saklaw",
    checkups: "na checkup",
    last: "Huli",
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
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { router.replace("/"); return; }

        const cached = await AsyncStorage.getItem("hs_profile");
        if (cached) {
          const profile = JSON.parse(cached);
          if (profile.language) setLanguage(profile.language);
        }

        const { data: checkups, error } = await supabase
          .from("health_checkups")
          .select("spo2, temperature, bmi, heart_rate, blood_pressure, created_at")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: true })
          .limit(10);

        if (error) throw error;

        if (checkups && checkups.length > 0) {
          setChartData(
            checkups.map((c) => {
              const bpSys = c.blood_pressure?.includes("/")
                ? Number(c.blood_pressure.split("/")[0])
                : null;
              return {
                date:   new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                spo2:   c.spo2        != null ? Number(c.spo2)        : null,
                temp:   c.temperature != null ? Number(c.temperature) : null,
                bmi:    c.bmi         != null ? Number(c.bmi)         : null,
                hr:     c.heart_rate  != null ? Number(c.heart_rate)  : null,
                bp_sys: bpSys,
              };
            })
          );
        }
      } catch {
        // Offline fallback — language only, chart stays empty
        const cached = await AsyncStorage.getItem("hs_profile");
        if (cached) {
          try {
            const profile = JSON.parse(cached);
            if (profile.language) setLanguage(profile.language);
          } catch {}
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleLogout = useCallback(async () => {
    await AsyncStorage.removeItem("hs_profile");
    try { await supabase.auth.signOut(); } catch {}
    router.replace("/");
  }, [router]);

  const filteredData = chartData.filter((d) => d[activeVital] !== null);

  const buildChartKitData = () => ({
    labels:   filteredData.map((d) => d.date),
    datasets: [{ data: filteredData.map((d) => d[activeVital] as number) }],
  });

  const activeVitalInfo = VITAL_TABS.find((v) => v.key === activeVital)!;
  const hasEnoughData   = filteredData.length >= 2;
  const latestValue     = filteredData.length > 0
    ? filteredData[filteredData.length - 1][activeVital]
    : null;
  const prevValue       = filteredData.length > 1
    ? filteredData[filteredData.length - 2][activeVital]
    : null;
  const trend = latestValue != null && prevValue != null
    ? latestValue > prevValue ? "up" : latestValue < prevValue ? "down" : "flat"
    : null;

  const lang = content[language];

  const chartConfig = {
    backgroundGradientFrom:        "rgba(255,255,255,0)",
    backgroundGradientTo:          "rgba(255,255,255,0)",
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity:   0,
    color: (opacity = 1) => {
      const hex = Math.round(opacity * 255).toString(16).padStart(2, "0");
      return `${activeVitalInfo.color}${hex}`;
    },
    labelColor: () => "rgba(19,157,199,0.55)",
    strokeWidth: 2.5,
    barPercentage: 0.5,
    decimalPlaces: 1,
    propsForDots: {
      r: "5",
      strokeWidth: "2.5",
      stroke: "#ffffff",
    },
    propsForBackgroundLines: {
      stroke: "rgba(19,157,199,0.08)",
      strokeDasharray: "4 4",
    },
    propsForLabels: { fontSize: 9 },
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#139dc7" />
        <Text style={styles.loadingText}>Loading Trends</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            <View style={styles.brandIcon}>
              <View style={styles.brandIconInner} />
            </View>
            <View>
              <Text style={styles.brandName}>HealthSense</Text>
              <Text style={styles.brandTagline}>{lang.tagline}</Text>
            </View>
          </View>
          <View style={styles.headerBadge}>
            <View style={styles.headerBadgeDot} />
            <Text style={styles.headerBadgeText}>Trends</Text>
          </View>
        </View>

        {/* ── TITLE BLOCK ── */}
        <View style={styles.titleBlock}>
          <Text style={styles.titleEyebrow}>Overview</Text>
          <Text style={styles.titleMain}>{lang.trendsTitle}</Text>
          <Text style={styles.titleSub}>{lang.trendsSub}</Text>
          <View style={styles.titleDivider} />
        </View>

        {/* ── STAT SUMMARY ROW ── */}
        <View style={styles.statsRow}>
          {/* Current value card */}
          <View style={[styles.statCard, styles.statCardPrimary, { borderLeftColor: activeVitalInfo.color }]}>
            <Text style={styles.statLabel}>Current</Text>
            <View style={styles.statValueRow}>
              <Text style={[styles.statValue, { color: activeVitalInfo.color }]}>
                {latestValue != null ? latestValue.toFixed(1) : "—"}
              </Text>
              {activeVitalInfo.unit ? (
                <Text style={[styles.statUnit, { color: activeVitalInfo.color }]}>
                  {activeVitalInfo.unit}
                </Text>
              ) : null}
              {trend ? (
                <View style={[styles.trendBadge, {
                  backgroundColor: trend === "up"
                    ? "rgba(239,68,68,0.1)"
                    : trend === "down"
                    ? "rgba(16,185,129,0.1)"
                    : "rgba(19,157,199,0.1)",
                }]}>
                  <Ionicons
                    name={trend === "up" ? "trending-up" : trend === "down" ? "trending-down" : "remove"}
                    size={13}
                    color={trend === "up" ? "#ef4444" : trend === "down" ? "#10b981" : "#139dc7"}
                  />
                </View>
              ) : null}
            </View>
            <Text style={styles.statRangeLabel}>
              {lang.normalRange}: {activeVitalInfo.normalRange}
              {activeVitalInfo.unit ? ` ${activeVitalInfo.unit}` : ""}
            </Text>
          </View>

          {/* Total readings card */}
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Readings</Text>
            <Text style={[styles.statValue, { color: "#0a4d61" }]}>
              {filteredData.length}
            </Text>
            <Text style={styles.statRangeLabel}>{lang.checkups}</Text>
          </View>
        </View>

        {/* ── CHART SECTION ── */}
        <View style={styles.chartSection}>

          {/* Top row: chart type toggle */}
          <View style={styles.chartTopRow}>
            <Text style={styles.chartSectionLabel}>
              {activeVitalInfo.label} over time
            </Text>
            <View style={styles.chartToggle}>
              {(["line", "bar"] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setActiveChart(type)}
                  activeOpacity={0.8}
                  style={[
                    styles.chartToggleBtn,
                    activeChart === type && styles.chartToggleBtnActive,
                  ]}
                >
                  <Ionicons
                    name={type === "line" ? "analytics-outline" : "bar-chart-outline"}
                    size={13}
                    color={activeChart === type ? "#fff" : "rgba(19,157,199,0.5)"}
                  />
                  <Text style={[
                    styles.chartToggleText,
                    activeChart === type && styles.chartToggleTextActive,
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Vital tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.vitalTabsScroll}
            contentContainerStyle={styles.vitalTabsContent}
          >
            {VITAL_TABS.map((v) => {
              const isActive = activeVital === v.key;
              return (
                <TouchableOpacity
                  key={v.key}
                  onPress={() => setActiveVital(v.key)}
                  activeOpacity={0.8}
                  style={[
                    styles.vitalTab,
                    isActive
                      ? { backgroundColor: v.color, borderColor: v.color }
                      : styles.vitalTabInactive,
                  ]}
                >
                  <Ionicons
                    name={v.icon}
                    size={12}
                    color={isActive ? "rgba(255,255,255,0.9)" : "rgba(19,157,199,0.5)"}
                  />
                  <Text style={[
                    styles.vitalTabText,
                    { color: isActive ? "#fff" : "rgba(19,157,199,0.6)" },
                  ]}>
                    {v.label}
                  </Text>
                  {v.unit ? (
                    <Text style={[
                      styles.vitalTabUnit,
                      { color: isActive ? "rgba(255,255,255,0.6)" : "rgba(19,157,199,0.35)" },
                    ]}>
                      {v.unit}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Chart card */}
          <View style={styles.chartCard}>
            {!hasEnoughData ? (
              <View style={styles.noDataContainer}>
                <View style={styles.noDataIconWrapper}>
                  <Ionicons name="analytics-outline" size={32} color="rgba(19,157,199,0.25)" />
                </View>
                <Text style={styles.noDataText}>{lang.noData}</Text>
                <Text style={styles.noDataHint}>
                  Complete at least 2 checkups to see your trend.
                </Text>
              </View>
            ) : activeChart === "line" ? (
              <LineChart
                data={buildChartKitData()}
                width={SCREEN_WIDTH - 48}
                height={210}
                chartConfig={chartConfig}
                bezier
                withInnerLines
                withOuterLines={false}
                withShadow={false}
                style={styles.chart}
              />
            ) : (
              <BarChart
                data={buildChartKitData()}
                width={SCREEN_WIDTH - 48}
                height={210}
                chartConfig={chartConfig}
                withInnerLines
                showValuesOnTopOfBars
                style={styles.chart}
                yAxisLabel=""
                yAxisSuffix=""
              />
            )}

            {/* Legend */}
            {hasEnoughData && (
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: activeVitalInfo.color }]} />
                <Text style={styles.legendText}>
                  {activeVitalInfo.label}
                  {activeVitalInfo.unit ? ` (${activeVitalInfo.unit})` : ""}
                  {"  ·  "}
                  {lang.last} {filteredData.length} {lang.checkups}
                </Text>
              </View>
            )}
          </View>

        </View>

        {/* ── VITAL CARDS GRID ── */}
        <View style={styles.vitalCardsSection}>
          <Text style={styles.vitalCardsSectionLabel}>All Vitals — Latest Reading</Text>
          <View style={styles.vitalCardsGrid}>
            {VITAL_TABS.map((v) => {
              const latest = chartData
                .filter((d) => d[v.key] !== null)
                .slice(-1)[0];
              const val = latest ? latest[v.key] : null;
              return (
                <TouchableOpacity
                  key={v.key}
                  onPress={() => setActiveVital(v.key)}
                  activeOpacity={0.8}
                  style={[
                    styles.vitalCard,
                    activeVital === v.key && { borderColor: v.color, borderWidth: 1.5 },
                  ]}
                >
                  <View style={[styles.vitalCardIcon, { backgroundColor: `${v.color}18` }]}>
                    <Ionicons name={v.icon} size={18} color={v.color} />
                  </View>
                  <Text style={styles.vitalCardLabel}>{v.label}</Text>
                  <Text style={[styles.vitalCardValue, { color: v.color }]}>
                    {val != null ? val.toFixed(1) : "—"}
                  </Text>
                  {v.unit ? (
                    <Text style={styles.vitalCardUnit}>{v.unit}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

      </ScrollView>

      {/* ── BOTTOM NAV ── */}
      <BottomNav onLogout={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#eaf4ff",
  },
  scrollContent: {
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eaf4ff",
  },
  loadingText: {
    color: "#139dc7",
    fontWeight: "900",
    fontSize: 15,
    marginTop: 14,
    letterSpacing: 0.5,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : 20,
    paddingBottom: 12,
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#139dc7",
    alignItems: "center",
    justifyContent: "center",
  },
  brandIconInner: {
    width: 12,
    height: 12,
    backgroundColor: "#fff",
    borderRadius: 3,
  },
  brandName: {
    fontSize: 12,
    fontWeight: "900",
    color: "#139dc7",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: 7,
    fontWeight: "700",
    color: "#34A0A4",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  headerBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#139dc7",
  },
  headerBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#139dc7",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },

  // Title block
  titleBlock: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  titleEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    color: "rgba(19,157,199,0.45)",
    textTransform: "uppercase",
    letterSpacing: 3,
    marginBottom: 4,
  },
  titleMain: {
    fontSize: 30,
    fontWeight: "900",
    color: "#0a4d61",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  titleSub: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(19,157,199,0.6)",
    marginTop: 4,
  },
  titleDivider: {
    height: 1,
    backgroundColor: "rgba(19,157,199,0.15)",
    marginTop: 16,
  },

  // Stats row
  statsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    shadowColor: "#139dc7",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  statCardPrimary: {
    flex: 2,
    borderLeftWidth: 3,
    borderColor: "transparent",
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "rgba(19,157,199,0.45)",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 6,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -1,
  },
  statUnit: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.7,
  },
  trendBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
  statRangeLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(19,157,199,0.45)",
  },

  // Chart section
  chartSection: {
    paddingHorizontal: 24,
  },
  chartTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  chartSectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0a4d61",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chartToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    padding: 3,
    gap: 2,
  },
  chartToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  chartToggleBtnActive: {
    backgroundColor: "#139dc7",
  },
  chartToggleText: {
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "rgba(19,157,199,0.5)",
  },
  chartToggleTextActive: {
    color: "#fff",
  },

  // Vital tabs
  vitalTabsScroll: {
    marginHorizontal: -24,
    marginBottom: 14,
  },
  vitalTabsContent: {
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 4,
  },
  vitalTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  vitalTabInactive: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderColor: "rgba(255,255,255,0.9)",
  },
  vitalTabText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  vitalTabUnit: {
    fontSize: 9,
    fontWeight: "700",
  },

  // Chart card
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingTop: 20,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    shadowColor: "#139dc7",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
    overflow: "hidden",
  },
  chart: {
    marginLeft: -8,
  },
  noDataContainer: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  noDataIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(19,157,199,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  noDataText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(19,157,199,0.5)",
    textAlign: "center",
    lineHeight: 20,
  },
  noDataHint: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(19,157,199,0.35)",
    textAlign: "center",
    marginTop: 4,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(10,77,97,0.45)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Vital cards grid
  vitalCardsSection: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  vitalCardsSectionLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "rgba(19,157,199,0.45)",
    textTransform: "uppercase",
    letterSpacing: 2.5,
    marginBottom: 12,
  },
  vitalCardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  vitalCard: {
    width: (SCREEN_WIDTH - 48 - 10) / 2 - 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    shadowColor: "#139dc7",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  vitalCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  vitalCardLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "rgba(19,157,199,0.45)",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  vitalCardValue: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  vitalCardUnit: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(19,157,199,0.4)",
    marginTop: 1,
  },
});