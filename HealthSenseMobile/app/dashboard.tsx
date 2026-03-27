import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../utils/supabaseClient";

type UserData = {
  first_name: string;
  middle_name?: string;
  last_name: string;
  language?: "English" | "Tagalog";
  units?: string;
  large_text?: boolean;
};

const content = {
  English: {
    profile: "Profile", logout: "Logout",
    welcome: "Welcome back,", sub: "Your health data is ready to review.",
    resultsLabel: "Latest Results", resultsDesc: "View your most recent checkup diagnostics and vitals report.",
    resultsAction: "Open Report",
    historyLabel: "Checkup History", historyDesc: "Browse your past checkups, trends, and archived records.",
    historyAction: "View Archive",
    footer: "HealthSense Operations v2.0",
    tagline: "Patient Portal",
  },
  Tagalog: {
    profile: "Profile", logout: "Mag-logout",
    welcome: "Maligayang pagdating,", sub: "Handa na ang iyong mga health data para suriin.",
    resultsLabel: "Pinakabagong Resulta", resultsDesc: "Tingnan ang iyong pinakabagong diagnostic at vital signs.",
    resultsAction: "Buksan ang Ulat",
    historyLabel: "Kasaysayan ng Checkup", historyDesc: "I-browse ang mga nakaraang checkup at archived records.",
    historyAction: "Tingnan ang Archive",
    footer: "HealthSense Operations v2.0",
    tagline: "Patient Portal",
  },
};

