/**
 * components/BottomNav.tsx
 *
 * Reusable bottom navigation bar for HealthSense.
 *
 * Layout:
 *   [Profile]  [Results]  [+ Trends]  [History]  [Logout]
 *
 * Usage — drop at the bottom of any screen:
 *   import BottomNav from "../components/BottomNav";
 *   ...
 *   <BottomNav onLogout={handleLogout} />
 *
 * Auto-highlights based on current Expo Router pathname.
 * Pass onLogout from your screen (call supabase.auth.signOut there).
 */

import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

interface Props {
  onLogout: () => Promise<void>;
}

type NavItem = {
  key: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  label: string;
  center?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    key: "profile",
    route: "/profile",
    icon: "person-outline",
    iconActive: "person",
    label: "Account",
  },
  {
    key: "results",
    route: "/results",
    icon: "document-text-outline",
    iconActive: "document-text",
    label: "Results",
  },
  // Center button will be handled dynamically below
  {
    key: "center",
    route: "", // Placeholder, not used
    icon: "",
    iconActive: "",
    label: "",
    center: true,
  },
  {
    key: "history",
    route: "/history",
    icon: "time-outline",
    iconActive: "time",
    label: "History",
  },
  {
    key: "logout",
    route: "",
    icon: "log-out-outline",
    iconActive: "log-out-outline",
    label: "Logout",
  },
];


