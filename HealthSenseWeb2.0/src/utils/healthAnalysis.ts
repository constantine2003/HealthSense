// ─────────────────────────────────────────────────────────────────────────────
// src/utils/healthAnalysis.ts
// Rule-based health analysis engine for HealthSense.
// Pure TypeScript — no React, no Supabase, no side effects.
// ─────────────────────────────────────────────────────────────────────────────

export type RiskLevel = "low" | "moderate" | "high";

export interface HealthInput {
  oxygen: string;   // SpO2 %
  temp: string;     // body temperature in °C
  height: string;   // height in cm
  weight: string;   // weight in kg
  bmi: string;      // pre-calculated BMI
  bp: string;       // "systolic/diastolic" mmHg
}

export interface Condition {
  name: string;
  nameTagalog: string;
  explanation: string;
  explanationTagalog: string;
  risk: RiskLevel;
  relatedVitals: string[];
  category: "respiratory" | "cardiovascular" | "metabolic" | "neurological" | "temperature" | "combination";
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export function analyzeHealth(record: HealthInput): Condition[] {
  const conditions: Condition[] = [];

  // Parse all vitals up front
  const spo2    = Number(record.oxygen);
  const temp    = Number(record.temp);
  const bmi     = Number(record.bmi);
  const weight  = Number(record.weight);
  const heightM = Number(record.height) / 100;

  const validSpo2   = !isNaN(spo2)   && spo2   > 0;
  const validTemp   = !isNaN(temp)   && temp   > 0;
  const validBmi    = !isNaN(bmi)    && bmi    > 0;
  const validWeight = !isNaN(weight) && weight > 0;
  const validHeight = !isNaN(heightM) && heightM > 0;

  let systolic = 0, diastolic = 0;
  const validBP = record.bp?.includes("/") && !record.bp.includes("--");
  if (validBP) {
    [systolic, diastolic] = record.bp.split("/").map(Number);
  }

  // ─── BMI re-derive if needed ───────────────────────────────────────────────
  const derivedBmi = (validWeight && validHeight)
    ? weight / (heightM * heightM)
    : bmi;

  // ─── Pulse Pressure (systolic - diastolic) ────────────────────────────────
  const pulsePressure = validBP ? systolic - diastolic : 0;

  // ─── Mean Arterial Pressure ───────────────────────────────────────────────
  const map = validBP ? diastolic + pulsePressure / 3 : 0;


  // ═══════════════════════════════════════════════════════════════════════════
  // 1. SPO2 — OXYGEN SATURATION
  // ═══════════════════════════════════════════════════════════════════════════
  if (validSpo2) {
    if (spo2 < 90) {
      conditions.push({
        name: "Severe Hypoxemia",
        nameTagalog: "Matinding Kakulangan ng Oksiheno sa Dugo",
        explanation: "SpO2 below 90% is critically low — a medical emergency. The body's organs are not receiving enough oxygen to function. Possible causes include severe pneumonia, acute respiratory distress syndrome (ARDS), pulmonary embolism, heart failure, or near-drowning. Requires immediate oxygen therapy and emergency care.",
        explanationTagalog: "Ang SpO2 na mas mababa sa 90% ay kritikal na mababa — isang medikal na emerhensya. Hindi nakatatanggap ng sapat na oksiheno ang mga organ ng katawan. Posibleng sanhi: matinding pneumonia, ARDS, pulmonary embolism, o heart failure. Kailangan ng agarang oksiheno therapy at medikal na tulong.",
        risk: "high",
        relatedVitals: ["SpO2"],
        category: "respiratory"
      });
    } else if (spo2 < 95) {
      conditions.push({
        name: "Mild Hypoxemia",
        nameTagalog: "Banayad na Kakulangan ng Oksiheno",
        explanation: "SpO2 of 90–94% suggests mildly reduced oxygen saturation. Common causes include respiratory infections (pneumonia, bronchitis), asthma exacerbation, COPD, high-altitude exposure, or anemia. The body is compensating but monitoring and medical evaluation are advised.",
        explanationTagalog: "Ang SpO2 na 90–94% ay nagpapakita ng bahagyang pagbaba ng oxygen saturation. Karaniwan itong sanhi ng impeksyon sa paghinga, asthma, COPD, o anemia. Nangangailangan ng pagmamatyag at medikal na pagsusuri.",
        risk: "moderate",
        relatedVitals: ["SpO2"],
        category: "respiratory"
      });
    } else if (spo2 < 97) {
      conditions.push({
        name: "Suboptimal Oxygen Saturation",
        nameTagalog: "Bahagyang Mababang Oxygen Saturation",
        explanation: "SpO2 of 95–96% is acceptable but below the ideal 97–100% range. May indicate mild fatigue, shallow breathing, mild airway congestion, or early-stage respiratory compromise. No immediate action needed, but persistent readings warrant evaluation.",
        explanationTagalog: "Ang SpO2 na 95–96% ay katanggap-tanggap ngunit mas mababa sa ideal na 97–100%. Maaaring nagpapakita ng pagod, mababaw na paghinga, o mahinang congestion. Hindi kailangang kumilos agad ngunit dapat bantayan.",
        risk: "low",
        relatedVitals: ["SpO2"],
        category: "respiratory"
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. TEMPERATURE
  // ═══════════════════════════════════════════════════════════════════════════
  if (validTemp) {
    if (temp < 32) {
      conditions.push({
        name: "Severe Hypothermia",
        nameTagalog: "Matinding Hypothermia",
        explanation: "Core body temperature below 32°C is severe hypothermia — a life-threatening emergency. The heart, lungs, and nervous system begin to fail. Causes include prolonged cold exposure, immersion in cold water, or extreme exhaustion. Active rewarming and emergency care are critical.",
        explanationTagalog: "Ang temperatura ng katawan na mas mababa sa 32°C ay matinding hypothermia — isang buhay na mapanganib na emerhensya. Nagsisimulang mabigo ang puso, baga, at nervous system. Kailangan ng agarang pag-init at medikal na tulong.",
        risk: "high",
        relatedVitals: ["Temperature"],
        category: "temperature"
      });
    } else if (temp < 35) {
      conditions.push({
        name: "Hypothermia",
        nameTagalog: "Hypothermia",
        explanation: "Body temperature of 32–35°C indicates hypothermia. The body is losing heat faster than it generates it, leading to shivering, confusion, and slowed heart rate. Associated with prolonged cold exposure, wet clothing, alcohol use, or inadequate nutrition. Requires rewarming and monitoring.",
        explanationTagalog: "Ang temperatura na 32–35°C ay nagpapakita ng hypothermia. Nawawalan ng init ang katawan nang mas mabilis kaysa sa ginagawa nito, na nagdudulot ng panginginig, pagkalito, at mabagal na tibok ng puso. Kailangan ng pag-init at pagmamatyag.",
        risk: "high",
        relatedVitals: ["Temperature"],
        category: "temperature"
      });
    } else if (temp < 36.1) {
      conditions.push({
        name: "Low Body Temperature",
        nameTagalog: "Mababang Temperatura ng Katawan",
        explanation: "Temperature of 35–36.1°C is slightly below the normal range of 36.1–37.2°C. Possible causes include hypothyroidism, low blood sugar (hypoglycemia), poor circulation, or simply a cool environment. If persistent, a thyroid function test is recommended.",
        explanationTagalog: "Ang temperatura na 35–36.1°C ay bahagyang mas mababa sa normal na 36.1–37.2°C. Posibleng sanhi: hypothyroidism, mababang asukal sa dugo, mahinang sirkulasyon, o malamig na kapaligiran. Kung paulit-ulit, inirerekomenda ang thyroid function test.",
        risk: "low",
        relatedVitals: ["Temperature"],
        category: "temperature"
      });
    } else if (temp > 37.2 && temp <= 38.0) {
      conditions.push({
        name: "Low-Grade Fever",
        nameTagalog: "Banayad na Lagnat",
        explanation: "Temperature of 37.2–38.0°C is a low-grade fever. The immune system is actively responding to something. Common causes include viral infections (flu, COVID-19, dengue), bacterial infections, inflammatory disorders, or a reaction to vaccination or medication.",
        explanationTagalog: "Ang temperatura na 37.2–38.0°C ay banayad na lagnat. Aktibo ang immune system sa pagtugon sa isang bagay. Karaniwan itong sanhi ng viral infections (trangkaso, COVID-19, dengue), bacterial infections, o reaksyon sa bakuna.",
        risk: "low",
        relatedVitals: ["Temperature"],
        category: "temperature"
      });
    } else if (temp > 38.0 && temp <= 39.0) {
      conditions.push({
        name: "Moderate Fever",
        nameTagalog: "Katamtamang Lagnat",
        explanation: "Temperature of 38–39°C indicates moderate fever. Common triggers include influenza, urinary tract infections, tonsillitis, dengue fever, typhoid, or COVID-19. Fever at this level can cause dehydration, headache, and body aches. Oral rehydration and antipyretics are recommended; see a doctor if fever persists beyond 3 days.",
        explanationTagalog: "Ang temperatura na 38–39°C ay katamtamang lagnat. Karaniwan itong sanhi ng trangkaso, UTI, tonsillitis, dengue, typhoid, o COVID-19. Ang lagnat sa antas na ito ay maaaring magdulot ng dehydration, sakit ng ulo, at pananakit ng katawan. Inirerekomenda ang oral rehydration at antipyretics.",
        risk: "moderate",
        relatedVitals: ["Temperature"],
        category: "temperature"
      });
    } else if (temp > 39.0 && temp <= 40.0) {
      conditions.push({
        name: "High Fever",
        nameTagalog: "Mataas na Lagnat",
        explanation: "Temperature of 39–40°C is high fever. At this level, febrile seizures are possible especially in young children. Associated with severe bacterial infections, septicemia, malaria, dengue hemorrhagic fever, or serious inflammatory disease. Immediate cooling measures and medical evaluation are advised.",
        explanationTagalog: "Ang temperatura na 39–40°C ay mataas na lagnat. Sa antas na ito, posible ang febrile seizures lalo na sa mga bata. Nauugnay sa matinding bacterial infections, septicemia, malaria, dengue hemorrhagic fever. Inirerekomenda ang agarang pagpapalamig at medikal na pagsusuri.",
        risk: "moderate",
        relatedVitals: ["Temperature"],
        category: "temperature"
      });
    } else if (temp > 40.0) {
      conditions.push({
        name: "Hyperpyrexia",
        nameTagalog: "Sobrang Mataas na Lagnat (Hyperpyrexia)",
        explanation: "Temperature above 40°C is hyperpyrexia — a medical emergency. At this temperature, proteins in the body begin to denature and brain damage can occur. Causes include sepsis, bacterial meningitis, heat stroke, or severe drug reactions. Call emergency services immediately.",
        explanationTagalog: "Ang temperatura na higit sa 40°C ay hyperpyrexia — isang medikal na emerhensya. Sa temperatura na ito, nagsisimulang ma-denature ang mga protina sa katawan at maaaring mangyari ang pinsala sa utak. Tumawag agad ng emergency services.",
        risk: "high",
        relatedVitals: ["Temperature"],
        category: "temperature"
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. BMI / WEIGHT
  // ═══════════════════════════════════════════════════════════════════════════
  const bmiToUse = validBmi ? bmi : derivedBmi;

  if (!isNaN(bmiToUse) && bmiToUse > 0) {
    if (bmiToUse < 15) {
      conditions.push({
        name: "Severe Emaciation",
        nameTagalog: "Matinding Pagkakasakit sa Timbang",
        explanation: "BMI below 15 indicates severe emaciation. This is a critical level of underweight associated with anorexia nervosa, severe malnutrition, advanced cancer, AIDS wasting syndrome, or extreme chronic illness. Cardiac arrhythmias, multi-organ failure, and immune collapse are immediate risks. Urgent medical intervention is required.",
        explanationTagalog: "Ang BMI na mas mababa sa 15 ay nagpapakita ng matinding pagkakasakit sa timbang. Ito ay kritikal na antas na nauugnay sa anorexia nervosa, matinding malnutrition, o chronic illness. Kailangan ng agarang medikal na interbensyon.",
        risk: "high",
        relatedVitals: ["BMI", "Weight"],
        category: "metabolic"
      });
    } else if (bmiToUse < 16) {
      conditions.push({
        name: "Severe Underweight",
        nameTagalog: "Matinding Pagkakulang ng Timbang",
        explanation: "BMI of 15–16 is severely underweight. This significantly raises risk of malnutrition, bone density loss (osteoporosis), anemia, immune system suppression, and cardiovascular complications including arrhythmia. Medical evaluation and a structured nutritional plan are strongly advised.",
        explanationTagalog: "Ang BMI na 15–16 ay matinding kulang sa timbang. Malaki itong nagpapataas ng panganib ng malnutrition, pagkawala ng bone density, anemia, at cardiovascular complications. Inirerekomenda ang medikal na pagsusuri at nutritional plan.",
        risk: "high",
        relatedVitals: ["BMI", "Weight"],
        category: "metabolic"
      });
    } else if (bmiToUse < 18.5) {
      conditions.push({
        name: "Underweight",
        nameTagalog: "Kulang sa Timbang",
        explanation: "BMI of 16–18.5 is underweight. Possible causes include nutritional deficiency, hyperthyroidism, Crohn's disease, celiac disease, diabetes, depression, or high metabolic rate. Risks include fatigue, hair loss, weakened immunity, and fertility issues. A dietary assessment is recommended.",
        explanationTagalog: "Ang BMI na 16–18.5 ay kulang sa timbang. Posibleng sanhi: kakulangan ng nutrisyon, hyperthyroidism, Crohn's disease, celiac disease, o diabetes. Inirerekomenda ang dietary assessment.",
        risk: "moderate",
        relatedVitals: ["BMI", "Weight"],
        category: "metabolic"
      });
    } else if (bmiToUse >= 23 && bmiToUse < 25) {
      // Asian-adjusted overweight threshold
      conditions.push({
        name: "Approaching Overweight (Asian Standard)",
        nameTagalog: "Papalapit sa Sobrang Timbang (Asian Standard)",
        explanation: "BMI of 23–24.9 is within the normal global range but crosses the Asian-population threshold for increased metabolic risk. Philippine and Asian clinical guidelines flag this range as 'at-risk' due to higher body fat percentage at lower BMI. Modest dietary adjustments and regular physical activity are advisable.",
        explanationTagalog: "Ang BMI na 23–24.9 ay nasa normal na global range ngunit lumagpas na sa Asian-population threshold para sa pagtaas ng metabolic risk. Ang mga Philippine at Asian na clinical guidelines ay itinuturing na 'at-risk' ang ranggo na ito. Inirerekomenda ang pagbabago ng diyeta at regular na ehersisyo.",
        risk: "low",
        relatedVitals: ["BMI", "Weight"],
        category: "metabolic"
      });
    } else if (bmiToUse >= 25 && bmiToUse < 27.5) {
      conditions.push({
        name: "Overweight",
        nameTagalog: "Sobra ang Timbang",
        explanation: "BMI of 25–27.5 is overweight. This increases long-term risk of type 2 diabetes, hypertension, dyslipidemia, non-alcoholic fatty liver disease (NAFLD), sleep apnea, and cardiovascular disease. Losing 5–10% of body weight through diet and exercise significantly reduces these risks.",
        explanationTagalog: "Ang BMI na 25–27.5 ay sobra ang timbang. Nagdadala ito ng mas mataas na panganib ng diabetes, hypertension, NAFLD, sleep apnea, at cardiovascular disease. Ang pagbaba ng 5–10% ng timbang sa pamamagitan ng diyeta at ehersisyo ay malaki ang tulong.",
        risk: "low",
        relatedVitals: ["BMI", "Weight"],
        category: "metabolic"
      });
    } else if (bmiToUse >= 27.5 && bmiToUse < 30) {
      conditions.push({
        name: "Moderate Overweight",
        nameTagalog: "Katamtamang Labis na Timbang",
        explanation: "BMI of 27.5–30 is moderate overweight. Risk of metabolic syndrome, insulin resistance, type 2 diabetes, and cardiovascular events increases meaningfully at this level. By Asian-Pacific guidelines this is already classified as pre-obese. Structured weight management intervention is recommended.",
        explanationTagalog: "Ang BMI na 27.5–30 ay katamtamang labis na timbang. Ang panganib ng metabolic syndrome, insulin resistance, at cardiovascular events ay kapansin-pansing tumaas. Sa Asian-Pacific guidelines, ito ay itinuturing nang pre-obese. Inirerekomenda ang structured weight management intervention.",
        risk: "moderate",
        relatedVitals: ["BMI", "Weight"],
        category: "metabolic"
      });
    } else if (bmiToUse >= 30 && bmiToUse < 35) {
      conditions.push({
        name: "Obesity Class I",
        nameTagalog: "Labis na Taba — Klase I",
        explanation: "BMI of 30–35 is Class I obesity. Strongly associated with type 2 diabetes, hypertension, obstructive sleep apnea, GERD, osteoarthritis, polycystic ovary syndrome (PCOS), and a 2–3× increase in cardiovascular risk. Medical, dietary, and exercise intervention is advisable.",
        explanationTagalog: "Ang BMI na 30–35 ay Class I obesity. Malakas na nauugnay sa diabetes, hypertension, obstructive sleep apnea, GERD, osteoarthritis, at 2–3× na pagtaas ng cardiovascular risk. Inirerekomenda ang medikal, dietary, at exercise na interbensyon.",
        risk: "high",
        relatedVitals: ["BMI", "Weight"],
        category: "metabolic"
      });
    } else if (bmiToUse >= 35 && bmiToUse < 40) {
      conditions.push({
        name: "Obesity Class II",
        nameTagalog: "Labis na Taba — Klase II",
        explanation: "BMI of 35–40 is Class II obesity. Associated with severe complications including coronary artery disease, stroke, severe sleep apnea, type 2 diabetes with end-organ damage, and joint degeneration. Bariatric evaluation may be warranted. Urgent lifestyle and medical intervention is recommended.",
        explanationTagalog: "Ang BMI na 35–40 ay Class II obesity. Nauugnay sa matinding komplikasyon tulad ng coronary artery disease, stroke, matinding sleep apnea, at joint degeneration. Maaaring kailangan ng bariatric evaluation. Inirerekomenda ang agarang lifestyle at medikal na interbensyon.",
        risk: "high",
        relatedVitals: ["BMI", "Weight"],
        category: "metabolic"
      });
    } else if (bmiToUse >= 40) {
      conditions.push({
        name: "Morbid Obesity (Class III)",
        nameTagalog: "Matinding Labis na Taba — Klase III",
        explanation: "BMI of 40+ is morbid obesity. Carries the highest risk of life-threatening complications: coronary artery disease, heart failure, stroke, respiratory failure, severe type 2 diabetes, chronic kidney disease, certain cancers (colon, breast, endometrial), and significantly reduced life expectancy. Bariatric surgery evaluation is typically indicated.",
        explanationTagalog: "Ang BMI na 40+ ay morbid obesity. Nagdadala ng pinakamataas na panganib ng buhay na nagbabanta na komplikasyon: heart failure, stroke, respiratory failure, matinding diabetes, chronic kidney disease, at mga cancer. Karaniwang kinakailangan ang bariatric surgery evaluation.",
        risk: "high",
        relatedVitals: ["BMI", "Weight"],
        category: "metabolic"
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. BLOOD PRESSURE
  // ═══════════════════════════════════════════════════════════════════════════
  if (validBP && systolic > 0 && diastolic > 0) {

    // Pulse pressure anomalies (independent of BP level)
    if (pulsePressure > 60) {
      conditions.push({
        name: "Wide Pulse Pressure",
        nameTagalog: "Malawak na Pulse Pressure",
        explanation: `Pulse pressure of ${pulsePressure} mmHg (systolic − diastolic) is above the normal 40 mmHg threshold. Wide pulse pressure can indicate aortic regurgitation, arterial stiffness (common in older adults), anemia, hyperthyroidism, or arteriovenous fistula. It is also associated with an elevated risk of cardiovascular events.`,
        explanationTagalog: `Ang pulse pressure na ${pulsePressure} mmHg ay mas mataas sa normal na 40 mmHg. Ang malawak na pulse pressure ay maaaring senyales ng aortic regurgitation, arterial stiffness, anemia, hyperthyroidism, o arteriovenous fistula. Nauugnay din ito sa mas mataas na panganib ng cardiovascular events.`,
        risk: "moderate",
        relatedVitals: ["Blood Pressure"],
        category: "cardiovascular"
      });
    } else if (pulsePressure < 25 && pulsePressure > 0) {
      conditions.push({
        name: "Narrow Pulse Pressure",
        nameTagalog: "Makitid na Pulse Pressure",
        explanation: `Pulse pressure of ${pulsePressure} mmHg is abnormally narrow (below 25 mmHg). This can indicate cardiac tamponade, severe aortic stenosis, heart failure with low cardiac output, or hemorrhagic shock. It deserves immediate clinical evaluation.`,
        explanationTagalog: `Ang pulse pressure na ${pulsePressure} mmHg ay abnormally makitid (mas mababa sa 25 mmHg). Maaaring senyales ito ng cardiac tamponade, matinding aortic stenosis, heart failure, o hemorrhagic shock. Kailangan ng agarang clinical evaluation.`,
        risk: "high",
        relatedVitals: ["Blood Pressure"],
        category: "cardiovascular"
      });
    }

    if (systolic < 70 || diastolic < 40) {
      conditions.push({
        name: "Severe Hypotension / Shock",
        nameTagalog: "Matinding Hypotension / Shock",
        explanation: `Blood pressure of ${record.bp} mmHg is critically low — consistent with circulatory shock. This is a life-threatening emergency. Possible causes: septic shock, hemorrhagic shock, anaphylaxis, cardiogenic shock, or severe dehydration. Organ perfusion is compromised. Call emergency services immediately.`,
        explanationTagalog: `Ang presyon ng dugo na ${record.bp} mmHg ay kritikal na mababa — katugma sa circulatory shock. Ito ay isang buhay na mapanganib na emerhensya. Posibleng sanhi: septic shock, hemorrhagic shock, anaphylaxis, o matinding dehydration. Tumawag agad ng emergency services.`,
        risk: "high",
        relatedVitals: ["Blood Pressure"],
        category: "cardiovascular"
      });
    } else if (systolic < 90 || diastolic < 60) {
      conditions.push({
        name: "Hypotension",
        nameTagalog: "Mababang Presyon ng Dugo (Hypotension)",
        explanation: `Blood pressure of ${record.bp} mmHg is below normal. Symptomatic hypotension causes dizziness, syncope (fainting), and can progress to organ damage. Common causes include dehydration, prolonged bed rest, medications (antihypertensives, diuretics), adrenal insufficiency, or cardiac dysfunction. Orthostatic (standing) hypotension is also possible.`,
        explanationTagalog: `Ang presyon ng dugo na ${record.bp} mmHg ay mas mababa sa normal. Ang hypotension ay nagdudulot ng pagkahilo, pagkamatay-matay, at maaaring lumala sa organ damage. Karaniwan itong sanhi ng dehydration, gamot, o cardiac dysfunction.`,
        risk: "moderate",
        relatedVitals: ["Blood Pressure"],
        category: "cardiovascular"
      });
    } else if (systolic >= 120 && systolic <= 129 && diastolic < 80) {
      conditions.push({
        name: "Elevated Blood Pressure",
        nameTagalog: "Bahagyang Mataas na Presyon (Elevated)",
        explanation: `Blood pressure of ${record.bp} mmHg is in the 'elevated' range (ACC/AHA 2017 guidelines). Without lifestyle changes this commonly progresses to Stage 1 hypertension within a few years. Reducing dietary sodium, limiting alcohol, increasing aerobic activity, and stress management are the primary interventions.`,
        explanationTagalog: `Ang presyon ng dugo na ${record.bp} mmHg ay nasa 'elevated' na range (ACC/AHA 2017). Kung walang pagbabago sa pamumuhay, karaniwan itong napupunta sa Stage 1 hypertension sa loob ng ilang taon. Inirerekomenda ang pagbabago ng diyeta, limitasyon ng alkohol, at aerobic na aktibidad.`,
        risk: "low",
        relatedVitals: ["Blood Pressure"],
        category: "cardiovascular"
      });
    } else if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) {
      conditions.push({
        name: "Stage 1 Hypertension",
        nameTagalog: "Unang Antas ng Hypertension",
        explanation: `Blood pressure of ${record.bp} mmHg is Stage 1 Hypertension. Over time this significantly raises risk of heart attack, stroke, kidney disease, retinopathy, and peripheral artery disease. Lifestyle modification is the first line; medication may be needed if 10-year cardiovascular risk is elevated. Regular monitoring is essential.`,
        explanationTagalog: `Ang presyon ng dugo na ${record.bp} mmHg ay Stage 1 Hypertension. Sa mahabang panahon, malaki itong nagpapataas ng panganib ng atake sa puso, stroke, kidney disease, at retinopathy. Lifestyle modification ang unang linya ng paggamot; maaaring kailangan ng gamot kung mataas ang 10-year cardiovascular risk.`,
        risk: "moderate",
        relatedVitals: ["Blood Pressure"],
        category: "cardiovascular"
      });
    } else if (systolic >= 140 && systolic < 180 && diastolic < 120) {
      conditions.push({
        name: "Stage 2 Hypertension",
        nameTagalog: "Ikalawang Antas ng Hypertension",
        explanation: `Blood pressure of ${record.bp} mmHg is Stage 2 Hypertension. This is a major independent risk factor for heart attack, stroke, heart failure, aortic aneurysm, and chronic kidney disease. Both antihypertensive medication and strict lifestyle changes are typically necessary. Left ventricular hypertrophy and silent end-organ damage are concerns at this level.`,
        explanationTagalog: `Ang presyon ng dugo na ${record.bp} mmHg ay Stage 2 Hypertension. Ito ay isang pangunahing independenteng risk factor para sa atake sa puso, stroke, heart failure, at chronic kidney disease. Karaniwang kailangan ng antihypertensive medication at mahigpit na lifestyle changes.`,
        risk: "high",
        relatedVitals: ["Blood Pressure"],
        category: "cardiovascular"
      });
    } else if (systolic >= 180 || diastolic >= 120) {
      conditions.push({
        name: "Hypertensive Crisis",
        nameTagalog: "Hypertensive Crisis",
        explanation: `Blood pressure of ${record.bp} mmHg is a hypertensive crisis — a medical emergency. End-organ damage can occur within minutes to hours: hemorrhagic stroke, hypertensive encephalopathy, aortic dissection, acute MI, or acute kidney failure. If symptoms like chest pain, vision changes, or headache are present, this is a hypertensive emergency. Call emergency services immediately.`,
        explanationTagalog: `Ang presyon ng dugo na ${record.bp} mmHg ay isang hypertensive crisis — medikal na emerhensya. Maaaring mangyari ang end-organ damage sa loob ng ilang minuto hanggang oras: hemorrhagic stroke, aortic dissection, acute MI, o acute kidney failure. Tumawag agad ng emergency services.`,
        risk: "high",
        relatedVitals: ["Blood Pressure"],
        category: "cardiovascular"
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. HEIGHT / WEIGHT RATIO OUTLIERS
  // ═══════════════════════════════════════════════════════════════════════════
  if (validHeight && validWeight) {
    // Very low weight-to-height ratio (wasting)
    const whRatio = weight / (heightM * 100); // kg per cm
    if (whRatio < 0.2 && bmiToUse < 18.5) {
      conditions.push({
        name: "Possible Wasting Syndrome",
        nameTagalog: "Posibleng Wasting Syndrome",
        explanation: "The combination of very low weight relative to height suggests wasting — significant loss of muscle and fat mass. Wasting can occur in advanced HIV/AIDS, cancer cachexia, severe malabsorption, or prolonged starvation. It is associated with severely compromised immune function and increased mortality risk.",
        explanationTagalog: "Ang kombinasyon ng napakababang timbang kaugnay ng taas ay nagmumungkahi ng wasting — makabuluhang pagkawala ng muscle at fat mass. Maaaring mangyari ito sa advanced HIV/AIDS, cancer cachexia, o matinding malabsorption.",
        risk: "high",
        relatedVitals: ["Weight", "Height", "BMI"],
        category: "metabolic"
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. COMBINATION RULES — multi-vital patterns
  // ═══════════════════════════════════════════════════════════════════════════

  // (a) Low SpO2 + Fever → Respiratory Infection / Pneumonia
  if (validSpo2 && validTemp && spo2 < 97 && temp > 37.5) {
    conditions.push({
      name: "Likely Respiratory Infection",
      nameTagalog: "Posibleng Impeksyon sa Paghinga",
      explanation: `Reduced oxygen saturation (${spo2}%) combined with elevated temperature (${temp.toFixed(1)}°C) strongly suggests an active respiratory infection. The most common causes are pneumonia, influenza, COVID-19, bronchitis, and severe sinusitis. The infection reduces the lungs' gas exchange capacity while simultaneously triggering an immune-driven fever response. Medical evaluation and possible chest imaging are recommended.`,
      explanationTagalog: `Ang pinagsamang mababang oxygen saturation (${spo2}%) at mataas na temperatura (${temp.toFixed(1)}°C) ay malakas na nagpapahiwatig ng aktibong impeksyon sa paghinga. Ang mga pinakakaraniwang sanhi ay pneumonia, influenza, COVID-19, bronchitis, at matinding sinusitis. Inirerekomenda ang medikal na pagsusuri at posibleng chest imaging.`,
      risk: spo2 < 95 ? "high" : "moderate",
      relatedVitals: ["SpO2", "Temperature"],
      category: "combination"
    });
  }

  // (b) High BP + High BMI → Metabolic Syndrome
  if (validBP && !isNaN(bmiToUse) && systolic >= 130 && bmiToUse >= 25) {
    conditions.push({
      name: "Metabolic Syndrome Risk",
      nameTagalog: "Panganib ng Metabolic Syndrome",
      explanation: `Elevated blood pressure (${record.bp} mmHg) combined with excess body weight (BMI ${bmiToUse.toFixed(1)}) is a hallmark pattern for metabolic syndrome — a cluster that typically also includes insulin resistance, elevated triglycerides, and low HDL cholesterol. Metabolic syndrome doubles the risk of cardiovascular disease and increases type 2 diabetes risk five-fold. Comprehensive lipid panel and blood glucose testing are strongly recommended.`,
      explanationTagalog: `Ang pinagsama ng mataas na presyon ng dugo (${record.bp} mmHg) at labis na timbang (BMI ${bmiToUse.toFixed(1)}) ay isang hallmark pattern ng metabolic syndrome — isang grupo na karaniwang kinabibilangan din ng insulin resistance, mataas na triglycerides, at mababang HDL cholesterol. Ang metabolic syndrome ay nagdoble ng panganib ng cardiovascular disease. Inirerekomenda ang lipid panel at blood glucose testing.`,
      risk: "moderate",
      relatedVitals: ["Blood Pressure", "BMI"],
      category: "combination"
    });
  }

  // (c) High BP + Low SpO2 → Possible Heart Failure / Pulmonary Hypertension
  if (validBP && validSpo2 && systolic >= 140 && spo2 < 95) {
    conditions.push({
      name: "Possible Cardiopulmonary Stress",
      nameTagalog: "Posibleng Cardiopulmonary Stress",
      explanation: `The combination of high blood pressure (${record.bp} mmHg) and low oxygen saturation (${spo2}%) suggests significant cardiopulmonary stress. This pattern may indicate hypertensive heart disease, pulmonary hypertension, left ventricular failure, or acute coronary syndrome. Urgent cardiac and pulmonary evaluation is recommended.`,
      explanationTagalog: `Ang kombinasyon ng mataas na presyon ng dugo (${record.bp} mmHg) at mababang oxygen saturation (${spo2}%) ay nagpapahiwatig ng malaking cardiopulmonary stress. Maaaring ito ay hypertensive heart disease, pulmonary hypertension, o left ventricular failure. Inirerekomenda ang agarang cardiac at pulmonary evaluation.`,
      risk: "high",
      relatedVitals: ["Blood Pressure", "SpO2"],
      category: "combination"
    });
  }

  // (d) Very Low BP + Low SpO2 → Possible Shock
  if (validBP && validSpo2 && systolic < 90 && spo2 < 94) {
    conditions.push({
      name: "Possible Circulatory Collapse",
      nameTagalog: "Posibleng Circulatory Collapse",
      explanation: `Low blood pressure (${record.bp} mmHg) paired with critically reduced oxygen saturation (${spo2}%) is a pattern consistent with circulatory collapse or shock — a life-threatening state where vital organs are not receiving adequate oxygenated blood. Causes include septic shock, anaphylaxis, tension pneumothorax, or massive hemorrhage. This requires immediate emergency response.`,
      explanationTagalog: `Ang mababang presyon ng dugo (${record.bp} mmHg) kasama ang kritikal na mababang oxygen saturation (${spo2}%) ay katugma sa circulatory collapse o shock — isang buhay na mapanganib na estado. Posibleng sanhi: septic shock, anaphylaxis, tension pneumothorax, o malaking pagdurugo. Kailangan ng agarang emergency response.`,
      risk: "high",
      relatedVitals: ["Blood Pressure", "SpO2"],
      category: "combination"
    });
  }

  // (e) High Fever + Low BP → Possible Sepsis
  if (validTemp && validBP && temp > 38.5 && systolic < 100) {
    conditions.push({
      name: "Possible Sepsis",
      nameTagalog: "Posibleng Sepsis",
      explanation: `Fever above 38.5°C (${temp.toFixed(1)}°C) combined with low blood pressure (${record.bp} mmHg) meets two of the classic SIRS (Systemic Inflammatory Response Syndrome) criteria for early sepsis. Sepsis is a life-threatening organ dysfunction caused by a dysregulated immune response to infection. Common sources include urinary tract, lungs, abdomen, and skin. Immediate emergency evaluation is critical.`,
      explanationTagalog: `Ang lagnat na higit sa 38.5°C (${temp.toFixed(1)}°C) kasama ang mababang presyon ng dugo (${record.bp} mmHg) ay nakakatugon sa dalawa sa mga klasikong SIRS criteria para sa sepsis. Ang sepsis ay isang buhay na mapanganib na organ dysfunction. Kailangan ng agarang emergency evaluation.`,
      risk: "high",
      relatedVitals: ["Temperature", "Blood Pressure"],
      category: "combination"
    });
  }

  // (f) Obesity + Low SpO2 → Obesity Hypoventilation / Sleep Apnea
  if (!isNaN(bmiToUse) && bmiToUse >= 30 && validSpo2 && spo2 < 96) {
    conditions.push({
      name: "Possible Obesity Hypoventilation / Sleep Apnea",
      nameTagalog: "Posibleng Obesity Hypoventilation / Sleep Apnea",
      explanation: `Obesity (BMI ${bmiToUse.toFixed(1)}) combined with reduced SpO2 (${spo2}%) suggests obesity hypoventilation syndrome (OHS) or obstructive sleep apnea (OSA). Excess body weight restricts chest wall movement and collapses the upper airway, reducing the body's ability to breathe effectively — particularly during sleep. This combination is strongly associated with daytime sleepiness, morning headaches, and significantly elevated cardiovascular risk. A sleep study (polysomnography) is recommended.`,
      explanationTagalog: `Ang obesity (BMI ${bmiToUse.toFixed(1)}) kasama ang mababang SpO2 (${spo2}%) ay nagpapahiwatig ng obesity hypoventilation syndrome (OHS) o obstructive sleep apnea (OSA). Ang labis na timbang ay nagpipigil sa paggalaw ng chest wall at nagbubukas ng upper airway. Inirerekomenda ang sleep study (polysomnography).`,
      risk: "moderate",
      relatedVitals: ["BMI", "SpO2"],
      category: "combination"
    });
  }

  // (g) High BMI + High BP + Fever → Inflammatory / Endocrine Concern
  if (!isNaN(bmiToUse) && bmiToUse >= 27 && validBP && systolic >= 130 && validTemp && temp > 37.5) {
    conditions.push({
      name: "Elevated Inflammatory Load",
      nameTagalog: "Mataas na Inflammatory Load",
      explanation: `The simultaneous presence of excess weight (BMI ${bmiToUse.toFixed(1)}), elevated blood pressure (${record.bp} mmHg), and elevated temperature (${temp.toFixed(1)}°C) suggests elevated systemic inflammation. Adipose tissue secretes pro-inflammatory cytokines (adipokines) that worsen hypertension and increase susceptibility to infection. This pattern is also associated with insulin resistance, pre-diabetes, and increased risk of developing chronic inflammatory conditions.`,
      explanationTagalog: `Ang sabay na presensya ng labis na timbang (BMI ${bmiToUse.toFixed(1)}), mataas na presyon ng dugo (${record.bp} mmHg), at mataas na temperatura (${temp.toFixed(1)}°C) ay nagpapahiwatig ng mataas na systemic inflammation. Ang adipose tissue ay naglalabas ng pro-inflammatory cytokines na nagpapalala ng hypertension at nagpapataas ng susceptibility sa impeksyon.`,
      risk: "moderate",
      relatedVitals: ["BMI", "Blood Pressure", "Temperature"],
      category: "combination"
    });
  }

  // (h) Low Temp + Low SpO2 → Exposure / Shock concern
  if (validTemp && validSpo2 && temp < 36 && spo2 < 95) {
    conditions.push({
      name: "Possible Exposure or Peripheral Circulatory Failure",
      nameTagalog: "Posibleng Exposure o Peripheral Circulatory Failure",
      explanation: `Low body temperature (${temp.toFixed(1)}°C) combined with reduced SpO2 (${spo2}%) suggests either environmental cold exposure with respiratory compromise, or peripheral circulatory failure where poor blood flow is reducing both tissue oxygenation and core temperature. Consider hypothyroidism, severe anemia, or early septic shock. Immediate clinical assessment is warranted.`,
      explanationTagalog: `Ang mababang temperatura ng katawan (${temp.toFixed(1)}°C) kasama ang mababang SpO2 (${spo2}%) ay nagmumungkahi ng environmental cold exposure na may respiratory compromise, o peripheral circulatory failure. Isaalang-alang ang hypothyroidism, matinding anemia, o early septic shock. Kailangan ng agarang clinical assessment.`,
      risk: "moderate",
      relatedVitals: ["Temperature", "SpO2"],
      category: "combination"
    });
  }

  // (i) Underweight + Low SpO2 → Anemia / Nutritional Deficiency
  if (!isNaN(bmiToUse) && bmiToUse < 18.5 && validSpo2 && spo2 < 97) {
    conditions.push({
      name: "Possible Anemia or Nutritional Deficiency",
      nameTagalog: "Posibleng Anemia o Nutritional Deficiency",
      explanation: `Being underweight (BMI ${bmiToUse.toFixed(1)}) alongside reduced SpO2 (${spo2}%) raises concern for iron-deficiency anemia or other nutritional deficiencies affecting oxygen transport. Anemia reduces the blood's oxygen-carrying capacity, which is reflected in lower SpO2 readings. A complete blood count (CBC) and iron panel are recommended.`,
      explanationTagalog: `Ang kulang sa timbang (BMI ${bmiToUse.toFixed(1)}) kasama ang mababang SpO2 (${spo2}%) ay nagdudulot ng alalahanin para sa iron-deficiency anemia o iba pang nutritional deficiencies. Ang anemia ay nagbabawas ng oxygen-carrying capacity ng dugo. Inirerekomenda ang complete blood count (CBC) at iron panel.`,
      risk: "moderate",
      relatedVitals: ["BMI", "SpO2"],
      category: "combination"
    });
  }

  // (j) High Fever + High BP → Hypertensive Urgency with Infection
  if (validTemp && validBP && temp > 38.5 && systolic >= 140) {
    conditions.push({
      name: "Hypertensive Urgency with Active Infection",
      nameTagalog: "Hypertensive Urgency na may Aktibong Impeksyon",
      explanation: `The combination of high blood pressure (${record.bp} mmHg) and significant fever (${temp.toFixed(1)}°C) suggests concurrent hypertensive urgency and active infection. Infection-driven inflammation directly elevates blood pressure through cytokine release and increased vascular resistance. This combination greatly increases the short-term risk of stroke, cardiac event, and septic complications. Both conditions require simultaneous management.`,
      explanationTagalog: `Ang kombinasyon ng mataas na presyon ng dugo (${record.bp} mmHg) at matinding lagnat (${temp.toFixed(1)}°C) ay nagpapahiwatig ng sabay na hypertensive urgency at aktibong impeksyon. Ang inflammation na dulot ng impeksyon ay direktang nagpapataas ng presyon ng dugo. Ang kombinasyong ito ay malaki ang pagpapataas ng short-term risk ng stroke at cardiac event.`,
      risk: "high",
      relatedVitals: ["Blood Pressure", "Temperature"],
      category: "combination"
    });
  }

  // ─── De-duplicate: if a combo condition's vitals are fully covered by
  // individual conditions at equal or higher risk, keep the combo (it adds
  // context) but remove redundant lower-risk individual entries.
  // (Simple dedup: remove exact name duplicates only)
  const seen = new Set<string>();
  return conditions.filter(c => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Returns the single worst RiskLevel across all conditions */
export function overallRisk(conditions: Condition[]): RiskLevel | null {
  if (conditions.some(c => c.risk === "high"))     return "high";
  if (conditions.some(c => c.risk === "moderate")) return "moderate";
  if (conditions.length > 0)                        return "low";
  return null;
}

/** Groups conditions by category for optional grouped display */
export function groupByCategory(conditions: Condition[]): Record<string, Condition[]> {
  return conditions.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {} as Record<string, Condition[]>);
}