import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

function buildJsonPrompt(params: { mode: string; text: string; style: string; platform: string }) {
  const { mode, text, style, platform } = params;
  if (mode === "ideas") {
    return `You are an expert content strategist. Create JSON only (no markdown, no code fences, no commentary). Schema:
{
  "ideas": [ { "title": string, "hook": string, "platform": "${platform}" } ]
}
Rules: 8 ideas, concise, tone: ${style}. Remove hashtags and asterisks. Topic: ${text}`;
  }
  if (mode === "enhance") {
    return `Rewrite and improve the text with tone ${style}. Respond as JSON only:
{
  "variants": [ string ]
}
Rules: provide 2-3 alternatives. No hashtags. No markdown.`;
  }
  // default: captions + script
  return `Create JSON only for social captions and a short video script. Schema:
{
  "captions": string[],
  "script": {
    "title": string,
    "hook": string[],
    "body": string[],
    "cta": string[]
  }
}
Rules: 5 captions, each under 120 chars, tone ${style}, platform ${platform}. Remove hashtags, asterisks, and markdown. Topic: ${text}`;
}

function tryParseJSON(text: string): any | null {
  try {
    // Strip code fences if present
    const cleaned = text
      .replace(/^```(json)?/i, "")
      .replace(/```$/i, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { mode, text, style, platform } = await req.json();
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
    }
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid text" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL });
    const prompt = buildJsonPrompt({ mode, text, style, platform });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const raw = response.text();
    const structured = tryParseJSON(raw);

    // Fallback to raw text if parsing fails
    const outputs = [{ content: raw }];

    return NextResponse.json({ outputs, structured });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