export default function BottomNav({ onLogout }: Props) {
  const router   = useRouter();
  const pathname = usePathname();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut]           = useState(false);

  // Subtle scale animation for center button press
  const centerScale = useRef(new Animated.Value(1)).current;

  const pressCenterIn = () =>
    Animated.spring(centerScale, { toValue: 0.88, useNativeDriver: true, tension: 120, friction: 5 }).start();
  const pressCenterOut = () =>
    Animated.spring(centerScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 4 }).start();

  const handleLogoutConfirm = async () => {
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const isActive = (route: string) => {
    if (!route) return false;
    // Match exact or nested routes (e.g. /results/detail still highlights results)
    return pathname === route || pathname.startsWith(route + "/");
  };

  // Dynamic center button — Dashboard if not on dashboard, Trends if on dashboard
  const onDashboard = pathname === "/dashboard";
  const centerItem = onDashboard
    ? { route: "/trends",    icon: "analytics-outline" as const, iconActive: "analytics" as const,       label: "Trends"    }
    : { route: "/dashboard", icon: "home-outline" as const,      iconActive: "home" as const,            label: "Home"      };

  return (
    <>
      {/* ── NAV BAR ── */}
      <View style={styles.wrapper}>
        <View style={styles.bar}>
          {NAV_ITEMS.map((item) => {
            // ── Center button (dynamic logic) ──
            if (item.center) {
              const active = isActive(centerItem.route);
              return (
                <Animated.View
                  key={item.key}
                  style={[styles.centerWrapper, { transform: [{ scale: centerScale }] }]}
                >
                  <TouchableOpacity
                    onPress={() => router.push(centerItem.route as any)}
                    onPressIn={pressCenterIn}
                    onPressOut={pressCenterOut}
                    activeOpacity={1}
                    style={[
                      styles.centerButton,
                      active && styles.centerButtonActive,
                    ]}
                  >
                    <Ionicons
                      name={active ? centerItem.iconActive : centerItem.icon}
                      size={26}
                      color="#fff"
                    />
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.centerLabel,
                      active && { color: "#139dc7" },
                    ]}
                  >
                    {centerItem.label}
                  </Text>
                </Animated.View>
              );
            }

            // ── Logout button ──
            if (item.key === "logout") {
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => setShowLogoutModal(true)}
                  activeOpacity={0.7}
                  style={styles.navItem}
                >
                  <View style={styles.iconWrapper}>
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color="rgba(239,68,68,0.6)"
                    />
                  </View>
                  <Text style={[styles.label, { color: "rgba(239,68,68,0.55)" }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }

            // ── Regular nav items ──
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
                style={styles.navItem}
              >
                {/* Active indicator dot */}
                <View style={styles.iconWrapper}>
                  {isActive(item.route) && <View style={styles.activeDot} />}
                  <Ionicons
                    name={isActive(item.route) ? item.iconActive : item.icon}
                    size={20}
                    color={isActive(item.route) ? "#139dc7" : "rgba(19,157,199,0.35)"}
                  />
                </View>
                <Text
                  style={[
                    styles.label,
                    isActive(item.route) && styles.labelActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── LOGOUT WARNING MODAL ── */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            {/* Icon */}
            <View style={styles.modalIconWrapper}>
              <Ionicons name="log-out-outline" size={28} color="#139dc7" />
            </View>

            {/* Ghost icon */}
            <View style={styles.modalGhostIcon} pointerEvents="none">
              <Ionicons name="log-out-outline" size={120} color="#139dc7" />
            </View>

            {/* Label */}
            <Text style={styles.modalEyebrow}>Confirm Action</Text>

            {/* Title */}
            <Text style={styles.modalTitle}>Sign out?</Text>

            {/* Body */}
            <Text style={styles.modalBody}>
              You'll be returned to the login screen. Any unsaved state will be cleared.
            </Text>

            {/* Divider */}
            <View style={styles.modalDivider} />

            {/* Buttons */}
            <TouchableOpacity
              onPress={handleLogoutConfirm}
              disabled={loggingOut}
              activeOpacity={0.85}
              style={[styles.modalLogoutBtn, loggingOut && { opacity: 0.7 }]}
            >
              <Text style={styles.modalLogoutText}>
                {loggingOut ? "Signing out..." : "Yes, sign out"}
              </Text>
              {!loggingOut && (
                <View style={styles.modalBtnChevron}>
                  <Ionicons name="chevron-forward" size={10} color="white" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowLogoutModal(false)}
              activeOpacity={0.7}
              style={styles.modalCancelBtn}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // ── Bar ──
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    paddingTop: 4,
    backgroundColor: "2 ",  // matches app bg — no hard border line
  },
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    backgroundColor: "white",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 8,
    paddingVertical: 8,
    // Shadow
    shadowColor: "#139dc7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },

  // ── Regular nav item ──
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 2,
    gap: 3,
  },
  iconWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 32,
  },
  activeDot: {
    position: "absolute",
    top: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#139dc7",
  },
  label: {
    fontSize: 8,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "rgba(19,157,199,0.35)",
  },
  labelActive: {
    color: "#139dc7",
  },

  // ── Center floating button ──
  centerWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
    // Lift above the bar
    marginTop: -22,
    paddingBottom: 2,
    
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: "#139dc7",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#139dc7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 3,
    borderColor: "#eaf4ff",  // "punch-out" effect — matches page bg
  },
  centerButtonActive: {
    backgroundColor: "#0a4d61",
    shadowOpacity: 0.5,
  },
  centerLabel: {
    fontSize: 8,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "rgba(19,157,199,0.35)",
  },

  // ── Logout modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10,77,97,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 32,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    overflow: "hidden",
    shadowColor: "#139dc7",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  modalGhostIcon: {
    position: "absolute",
    bottom: -20,
    right: -20,
    opacity: 0.04,
  },
  modalIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "rgba(19,157,199,0.08)",
    borderWidth: 1,
    borderColor: "rgba(19,157,199,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalEyebrow: {
    fontSize: 8,
    fontWeight: "900",
    color: "rgba(19,157,199,0.4)",
    textTransform: "uppercase",
    letterSpacing: 3,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0a4d61",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(19,157,199,0.6)",
    lineHeight: 20,
    marginBottom: 20,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "rgba(19,157,199,0.1)",
    marginBottom: 20,
  },
  modalLogoutBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "#139dc7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
    shadowColor: "#139dc7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  modalLogoutText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  modalBtnChevron: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtn: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(19,157,199,0.4)",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
});