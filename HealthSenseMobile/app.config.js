module.exports = {
  expo: {
    name: "HealthSense",
    slug: "HealthSenseMobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/logo.png",
    userInterfaceStyle: "light",
    ios: { supportsTablet: true },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/logo.png",
        backgroundColor: "#FFFFFF",
      },
      predictiveBackGestureEnabled: false,
      package: "com.anonymous.healthsensemobile",
    },
    web: { favicon: "./assets/logo.png", bundler: "metro" },
    scheme: "healthsense",
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#FFFFFF",
          image: "./assets/logo.png",
          imageWidth: 180,
          resizeMode: "contain",
          dark: {
            backgroundColor: "#FFFFFF",
            image: "./assets/logo.png"
          }
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