# HealthSense Operation Project

HealthSense is a **health monitoring system** with a **React web dashboard** and a **SvelteKit kiosk application**.  
This README will guide you on how to set up, run, and test both projects.

---

## 🟢 A. Single Page Application - Kiosk (SvelteKit / TypeScript)

1. **Navigate to the mobile project folder** `cd HealthSenseKiosk`

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

## 🟢 C. Web Dashboard 2.0 (React + TypesScript)

1. **Navigate to the web project folder** `cd HealthSenseWeb2.0`

2. **Install dependencies** `npm install`  
*(or if using Yarn: `yarn install`)*

3. **Start the development server** `npm run dev`  
This will open the web app in your default browser at `http://localhost:3000`.

4. **Build for production** `npm run build`  
The production-ready build will be created in the `/build` folder.

---

## 📁 Project Structure

**HealthSenseKiosk** – SvelteKit (TypeScript) mobile app
* `/components` -> UI components
* `/pages`    -> App screens
* `/services`   -> API & database services
* `App.svelte`     -> Main entry point

**HealthSenseWeb** – React (JavaScript) web dashboard
* `/components` -> UI components
* `/pages`      -> App pages
* `/services`   -> API & database services
* `index.js`    -> Main entry point

**HealthSenseWeb2.0** – React (TypeScript) web dashboard
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
| `npm run dev` | Run the development server (web or kiosk) |
| `npm run build` | Build production version (web or kiosk) |

---

## 📌 Notes

* **Node.js v18+** is recommended.
* Health metrics are dynamically calculated and color-coded:
    * **Success (green)** → Normal / Excellent
    * **Warning (orange)** → Slightly abnormal
    * **Danger (red)** → Needs attention

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

