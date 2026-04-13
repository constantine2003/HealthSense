/**
 * components/SplashScreen.tsx
 *
 * HealthSense splash — matches index.tsx style:
 * - #eaf4ff background (not a bold gradient)
 * - Frosted glass logo card (same as login/dashboard cards)
 * - #139dc7 / #0a4d61 color system
 * - font-black uppercase tracking — same typography DNA
 * - Facebook-style logo pulse animation
 */

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  const logoScale     = useRef(new Animated.Value(0.3)).current;
  const logoOpacity   = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Logo pops in with spring
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),

      // 2. Facebook-style pulse
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 0.93,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 80,
          friction: 4,
          useNativeDriver: true,
        }),
      ]),

      // 3. Tagline fades in after logo settles
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),

      // 4. Hold
      Animated.delay(700),

      // 5. Fade out
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Subtle decorative blobs — same opacity as index.tsx background feel */}
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      {/* Frosted glass card — same as login card & dashboard cards */}
      <Animated.View
        style={[
          styles.card,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require("../assets/favicon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* App name — same font-black uppercase tracking as index header */}
      <Animated.Text
        style={[styles.appName, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
      >
        HealthSense
      </Animated.Text>

      {/* Tagline — same [7px] tracking-widest style as header sub-label */}
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Patient Portal
      </Animated.Text>

      {/* Divider — same as welcome block's h-px bg-[#139dc7]/20 */}
      <Animated.View style={[styles.divider, { opacity: taglineOpacity }]} />

      {/* Version — same footer text style */}
      <Animated.Text style={[styles.version, { opacity: taglineOpacity }]}>
        HealthSense Operations v2.0
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999,
    elevation: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eaf4ff",       // exact same as index.tsx bg
  },

  // Soft blobs — very subtle, same feel as the index background
  blobTopRight: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(19,157,199,0.07)",
  },
  blobBottomLeft: {
    position: "absolute",
    bottom: -80,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(19,157,199,0.05)",
  },

  // Frosted glass card — same as bg-white/60 border border-white/80 rounded-3xl
  card: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 32,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    shadowColor: "#139dc7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  logo: {
    width: 96,
    height: 96,
  },

  // Same as index.tsx: text-xs font-black text-[#139dc7] uppercase tracking-tight
  appName: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "900",
    color: "#139dc7",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Same as index.tsx: text-[7px] font-bold text-[#34A0A4] uppercase tracking-widest
  tagline: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: "700",
    color: "#34A0A4",
    textTransform: "uppercase",
    letterSpacing: 4,
  },

  // Same as welcome block: h-px bg-[#139dc7]/20
  divider: {
    width: 40,
    height: 1,
    backgroundColor: "rgba(19,157,199,0.2)",
    marginTop: 20,
  },

  // Same as footer text in index
  version: {
    marginTop: 12,
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(19,157,199,0.35)",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
});