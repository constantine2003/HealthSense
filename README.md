# HealthSense Operation Project

HealthSense is a **health monitoring system** with a **React web dashboard**, a **SvelteKit kiosk application**, and a **React Native mobile app**.  
This README will guide you on how to set up, run, and test all projects.

---

## 🟢 A. Single Page Application - Kiosk (SvelteKit / TypeScript)

1. **Navigate to the kiosk project folder** `cd HealthSenseKiosk`

2. **Install dependencies** `npm install`  
*(or if you are using Yarn: `yarn install`)*

3. **Start the development server** `npm run dev`  

---

## 🟢 B. Web Dashboard (React)

1. **Navigate to the web project folder** `cd HealthSenseWeb`

2. **Install dependencies** `npm install`  
*(or if using Yarn: `yarn install`)*

3. **Start the development server** `npm run dev`  
This will open the web app in your default browser at `http://localhost:3000`.

4. **Build for production** `npm run build`  
The production-ready build will be created in the `/build` folder.

---

## 🟢 C. Web Dashboard 2.0 (React / TypeScript)

1. **Navigate to the web project folder** `cd HealthSenseWeb2.0`

2. **Install dependencies** `npm install`  
*(or if using Yarn: `yarn install`)*

3. **Start the development server** `npm run dev`  
This will open the web app in your default browser at `http://localhost:3000`.

4. **Build for production** `npm run build`  
The production-ready build will be created in the `/build` folder.

---

## 🟢 D. Mobile App (React Native / Expo)

1. **Navigate to the mobile project folder** `cd HealthSenseMobile`

2. **Install dependencies**  
```bash
npm install --legacy-peer-deps
```

3. **Start the Expo development server**  
```bash
npx expo start --clear
```

4. **Run on your phone**  
   - Install **Expo Go** from the App Store or Google Play  
   - Scan the QR code shown in the terminal with your phone camera  
   - The app will load automatically on your device

5. **Build for production** *(optional)*  
```bash
npx expo build:android
# or
npx expo build:ios
```

> **Note:** Requires **Node.js v18+** and **Expo CLI**. Install Expo CLI globally with `npm install -g expo-cli`.

---

## 📁 Project Structure

**HealthSenseKiosk** – SvelteKit (TypeScript) kiosk app
* `/components` → UI components
* `/pages`      → App screens
* `/services`   → API & database services
* `App.svelte`  → Main entry point

**HealthSenseWeb** – React (JavaScript) web dashboard
* `/components` → UI components
* `/pages`      → App pages
* `/services`   → API & database services
* `index.js`    → Main entry point

**HealthSenseWeb2.0** – React (TypeScript) web dashboard
* `/components` → UI components
* `/pages`      → App pages
* `/services`   → API & database services
* `index.js`    → Main entry point

**HealthSenseMobile** – React Native (TypeScript) mobile app via Expo
* `/app`              → App screens (Expo Router file-based navigation)
  * `_layout.tsx`     → Root layout & auth guard
  * `index.tsx`       → Login screen
  * `dashboard.tsx`   → Dashboard
  * `results.tsx`     → Latest checkup results
  * `history.tsx`     → Checkup history with filters
  * `profile.tsx`     → Account settings
* `/utils`
  * `supabaseClient.ts` → Supabase client (with AsyncStorage session)
  * `healthAnalysis.ts` → Rule-based health analysis engine (shared logic)
* `global.css`        → NativeWind (Tailwind) base styles
* `tailwind.config.js` → Tailwind configuration
* `babel.config.js`   → Babel configuration for NativeWind
* `metro.config.js`   → Metro bundler configuration

---

## ⚙️ Dynamic Data Notes

* All projects connect to **Supabase** as the backend database.
* **Health metrics include:** SpO2, Temperature, Height, Weight, BMI, Blood Pressure, Heart Rate.
* The mobile app supports **offline mode** — it caches the latest checkup and history records locally using AsyncStorage and displays them when there is no internet connection.
* Health metrics are rule-based and sourced from established clinical guidelines:
  * **ACC/AHA 2017** – Blood Pressure thresholds
  * **WHO / Asian-Pacific BMI Standards** – adjusted for Filipino/Asian populations
  * **American Thoracic Society** – SpO2 ranges
  * **AHA** – Heart Rate (bradycardia/tachycardia definitions)
  * **SIRS Criteria** – Sepsis screening

---

## 🛠 Common Commands

| Command | Description |
| :--- | :--- |
| `npm install` | Install dependencies (web/kiosk) |
| `npm install --legacy-peer-deps` | Install dependencies (mobile) |
| `npm run dev` | Run the development server (web or kiosk) |
| `npm run build` | Build production version (web or kiosk) |
| `npx expo start` | Start Expo development server (mobile) |
| `npx expo start --clear` | Start Expo with cleared cache (mobile) |

---

## 📌 Notes

* **Node.js v18+** is recommended for all projects.
* The mobile app uses **NativeWind v4** (Tailwind CSS for React Native) — same class names as the web app.
* Health metrics are dynamically calculated and color-coded across all platforms:
  * **Success (green)** → Normal / Excellent
  * **Warning (orange)** → Slightly abnormal
  * **Danger (red)** → Needs attention
* The `healthAnalysis.ts` utility is **shared** between the web and mobile projects — same logic, no changes needed.

---

## Group Members

1. **Daniel M. Montesclaros - Leader**
2. **Brendan Jay Condes**
3. **Raphael Osorio**
4. **Mark Ian Palacao**

---

## Acknowledgement

1. **Engr. Julian R. Semblante - Thesis Adviser**
2. **Cebu Institute of Technology - University**