import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

function buildJsonPrompt(style: string, platform: string) {
  return `You are an assistant that suggests social captions and post ideas based on an image.
Respond with JSON only (no markdown, no code fences, no commentary) using this shape:
{
  "captions": string[],
  "ideas": string[]
}
Rules:
- 5 short captions (<120 chars), tone: ${style}, platform: ${platform}
- 5 concise ideas (one sentence each). Remove hashtags and asterisks.`;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
    }
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const style = String(form.get("style") || "casual");
    const platform = String(form.get("platform") || "instagram");

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const base64 = Buffer.from(bytes).toString("base64");
    const mime = file.type || "image/jpeg";

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL });

    const prompt = buildJsonPrompt(style, platform);
    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { data: base64, mimeType: mime } } as any,
    ]);
    const response = await result.response;
    const raw = response.text();

    let structured: any | null = null;
    try {
      const cleaned = raw.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
      structured = JSON.parse(cleaned);
    } catch {
      structured = null;
    }

    return NextResponse.json({ structured, raw });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}

