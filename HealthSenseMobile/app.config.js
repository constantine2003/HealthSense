module.exports = {
  expo: {
    name: "HealthSense",
    slug: "HealthSenseMobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/healthsenselogo.png",
    userInterfaceStyle: "light",
    // splash removed — handled by animated JS splash in _layout.tsx
    ios: { supportsTablet: true },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/healthsenselogo.png",
        backgroundColor: "#1a73e8",
      },
      predictiveBackGestureEnabled: false,
      package: "com.anonymous.healthsensemobile",
    },
    web: { favicon: "./assets/healthsenselogo.png", bundler: "metro" },
    scheme: "healthsense",
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#1a73e8",
          "imageWidth": 0
        }
      ]
    ],
    extra: {
      router: {},
      eas: { projectId: "f05d4beb-5a28-4f95-b35f-40d97d780007" },
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY,
    },
    owner: "daniel.montesclaros",
  },
};