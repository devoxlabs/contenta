"use client";
import { v4 as uuidv4 } from "uuid";

export type OutputMode = "generate" | "ideas" | "enhance" | "vision";

export type OutputRecord = {
  id: string;
  createdAt: number;
  mode: OutputMode;
  text: string;
  style: string;
  platform: string;
  // Structured data from API; use any to keep flexibility
  structured?: any;
  raw?: string;
  favorite?: boolean;
  // For image-based generations
  imageDataUrl?: string;
  imageName?: string;
};

const keyFor = (uid: string) => `contenta:outputs:${uid || "local"}`;

export function loadOutputs(uid: string) {
  if (typeof window === "undefined") return [] as OutputRecord[];
  try {
    const raw = localStorage.getItem(keyFor(uid));
    return raw ? (JSON.parse(raw) as OutputRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveOutput(uid: string, rec: Omit<OutputRecord, "id" | "createdAt">) {
  if (typeof window === "undefined") return null;
  const list = loadOutputs(uid);
  const item: OutputRecord = { id: uuidv4(), createdAt: Date.now(), ...rec } as OutputRecord;
  const next = [item, ...list].slice(0, 200); // keep a cap
  localStorage.setItem(keyFor(uid), JSON.stringify(next));
  return item;
}

export function toggleFavorite(uid: string, id: string) {
  const list = loadOutputs(uid);
  const next = list.map((x) => (x.id === id ? { ...x, favorite: !x.favorite } : x));
  localStorage.setItem(keyFor(uid), JSON.stringify(next));
  return next.find((x) => x.id === id) || null;
}

export function removeOutput(uid: string, id: string) {
  const list = loadOutputs(uid);
  const next = list.filter((x) => x.id !== id);
  localStorage.setItem(keyFor(uid), JSON.stringify(next));
}

export function clearAll(uid: string) {
  localStorage.removeItem(keyFor(uid));
}

export function saveSettings(uid: string, s: any) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`contenta:settings:${uid || "local"}`, JSON.stringify(s));
}

export function loadSettings(uid: string) {
  if (typeof window === "undefined") return {} as any;
  try {
    const raw = localStorage.getItem(`contenta:settings:${uid || "local"}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
