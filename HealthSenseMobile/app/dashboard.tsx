import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../utils/supabaseClient";
import BottomNav from "../components/BottomNav";

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
    welcome: "Welcome back,", sub: "Your health data is ready to review.",
    resultsLabel: "Latest Results", resultsDesc: "View your most recent checkup diagnostics and vitals report.",
    resultsAction: "Open Report",
    historyLabel: "Checkup History", historyDesc: "Browse your past checkups, trends, and archived records.",
    historyAction: "View Archive",
    tagline: "Patient Portal",
  },
  Tagalog: {
    welcome: "Maligayang pagdating,", sub: "Handa na ang iyong mga health data para suriin.",
    resultsLabel: "Pinakabagong Resulta", resultsDesc: "Tingnan ang iyong pinakabagong diagnostic at vital signs.",
    resultsAction: "Buksan ang Ulat",
    historyLabel: "Kasaysayan ng Checkup", historyDesc: "I-browse ang mga nakaraang checkup at archived records.",
    historyAction: "Tingnan ang Archive",
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

        // If somehow session is gone, boot to login
        if (!session?.user) {
          router.replace("/");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, middle_name, last_name, language, units, large_text")
          .eq("id", session.user.id)
          .single();

        if (error) throw error;

        if (data) {
          setUserData(data);
          await AsyncStorage.setItem("hs_profile", JSON.stringify(data));
          if (data.language) setLanguage(data.language as "English" | "Tagalog");
        }
      } catch {
        // Network offline fallback — use cached profile
        const cached = await AsyncStorage.getItem("hs_profile");
        if (cached) {
          const data = JSON.parse(cached);
          setUserData(data);
          if (data.language) setLanguage(data.language as "English" | "Tagalog");
        } else {
          router.replace("/");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem("hs_profile");
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

          <TouchableOpacity
            onPress={() => router.push("/profile")}
            className="flex-row items-center gap-1.5 px-2.5 py-2 bg-white/50 border border-white/70 rounded-2xl"
            activeOpacity={0.8}
          >
            <View className="w-6 h-6 rounded-full bg-[#139dc7] items-center justify-center">
              <Text className="text-white text-[9px] font-black">{getInitials()}</Text>
            </View>
            <Ionicons name="person" size={11} color="#139dc7" />
          </TouchableOpacity>
        </View>

        {/* ── WELCOME BLOCK ── */}
        <View className="px-6 pt-4 pb-4">
          <Text className="text-[10px] font-black text-[#139dc7]/50 uppercase tracking-widest mb-1">
            {lang.welcome}
          </Text>
          <Text className="text-3xl font-black text-[#0a4d61] leading-tight tracking-tight">
            {formatName()}
          </Text>
          <Text className="text-[#139dc7]/60 font-medium mt-1 text-sm">{lang.sub}</Text>
          <View className="mt-4 h-px bg-[#139dc7]/20" />
        </View>

        {/* ── CARDS ── */}
        <View className="px-6 flex-row gap-4 mt-2 mb-7">
          <TouchableOpacity
            onPress={() => router.push("/results")}
            className="flex-1 bg-white/60 border border-white/80 rounded-3xl p-5 overflow-hidden"
            activeOpacity={0.85}
            style={{ minHeight: 230 }}
          >
            <View style={{ position: "absolute", bottom: -10, right: -10, opacity: 0.04 }}>
              <Ionicons name="document-text" size={140} color="#139dc7" />
            </View>
            <View
              className="w-12 h-12 rounded-2xl bg-[#139dc7] items-center justify-center mb-4"
              style={{ shadowColor: "#139dc7", shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
            >
              <Ionicons name="document-text" size={22} color="white" />
            </View>
            <Text className="text-[8px] font-black text-[#139dc7]/40 uppercase tracking-widest mb-1">
              Quick Access
            </Text>
            <Text className="text-base font-black text-[#0a4d61] leading-tight mb-2">
              {lang.resultsLabel}
            </Text>
            <Text className="text-[#139dc7]/60 text-xs leading-relaxed font-medium">
              {lang.resultsDesc}
            </Text>
            <View className="flex-row items-center gap-2 mt-4">
              <Text className="text-[9px] font-black text-[#139dc7] uppercase tracking-widest">
                {lang.resultsAction}
              </Text>
              <View className="w-5 h-5 rounded-full bg-[#139dc7]/10 items-center justify-center">
                <Ionicons name="chevron-forward" size={10} color="#139dc7" />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/history")}
            className="flex-1 rounded-3xl p-5 overflow-hidden"
            activeOpacity={0.85}
            style={{
              minHeight: 230,
              backgroundColor: "#139dc7",
              shadowColor: "#139dc7",
              shadowOpacity: 0.35,
              shadowRadius: 16,
              elevation: 6,
            }}
          >
            <View className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10" />
            <View className="absolute -bottom-6 -left-4 w-16 h-16 rounded-full bg-white/10" />
            <View style={{ position: "absolute", bottom: -10, right: -10, opacity: 0.08 }}>
              <Ionicons name="time" size={140} color="white" />
            </View>
            <View className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 items-center justify-center mb-4">
              <Ionicons name="time" size={22} color="white" />
            </View>
            <Text className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">
              Archive
            </Text>
            <Text className="text-base font-black text-white leading-tight mb-2">
              {lang.historyLabel}
            </Text>
            <Text className="text-white/60 text-xs leading-relaxed font-medium">
              {lang.historyDesc}
            </Text>
            <View className="flex-row items-center gap-2 mt-4">
              <Text className="text-[9px] font-black text-white uppercase tracking-widest">
                {lang.historyAction}
              </Text>
              <View className="w-5 h-5 rounded-full bg-white/20 items-center justify-center">
                <Ionicons name="chevron-forward" size={10} color="white" />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── STATS STRIP ── */}
        <View className="px-6 flex-row gap-3">
          <View className="flex-1 bg-white/30 border border-white/50 rounded-2xl px-3 py-3 items-center">
            <Text className="text-[8px] font-black text-[#139dc7]/40 uppercase tracking-widest">
              Language
            </Text>
            <Text className="text-sm font-black text-[#0a4d61] mt-0.5">
              {language === "English" ? "EN" : "TL"}
            </Text>
            <Text className="text-[8px] text-[#139dc7]/50 font-medium mt-0.5">{language}</Text>
          </View>
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
      </ScrollView>

      <BottomNav onLogout={handleLogout} />
    </View>
  );
}