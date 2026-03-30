import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  Modal, ScrollView, KeyboardAvoidingView, Platform,
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

  // Shared input style — use fixed height via style prop, NOT className h-13
  const inputStyle = {
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#111',
  }

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
        <View className="flex-row justify-between items-center px-6 pt-5 pb-3">
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
        <View style={{
          marginHorizontal: 20,
          marginTop: 20,
          marginBottom: 32,
          backgroundColor: 'white',
          borderRadius: 36,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.5)',
          padding: 28,
          shadowColor: '#139dc7',
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 4,
          overflow: 'hidden',
        }}>

          {/* Card header */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Text className="text-4xl font-light text-[#139dc7] tracking-tight">Login</Text>
            <Text className="text-[9px] font-black text-[#139dc7]/40 uppercase tracking-[3px] mt-1">
              Secure Access
            </Text>
          </View>

          {/* Error */}
          {loginError ? (
            <View style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 16 }}>
              <Text style={{ color: '#dc2626', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>{loginError}</Text>
            </View>
          ) : null}

          {/* Username */}
          <Text style={{ fontSize: 9, fontWeight: '900', color: '#139dc7', textTransform: 'uppercase', letterSpacing: 2, marginLeft: 4, marginBottom: 6 }}>
            Patient ID / Username
          </Text>
          <TextInput
            placeholder="firstname.lastname"
            placeholderTextColor="#9ca3af"
            value={emailInput}
            onChangeText={setEmailInput}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            keyboardType="email-address"
            style={[
              inputStyle,
              {
                marginBottom: 16,
                backgroundColor: 'rgba(19,157,199,0.08)', // subtle blue tint
                borderColor: '#139dc7',
                borderWidth: 1.2,
              },
            ]}
          />

          {/* Password */}
          <Text style={{ fontSize: 9, fontWeight: '900', color: '#139dc7', textTransform: 'uppercase', letterSpacing: 2, marginLeft: 4, marginBottom: 6 }}>
            Password
          </Text>
          <View style={{ marginBottom: 8 }}>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              value={passwordInput}
              onChangeText={setPasswordInput}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              style={[
                inputStyle,
                {
                  paddingRight: 64,
                  backgroundColor: 'rgba(19,157,199,0.08)',
                  borderColor: '#139dc7',
                  borderWidth: 1.2,
                },
              ]}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: 16, top: '50%', transform: [{ translateY: -12 }], height: 24, justifyContent: 'center' }}
            >
              <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: '900', letterSpacing: 1 }}>
                {showPassword ? "HIDE" : "SHOW"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            style={{
              height: 56,
              borderRadius: 22,
              marginTop: 20,
              marginBottom: 15,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isLoading ? '#0a4d61' : '#139dc7',
              opacity: isLoading ? 0.8 : 1,
              shadowColor: '#139dc7',
              shadowOpacity: 0.18,
              shadowRadius: 8,
              elevation: 3,
            }}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator color="white" size="small" />
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, marginLeft: 8 }}>
                  Processing...
                </Text>
              </View>
            ) : (
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 2 }}>
                Enter Portal
              </Text>
            )}
          </TouchableOpacity>

          {/* Bottom links */}
          <View style={{ alignItems: 'center', marginTop: 15 }}>
            <TouchableOpacity onPress={() => setShowRecoverModal(true)} style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#139dc7', opacity: 0.6 }}>Recover Account</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 9, color: '#9ca3af' }}>HealthSense Infrastructure v2.0</Text>
          </View>
        </View>

        {/* FOOTER */}
        {/* <View className="items-center pb-6">
          <Text className="text-[9px] font-black uppercase tracking-[4px] text-[#139dc7] opacity-40">
            HealthSense Operations v2.0
          </Text>
        </View> */}
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
              autoCapitalize="none"        // ← fix
              autoCorrect={false}
              spellCheck={false}
              style={{
                height: 52,
                borderColor: 'rgba(19,157,199,0.15)',
                borderWidth: 1,
                borderRadius: 16,
                paddingHorizontal: 20,
                fontSize: 16,
                color: '#0a4d61',
                marginBottom: 8,
              }}
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
              style={{ height: 56, borderRadius: 16, marginTop: 20 }}
              className="bg-[#139dc7] items-center justify-center shadow-lg"
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
              style={{ height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 }}
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