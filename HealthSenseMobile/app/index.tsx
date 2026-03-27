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
        loginEmail = userInput.includes("@")
          ? userInput
          : `${userInput}@kiosk.local`;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-[#eaf4ff]"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        
        {/* HEADER */}
        <View className="px-6 pt-14 pb-4 flex-row justify-between items-center">
          <View>
            <Text className="text-2xl font-black text-[#139dc7] uppercase tracking-tighter">
              HealthSense
            </Text>
            <Text className="text-[10px] font-bold text-[#34A0A4] uppercase tracking-widest">
              Patient Portal
            </Text>
          </View>
          <View className="flex-row items-center gap-2 px-3 py-1.5 bg-white/60 rounded-full border border-white/60">
            <View className="w-5 h-5 bg-[#139dc7] rounded-full items-center justify-center">
              <Text className="text-white text-[10px] font-black">✓</Text>
            </View>
            <Text className="text-[10px] font-black text-[#139dc7] uppercase tracking-wide">
              Portal Login v2.0
            </Text>
          </View>
        </View>

        {/* BRANDING */}
        <View className="items-center px-6 pt-6 pb-2">
          <Text className="text-lg font-bold text-[#139dc7] opacity-90">Welcome to</Text>
          <Text className="text-7xl font-black text-[#139dc7] italic leading-tight">
            HealthSense
          </Text>
          <Text className="text-sm text-[#139dc7] opacity-60 text-center mt-2 leading-relaxed px-4">
            View your personal health checkup results securely, privately, and conveniently.
          </Text>
        </View>

        {/* LOGIN CARD */}
        <View className="mx-6 mt-6 mb-10 bg-white/50 rounded-[32px] border border-white/60 p-8 shadow-lg">
          
          <View className="items-center mb-6">
            <Text className="text-4xl font-light text-[#139dc7] tracking-tight">Login</Text>
            <Text className="text-[10px] font-black text-[#139dc7]/40 uppercase tracking-widest mt-1">
              Secure Access
            </Text>
          </View>

          {loginError ? (
            <View className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 mb-4">
              <Text className="text-red-600 text-xs font-bold text-center">{loginError}</Text>
            </View>
          ) : null}

          {/* Username */}
          <View className="mb-4">
            <Text className="text-[10px] font-black text-[#139dc7] uppercase tracking-widest ml-1 mb-1">
              Patient ID / Username
            </Text>
            <TextInput
              placeholder="firstname.lastname"
              placeholderTextColor="#9ca3af"
              value={emailInput}
              onChangeText={setEmailInput}
              autoCapitalize="none"
              className="bg-white/70 border border-white/80 rounded-2xl px-5 h-14 text-[#111] text-base"
            />
          </View>

          {/* Password */}
          <View className="mb-6">
            <Text className="text-[10px] font-black text-[#139dc7] uppercase tracking-widest ml-1 mb-1">
              Password
            </Text>
            <View className="relative">
              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                value={passwordInput}
                onChangeText={setPasswordInput}
                secureTextEntry={!showPassword}
                className="bg-white/70 border border-white/80 rounded-2xl px-5 h-14 text-[#111] text-base pr-14"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4"
              >
                <Text className="text-gray-400 text-sm font-bold">
                  {showPassword ? "HIDE" : "SHOW"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            className={`h-14 rounded-[22px] items-center justify-center shadow-lg ${
              isLoading ? "bg-[#0a4d61] opacity-80" : "bg-[#139dc7]"
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-black text-base uppercase tracking-widest">
                Enter Portal
              </Text>
            )}
          </TouchableOpacity>

          {/* Recover */}
          <TouchableOpacity
            onPress={() => setShowRecoverModal(true)}
            className="mt-4 items-center"
          >
            <Text className="text-sm font-bold text-[#139dc7]/60">Recover Account</Text>
          </TouchableOpacity>

          <Text className="text-[9px] text-gray-400 text-center mt-3">
            HealthSense Infrastructure v2.0
          </Text>
        </View>
      </ScrollView>

      {/* RECOVERY MODAL */}
      <Modal visible={showRecoverModal} transparent animationType="fade">
        <View className="flex-1 bg-[#001b2e]/60 items-center justify-center px-6">
          <View className="bg-white w-full rounded-[32px] p-8 shadow-2xl">
            
            <Text className="text-2xl font-black text-[#139dc7] uppercase text-center mb-1">
              Recover Access
            </Text>
            <Text className="text-[10px] font-black text-[#139dc7]/40 uppercase tracking-widest text-center mb-6">
              Identify your account
            </Text>

            <Text className="text-[10px] font-black text-[#139dc7]/40 uppercase tracking-widest ml-1 mb-1">
              Recovery Email Address
            </Text>
            <TextInput
              placeholder="example@email.com"
              placeholderTextColor="#9ca3af"
              value={recoveryEmailInput}
              onChangeText={setRecoveryEmailInput}
              keyboardType="email-address"
              autoCapitalize="none"
              className="border border-[#139dc7]/20 rounded-2xl px-5 h-14 text-[#0a4d61] mb-4"
            />

            {recoveryMessage.text ? (
              <View
                className={`p-3 rounded-2xl mb-4 ${
                  recoveryMessage.type === "success"
                    ? "bg-green-50 border border-green-100"
                    : "bg-red-50 border border-red-100"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    recoveryMessage.type === "success" ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {recoveryMessage.type === "success" ? "✓ " : "⚠️ "}
                  {recoveryMessage.text}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleRecoverAccount}
              disabled={recoveryLoading}
              className="h-14 bg-[#139dc7] rounded-2xl items-center justify-center mb-3 shadow-lg"
            >
              {recoveryLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-black uppercase tracking-widest">
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
              className="h-12 items-center justify-center"
            >
              <Text className="text-xs font-bold text-[#139dc7]/40 uppercase">
                Back to Login
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}