export default function DashboardScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<"English" | "Tagalog">("English");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { router.replace("/"); return; }
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, middle_name, last_name, language, units, large_text")
          .eq("id", session.user.id)
          .single();
        if (error) console.error(error.message);
        if (data) {
          setUserData(data);
          if (data.language) setLanguage(data.language as "English" | "Tagalog");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    router.replace("/");
  };

  const formatName = () => {
    if (!userData) return "Patient";
    const mi = userData.middle_name ? ` ${userData.middle_name.charAt(0)}.` : "";
    return `${userData.first_name}${mi} ${userData.last_name}`;
  };

  const getInitials = () => {
    if (!userData) return "??";
    return `${userData.first_name.charAt(0)}${userData.last_name.charAt(0)}`;
  };

  const lang = content[language];

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eaf4ff]">
        <ActivityIndicator size="large" color="#139dc7" />
        <Text className="text-[#139dc7] font-black text-base mt-4 tracking-tight">
          Loading Dashboard
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#eaf4ff]"
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View className="flex-row justify-between items-center px-6 pt-14 pb-4">
        {/* Logo */}
        <View className="flex-row items-center gap-3">
          <View className="w-9 h-9 rounded-xl bg-[#139dc7] items-center justify-center shadow-lg">
            <View className="w-4 h-4 bg-white/90 rounded-sm" />
          </View>
          <View>
            <Text className="text-sm font-black text-[#139dc7] uppercase tracking-tight">
              HealthSense
            </Text>
            <Text className="text-[8px] font-bold text-[#34A0A4] uppercase tracking-widest mt-0.5">
              {lang.tagline}
            </Text>
          </View>
        </View>

        {/* Nav actions */}
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => router.push("/profile")}
            className="flex-row items-center gap-2 px-3 py-2 bg-white/50 border border-white/70 rounded-2xl"
            activeOpacity={0.8}
          >
            <View className="w-6 h-6 rounded-full bg-[#139dc7] items-center justify-center">
              <Text className="text-white text-[9px] font-black">{getInitials()}</Text>
            </View>
            <Text className="text-[10px] font-black text-[#139dc7] uppercase tracking-widest">
              {lang.profile}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center gap-1.5 px-3 py-2 bg-white/50 border border-white/70 rounded-2xl"
            activeOpacity={0.8}
          >
            <Text className="text-[10px] font-black text-[#139dc7] uppercase tracking-widest">
              ↩ {lang.logout}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* WELCOME BLOCK */}
      <View className="px-6 pt-6 pb-4">
        <Text className="text-[10px] font-black text-[#139dc7]/50 uppercase tracking-widest mb-1">
          {lang.welcome}
        </Text>
        <Text className="text-3xl font-black text-[#0a4d61] leading-tight tracking-tight">
          {formatName()}
        </Text>
        <Text className="text-[#139dc7]/60 font-medium mt-1 text-sm">{lang.sub}</Text>
        <View className="mt-4 h-px bg-[#139dc7]/20" />
      </View>

      {/* CARDS */}
      <View className="px-6 flex-row gap-4 mt-2">

        {/* Results Card */}
        <TouchableOpacity
          onPress={() => router.push("/results")}
          className="flex-1 bg-white/60 border border-white rounded-3xl p-5 overflow-hidden"
          activeOpacity={0.85}
          style={{ minHeight: 220 }}
        >
          {/* Ghost icon bg */}
          <View className="absolute bottom-0 right-0 opacity-5">
            <Text style={{ fontSize: 120 }}>📋</Text>
          </View>

          {/* Icon */}
          <View className="w-12 h-12 rounded-2xl bg-[#139dc7] items-center justify-center shadow-lg mb-4">
            <Text className="text-white text-xl">📋</Text>
          </View>

          <Text className="text-[8px] font-black text-[#139dc7]/40 uppercase tracking-widest mb-1">
            Quick Access
          </Text>
          <Text className="text-lg font-black text-[#0a4d61] leading-tight mb-2">
            {lang.resultsLabel}
          </Text>
          <Text className="text-[#139dc7]/60 text-xs leading-relaxed font-medium">
            {lang.resultsDesc}
          </Text>

          {/* CTA */}
          <View className="flex-row items-center gap-2 mt-4">
            <Text className="text-[9px] font-black text-[#139dc7] uppercase tracking-widest">
              {lang.resultsAction}
            </Text>
            <View className="w-5 h-5 rounded-full bg-[#139dc7]/10 items-center justify-center">
              <Text className="text-[#139dc7] text-[9px]">›</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* History Card */}
        <TouchableOpacity
          onPress={() => router.push("/history")}
          className="flex-1 rounded-3xl p-5 overflow-hidden"
          activeOpacity={0.85}
          style={{
            minHeight: 220,
            background: undefined,
            backgroundColor: "#139dc7",
          }}
        >
          {/* Decorative circles */}
          <View className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10" />
          <View className="absolute -bottom-6 -left-4 w-16 h-16 rounded-full bg-white/10" />

          {/* Ghost icon */}
          <View className="absolute bottom-0 right-0 opacity-10">
            <Text style={{ fontSize: 120 }}>🕐</Text>
          </View>

          {/* Icon */}
          <View className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 items-center justify-center mb-4">
            <Text className="text-white text-xl">🕐</Text>
          </View>

          <Text className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">
            Archive
          </Text>
          <Text className="text-lg font-black text-white leading-tight mb-2">
            {lang.historyLabel}
          </Text>
          <Text className="text-white/60 text-xs leading-relaxed font-medium">
            {lang.historyDesc}
          </Text>

          {/* CTA */}
          <View className="flex-row items-center gap-2 mt-4">
            <Text className="text-[9px] font-black text-white uppercase tracking-widest">
              {lang.historyAction}
            </Text>
            <View className="w-5 h-5 rounded-full bg-white/20 items-center justify-center">
              <Text className="text-white text-[9px]">›</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* STATS STRIP */}
      <View className="px-6 mt-5 flex-row gap-3">
        {/* Language */}
        <View className="flex-1 bg-white/30 border border-white/50 rounded-2xl px-3 py-3 items-center">
          <Text className="text-[8px] font-black text-[#139dc7]/40 uppercase tracking-widest">
            Language
          </Text>
          <Text className="text-sm font-black text-[#0a4d61] mt-0.5">
            {language === "English" ? "EN" : "TL"}
          </Text>
          <Text className="text-[8px] text-[#139dc7]/50 font-medium mt-0.5">{language}</Text>
        </View>

        {/* Units */}
        <View className="flex-1 bg-white/30 border border-white/50 rounded-2xl px-3 py-3 items-center">
          <Text className="text-[8px] font-black text-[#139dc7]/40 uppercase tracking-widest">
            Units
          </Text>
          <Text className="text-sm font-black text-[#0a4d61] mt-0.5">
            {userData?.units?.toLowerCase() === "imperial" ? "lb/in" : "kg/m"}
          </Text>
          <Text className="text-[8px] text-[#139dc7]/50 font-medium mt-0.5">
            {userData?.units?.toLowerCase() === "imperial" ? "Imperial" : "Metric"}
          </Text>
        </View>

        {/* Large Text */}
        <View className="flex-1 bg-white/30 border border-white/50 rounded-2xl px-3 py-3 items-center">
          <Text className="text-[8px] font-black text-[#139dc7]/40 uppercase tracking-widest">
            Large Text
          </Text>
          <Text className="text-sm font-black text-[#0a4d61] mt-0.5">
            {userData?.large_text ? "ON" : "OFF"}
          </Text>
          <Text className="text-[8px] text-[#139dc7]/50 font-medium mt-0.5">Accessibility</Text>
        </View>
      </View>

      {/* FOOTER */}
      <View className="items-center mt-10">
        <Text className="text-[9px] font-black uppercase tracking-widest text-[#139dc7]/30">
          {lang.footer}
        </Text>
      </View>
    </ScrollView>
  );
}