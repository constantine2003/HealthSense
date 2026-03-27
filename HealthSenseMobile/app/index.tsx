import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../utils/supabaseClient";

export default function LoginScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [recoveryEmailInput, setRecoveryEmailInput] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState({ type: "", text: "" });

  const handleLogin = async () => {
    setLoginError("");
    if (!emailInput || !passwordInput) {
      setLoginError("Please enter both credentials.");
      return;
    }
    setIsLoading(true);
    try {
      const userInput = emailInput.toLowerCase().trim();
      let loginEmail = "";
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("recovery_email, username")
        .eq("username", userInput)
        .maybeSingle();
      if (profileError) console.warn("Profile Lookup Error:", profileError.message);
      if (profile) {
        loginEmail = profile.recovery_email
          ? profile.recovery_email
          : `${profile.username}@kiosk.local`;
      } else {
        loginEmail = userInput.includes("@") ? userInput : `${userInput}@kiosk.local`;
      }
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: passwordInput,
      });
      if (authError) throw authError;
      router.replace("/dashboard");
    } catch (err: any) {
      setLoginError("Access denied. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverAccount = async () => {
    setRecoveryMessage({ type: "", text: "" });
    const cleanEmail = recoveryEmailInput.trim();
    try {
      setRecoveryLoading(true);
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("username")
        .ilike("recovery_email", cleanEmail)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (!profile) {
        setRecoveryMessage({ type: "error", text: "No account linked to this email." });
        return;
      }
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (resetError) {
        setRecoveryMessage({ type: "error", text: "Could not send reset link. Try again." });
        return;
      }
      setRecoveryMessage({ type: "success", text: "Reset link sent to your inbox!" });
    } catch (err: any) {
      setRecoveryMessage({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      className="flex-1 bg-[#eaf4ff]"
      keyboardVerticalOffset={Platform.OS === "android" ? 25 : 0}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        {/* HEADER */}
        <View className="flex-row justify-between items-center px-6 pt-14 pb-3">
          <View>
            <Text className="text-xl font-black text-[#139dc7] uppercase tracking-tighter">
              HealthSense
            </Text>
            <Text className="text-[10px] font-bold text-[#34A0A4] uppercase tracking-widest mt-0.5">
              Patient Portal
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5 px-3 py-1.5 bg-white/40 rounded-full border border-white/40">
            <View className="w-5 h-5 bg-[#139dc7] rounded-full items-center justify-center">
              <Text className="text-white text-[9px] font-black">✓</Text>
            </View>
            <Text className="text-[9px] font-black text-[#139dc7] uppercase tracking-wide">
              Portal Login v2.0
            </Text>
          </View>
        </View>

        {/* BRANDING */}
        <View className="items-center px-6 pt-4 pb-2">
          <Text className="text-lg font-bold text-[#139dc7] opacity-90">Welcome to</Text>
          <Text className="text-6xl font-black text-[#139dc7] italic leading-tight">
            HealthSense
          </Text>
          <Text className="text-sm text-[#139dc7] opacity-60 text-center mt-2 leading-relaxed px-6">
            View your personal health checkup results securely, privately, and conveniently.
          </Text>
        </View>

        {/* LOGIN CARD */}
        <View className="mx-5 mt-5 mb-8 bg-white/30 rounded-[36px] border border-white/50 p-7 shadow-lg overflow-hidden">
          
          {/* Card header */}
          <View className="items-center mb-5">
            <Text className="text-4xl font-light text-[#139dc7] tracking-tight">Login</Text>
            <Text className="text-[9px] font-black text-[#139dc7]/40 uppercase tracking-[3px] mt-1">
              Secure Access
            </Text>
          </View>

          {/* Error */}
          {loginError ? (
            <View className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 mb-4">
              <Text className="text-red-600 text-xs font-bold text-center">{loginError}</Text>
            </View>
          ) : null}

          {/* Username */}
          <Text className="text-[9px] font-black text-[#139dc7] uppercase tracking-widest ml-1 mb-1.5">
            Patient ID / Username
          </Text>
          <TextInput
            placeholder="firstname.lastname"
            placeholderTextColor="#9ca3af"
            value={emailInput}
            onChangeText={setEmailInput}
            autoCapitalize="none"
            className="bg-white/60 border border-white/80 rounded-2xl px-5 h-13 text-[#111] text-base mb-4"
          />

          {/* Password */}
          <Text className="text-[9px] font-black text-[#139dc7] uppercase tracking-widest ml-1 mb-1.5">
            Password
          </Text>
          <View className="relative mb-2">
            <TextInput
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                value={passwordInput}
                onChangeText={setPasswordInput}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                className="bg-white/60 border border-white/80 rounded-2xl px-5 h-13 text-[#111] text-base pr-16"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-3.5"
            >
              <Text className="text-gray-400 text-[11px] font-black tracking-wider">
                {showPassword ? "HIDE" : "SHOW"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            className={`h-14 rounded-[22px] items-center justify-center mt-5 shadow-lg ${
              isLoading ? "bg-[#0a4d61] opacity-80" : "bg-[#139dc7]"
            }`}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color="white" size="small" />
                <Text className="text-white font-black text-sm uppercase tracking-widest">
                  Processing...
                </Text>
              </View>
            ) : (
              <Text className="text-white font-black text-sm uppercase tracking-widest">
                Enter Portal
              </Text>
            )}
          </TouchableOpacity>

          {/* Bottom links */}
          <View className="items-center mt-4 gap-2">
            <TouchableOpacity onPress={() => setShowRecoverModal(true)}>
              <Text className="text-sm font-bold text-[#139dc7]/60">Recover Account</Text>
            </TouchableOpacity>
            <Text className="text-[9px] text-gray-400">HealthSense Infrastructure v2.0</Text>
          </View>
        </View>

        {/* FOOTER */}
        <View className="items-center pb-6">
          <Text className="text-[9px] font-black uppercase tracking-[4px] text-[#139dc7] opacity-40">
            HealthSense Operations v2.0
          </Text>
        </View>
      </ScrollView>

      {/* RECOVERY MODAL */}
      <Modal visible={showRecoverModal} transparent animationType="fade">
        <View className="flex-1 bg-[#001b2e]/60 items-center justify-center px-5">
          <View className="bg-white w-full rounded-[36px] p-8 shadow-2xl">
            <Text className="text-2xl font-black text-[#139dc7] uppercase italic text-center mb-1 tracking-tight">
              Recover Access
            </Text>
            <Text className="text-[9px] font-black text-[#139dc7]/40 uppercase tracking-[3px] text-center mb-6">
              Identify your account
            </Text>

            <Text className="text-[9px] font-black text-[#139dc7]/40 uppercase tracking-widest ml-1 mb-1.5">
              Recovery Email Address
            </Text>
            <TextInput
              placeholder="example@email.com"
              placeholderTextColor="#9ca3af"
              value={recoveryEmailInput}
              onChangeText={setRecoveryEmailInput}
              keyboardType="email-address"
              autoCapitalize="none"
              className="border border-[#139dc7]/15 rounded-2xl px-5 h-13 text-[#0a4d61] mb-2"
            />

            {recoveryMessage.text ? (
              <View
                className={`p-3 rounded-2xl mt-2 border ${
                  recoveryMessage.type === "success"
                    ? "bg-green-50 border-green-100"
                    : "bg-red-50 border-red-100"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    recoveryMessage.type === "success" ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {recoveryMessage.type === "success" ? "✓  " : "⚠️  "}
                  {recoveryMessage.text}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleRecoverAccount}
              disabled={recoveryLoading}
              className="h-14 bg-[#139dc7] rounded-2xl items-center justify-center mt-5 shadow-lg"
              activeOpacity={0.85}
            >
              {recoveryLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-black uppercase tracking-widest text-sm">
                  Send Reset Link
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowRecoverModal(false);
                setRecoveryMessage({ type: "", text: "" });
                setRecoveryEmailInput("");
              }}
              className="h-12 items-center justify-center mt-2"
            >
              <Text className="text-xs font-bold text-[#139dc7]/40 uppercase tracking-widest">
                Back to Login
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}