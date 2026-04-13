import "../global.css";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View, AppState } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import "react-native-url-polyfill/auto";

import SplashScreen from "../components/SplashScreen";
import { supabase } from "../utils/supabaseClient"; // ✅ FIX 1
import { Session } from "@supabase/supabase-js";   // ✅ FIX 2

// Hold native splash before any render
ExpoSplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  const router = useRouter(); // ✅ FIX 3

  // ✅ Startup check + auto refresh
  useEffect(() => {
  /**
   * Prepares the app by checking the current user session and redirecting to
   * the dashboard if the user is already logged in.
   * 
   * @returns {Promise<void>}
   */
    async function prepare() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          router.replace("/dashboard");
        }
      } catch (e) {
        console.warn("Startup error:", e);
      } finally {
        setAppReady(true); // ✅ FIX 4 (you forgot this)
      }
    }

    prepare();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    return () => sub.remove();
  }, []);

  // ✅ Auth listener (REAL FIX FOR LOGOUT ISSUE)
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event: string, session: Session | null) => { // ✅ FIX 5 (types)
        if (session?.user) {
          router.replace("/dashboard");
        } else {
          router.replace("/");
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
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
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});