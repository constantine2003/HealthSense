module.exports = {
  expo: {
    name: "HealthSense",
    slug: "HealthSenseMobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/healthsense.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/healthsense.png",
      resizeMode: "contain",
      backgroundColor: "#eaf4ff",
    },
    ios: { supportsTablet: true },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/healthsense.png",
        backgroundColor: "#E6F4FE",
      },
      predictiveBackGestureEnabled: false,
      package: "com.anonymous.healthsensemobile",
    },
    web: { favicon: "./assets/healthsense.png", bundler: "metro" },
    scheme: "healthsense",
    plugins: ["expo-router"],
    extra: {
      router: {},
      eas: { projectId: "f05d4beb-5a28-4f95-b35f-40d97d780007" },
    },
    owner: "daniel.montesclaros",
  },
};