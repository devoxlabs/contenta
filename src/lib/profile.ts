"use client";
import { db } from "./firebase";
import { auth } from "./firebase";
import { doc, getDoc, runTransaction, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { updateProfile as updateAuthProfile } from "firebase/auth";

export type UserProfile = {
  uid: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  nickname?: string;
  bio?: string;
  links?: string; // comma or newline separated
  photoURL?: string;
  avatar?: string; // public path e.g. /avatars/1.png
};

export function normalizeUsername(u: string) {
  return (u || "").trim().toLowerCase();
}

export function isValidUsername(u: string) {
  const s = normalizeUsername(u);
  // letters, numbers, and allowed specials: _ . , '
  return /^[a-z0-9_\.,']{3,20}$/.test(s);
}

export function suggestUsernames(base: string, existing: Set<string> = new Set(), count = 5) {
  const s = normalizeUsername(base).replace(/[^a-z0-9_\.,']/g, "");
  const suggestions: string[] = [];
  const chars = ["_", ".", ",", "'"];
  let n = 1;
  while (suggestions.length < count && n < 200) {
    const pick = Math.floor(Math.random() * chars.length);
    const candidate = `${s}${chars[pick]}${Math.floor(Math.random() * 9999)}`;
    if (!existing.has(candidate)) suggestions.push(candidate);
    n++;
  }
  return suggestions;
}

// Derive a username candidate from an email's local part
export function deriveUsernameFromEmail(email: string): string {
  if (!email) return "";
  const local = String(email).split("@")[0] || "";
  // keep allowed chars only, lowercase
  const cleaned = normalizeUsername(local).replace(/[^a-z0-9_\.,']/g, "");
  // enforce min length 3 by padding if needed
  if (cleaned.length >= 3) return cleaned.slice(0, 20);
  const pad = "user";
  return (cleaned + pad).slice(0, 20);
}

// Derive a username candidate from first+last name
export function deriveUsernameFromName(first: string, last: string): string {
  const raw = `${first || ""}${last || ""}`;
  const cleaned = normalizeUsername(raw).replace(/[^a-z0-9_\.,']/g, "");
  if (cleaned.length >= 3) return cleaned.slice(0, 20);
  return (cleaned + "user").slice(0, 20);
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const key = normalizeUsername(username);
  const refDoc = doc(db, "usernames", key);
  const snap = await getDoc(refDoc);
  return !snap.exists();
}

export async function reserveOrChangeUsername(uid: string, newUsername: string, oldUsername?: string) {
  const newKey = normalizeUsername(newUsername);
  const oldKey = oldUsername ? normalizeUsername(oldUsername) : undefined;
  if (!isValidUsername(newKey)) throw new Error("Invalid username format");
  await runTransaction(db, async (tx) => {
    const newRef = doc(db, "usernames", newKey);
    const newSnap = await tx.get(newRef);
    if (newSnap.exists() && newSnap.data()?.uid !== uid) {
      throw new Error("Username already taken");
    }
    if (oldKey && oldKey !== newKey) {
      const oldRef = doc(db, "usernames", oldKey);
      const oldSnap = await tx.get(oldRef);
      if (oldSnap.exists() && oldSnap.data()?.uid === uid) {
        tx.delete(oldRef);
      }
    }
    tx.set(newRef, { uid, updatedAt: Date.now() }, { merge: true });
    // Keep email only in users (private by rules), not in public usernames
    const email = auth.currentUser?.email || undefined;
    tx.set(doc(db, "users", uid), { username: newKey, email }, { merge: true });
  });
}

export async function saveProfile(uid: string, data: Partial<UserProfile>) {
  const email = auth.currentUser?.email || data.email;
  await setDoc(doc(db, "users", uid), { ...data, uid, email }, { merge: true });
  if (auth.currentUser && (data.firstName || data.lastName || data.photoURL)) {
    const displayName = [data.firstName ?? undefined, data.lastName ?? undefined].filter(Boolean).join(" ") || undefined;
    await updateAuthProfile(auth.currentUser, { displayName: displayName || undefined, photoURL: data.photoURL });
  }
}

// Username resolution to email removed in privacy-first mode (no public email exposure)

// Avatar uploads removed (no Firebase Storage). If needed in future,
// accept a remote URL and save via saveProfile.
