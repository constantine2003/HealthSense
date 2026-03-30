import "../global.css";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import "react-native-url-polyfill/auto";
import { AppState } from "react-native";

import SplashScreen from "../components/SplashScreen";
import { supabase } from "../utils/supabaseClient";

ExpoSplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function prepare() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          router.replace("/dashboard");
        }
        // no session → stays on login (default route)
      } catch (e) {
        console.warn("Startup error:", e);
      } finally {
        setAppReady(true);
      }
    }
    prepare();

    // Keep token refreshed when app comes to foreground
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    return () => sub.remove();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await ExpoSplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) return null;

  return (
    <View style={styles.root} onLayout={onLayoutRootView}>
      <Stack screenOptions={{ headerShown: false }} />
      {showAnimatedSplash && (
        <SplashScreen onFinish={() => setShowAnimatedSplash(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});