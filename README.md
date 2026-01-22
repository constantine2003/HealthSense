HealthSense Project

HealthSense is a **health monitoring system** with a **React web dashboard** and a **React Native mobile app**.  
This README will guide you on how to set up, run, and test both projects.

---

## 🟢 A. Mobile App (React Native / TypeScript)

1. **Navigate to the mobile project folder** `cd HealthSenseMobile`

2. **Install dependencies** `npm install`  
*(or if you are using Yarn: `yarn install`)*

3. **Start the development server** `npm start`  
This will open the Expo developer tools in your browser.

4. **Run the app on a device or emulator** * **iOS Simulator:** Press `i` in the terminal (macOS + Xcode required)
* **Android Emulator:** Press `a` in the terminal (Android Studio + emulator required)
* **Physical Device:** Scan the QR code in Expo Go app

5. **Build the app for production (optional)** `expo build:android`  
`expo build:ios`

> ⚠️ **Note:** Make sure you have Expo CLI installed globally:  
> `npm install -g expo-cli`

---

## 🟢 B. Web Dashboard (React)

1. **Navigate to the web project folder** `cd HealthSenseWeb`

2. **Install dependencies** `npm install`  
*(or if using Yarn: `yarn install`)*

3. **Start the development server** `npm start`  
This will open the web app in your default browser at `http://localhost:3000`.

4. **Build for production** `npm run build`  
The production-ready build will be created in the `/build` folder.

---

## 📁 Project Structure

**HealthSenseMobile** – React Native (TypeScript) mobile app
* `/components` -> UI components
* `/screens`    -> App screens
* `/services`   -> API & database services
* `App.tsx`     -> Main entry point

**HealthSenseWeb** – React (JavaScript) web dashboard
* `/components` -> UI components
* `/pages`      -> App pages
* `/services`   -> API & database services
* `index.js`    -> Main entry point

---

## ⚙️ Dynamic Data Notes

* The project currently uses **mock data** for testing.
* In the future, replace the mock functions with **Supabase queries** to fetch real user health data.
* **Health metrics include:** SpO2, Temperature, Height, Weight, BMI, Blood Pressure.

---

## 🛠 Common Commands

| Command | Description |
| :--- | :--- |
| `npm install` | Install dependencies |
| `npm start` | Run the development server (web or mobile) |
| `npm run build` | Build production version (web) |
| `expo start` | Start Expo dev tools (mobile) |

---

## 📌 Notes

* **Node.js v18+** is recommended.
* Ensure your mobile environment has **Expo CLI** installed.
* Health metrics are dynamically calculated and color-coded:
    * **Success (green)** → Normal / Excellent
    * **Warning (orange)** → Slightly abnormal
    * **Danger (red)** → Needs attention
