// api/ai-insights.ts
// Vercel Node.js serverless function — OPENAI_API_KEY stays server-side, never in the browser bundle.
// POST /api/ai-insights
// Body: { token, demographics: { age, sex }, checkups: Checkup[], language }
// Returns: { summary, positives[], concerns[], recommendations[] }

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

interface Checkup {
  date: string;
  spo2: number | null;
  temp: number | null;
  bmi: number | null;
  heart_rate: number | null;
  blood_pressure: string | null;
  height: number | null;
  weight: number | null;
}

interface Demographics {
  age: number | string;
  sex: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCheckups(checkups: Checkup[]): string {
  if (checkups.length === 0) return "No checkup data available.";
  return checkups
    .map((c, i) => {
      const parts: string[] = [`${i + 1}. [${c.date}]`];
      if (c.spo2 != null)           parts.push(`SpO2=${c.spo2}%`);
      if (c.temp != null)           parts.push(`Temp=${c.temp}°C`);
      if (c.heart_rate != null)     parts.push(`HR=${c.heart_rate}bpm`);
      if (c.blood_pressure)         parts.push(`BP=${c.blood_pressure}mmHg`);
      if (c.weight != null)         parts.push(`Weight=${c.weight}kg`);
      if (c.height != null)         parts.push(`Height=${c.height}m`);
      if (c.bmi != null)            parts.push(`BMI=${Number(c.bmi).toFixed(1)}`);
      return parts.join(", ");
    })
    .join("\n");
}

function buildSystemPrompt(language: string): string {
  const langInstruction =
    language === "Tagalog"
      ? "Respond entirely in Filipino/Tagalog. All JSON string values must be in Tagalog."
      : "Respond entirely in English.";

  return `You are a health analysis assistant for HealthSense, a community vital signs monitoring kiosk deployed in barangay health centers in the Philippines. You provide informational health insights based on patient vital signs collected by the kiosk.

IMPORTANT RULES:
- You are NOT a doctor and cannot diagnose medical conditions
- All insights are purely informational and educational
- Be compassionate, clear, and culturally sensitive to a Filipino audience
- Consider age-appropriate normal vital sign ranges for each parameter
- Analyze trends across multiple checkups, not just single readings when data allows
- Highlight both positive aspects and areas worth monitoring
- Provide practical, actionable recommendations
- If only 1-2 checkups are available, note that trend analysis is limited
- ${langInstruction}

You MUST respond with ONLY valid JSON — no markdown fences, no extra text outside the JSON. Use this exact structure:
{
  "summary": "2-3 sentence overall health assessment",
  "positives": ["positive observation 1", "positive observation 2"],
  "concerns": ["notable observation or area to watch 1", "concern 2"],
  "recommendations": ["specific actionable recommendation 1", "recommendation 2"]
}

Guidelines per section:
- summary: 2-3 sentences, overall picture, mention trend direction if data allows
- positives: 2-4 items — healthy readings, stable trends, good signs
- concerns: 1-4 items — readings outside normal range, concerning trends, things to watch (can be mild)
- recommendations: 2-4 items — specific, practical advice tailored to the findings
- Keep every item under 2 sentences; avoid vague generalities`;
}

function buildUserPrompt(d: Demographics, checkups: Checkup[], language: string): string {
  const lang = language === "Tagalog" ? "Filipino/Tagalog" : "English";
  return `Please analyze the following patient health data and provide insights in ${lang}.

PATIENT PROFILE:
- Age: ${d.age}${typeof d.age === "number" ? " years old" : ""}
- Sex: ${d.sex}

VITAL SIGNS HISTORY (${checkups.length} checkup${checkups.length !== 1 ? "s" : ""}, newest first):
${formatCheckups(checkups)}

Please provide a comprehensive health brief considering:
1. Age-appropriate normal ranges for a ${d.age}-year-old ${d.sex}
2. Vital signs trends and patterns across the available checkups
3. Common health implications for this demographic
4. Practical recommendations based on the findings`;
}

// ─── Body reader (fallback if Vercel does not auto-parse) ─────────────────────

async function readBody(req: any): Promise<any> {
  if (req.body !== undefined) return req.body;
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk: any) => (raw += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST")   { res.status(405).json({ error: "Method not allowed" }); return; }

  if (!OPENAI_API_KEY) {
    res.status(500).json({ error: "Server configuration error: OPENAI_API_KEY not set" });
    return;
  }

  let body: any;
  try {
    body = await readBody(req);
  } catch {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { token, demographics, checkups, language } = body ?? {};

  if (!token || !demographics || !Array.isArray(checkups) || !language) {
    res.status(400).json({ error: "Missing required fields: token, demographics, checkups, language" });
    return;
  }

  // Verify the user's JWT via Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    res.status(401).json({ error: "Unauthorized — invalid or expired session" });
    return;
  }

  // Build prompts
  const systemPrompt = buildSystemPrompt(language);
  const userPrompt   = buildUserPrompt(demographics as Demographics, checkups as Checkup[], language);

  // Call OpenAI
  let openaiRes: Response;
  try {
    openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system",  content: systemPrompt },
          { role: "user",    content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to reach OpenAI API", details: err.message });
    return;
  }

  if (!openaiRes.ok) {
    const errText = await openaiRes.text().catch(() => "unknown");
    res.status(502).json({ error: "OpenAI API returned an error", details: errText });
    return;
  }

  const openaiData: any = await openaiRes.json();
  const rawContent: string = openaiData.choices?.[0]?.message?.content ?? "";

  if (!rawContent) {
    res.status(502).json({ error: "Empty response from OpenAI" });
    return;
  }

  // Parse and validate structure
  let parsed: any;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    res.status(502).json({ error: "OpenAI returned malformed JSON", raw: rawContent });
    return;
  }

  const result = {
    summary:         typeof parsed.summary === "string"             ? parsed.summary         : "",
    positives:       Array.isArray(parsed.positives)                ? parsed.positives       : [],
    concerns:        Array.isArray(parsed.concerns)                 ? parsed.concerns        : [],
    recommendations: Array.isArray(parsed.recommendations)          ? parsed.recommendations : [],
  };

  res.status(200).json(result);
}
