"use client";
import { auth } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, fetchSignInMethodsForEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';

export async function signUpWithEmail(email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signInWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function isEmailInUse(email: string): Promise<boolean> {
  const e = (email || '').trim().toLowerCase();
  try {
    const methods = await fetchSignInMethodsForEmail(auth, e);
    if ((methods?.length ?? 0) > 0) return true;
  } catch (_) {
    // ignore, fallback below
  }
  // Fallback: attempt password sign-in with a dummy password.
  // If user exists with email/password provider, Firebase returns 'auth/wrong-password'.
  try {
    await signInWithEmailAndPassword(auth, e, '__probe_wrong_password__');
    return true; // shouldn't succeed, but treat as exists
  } catch (err: any) {
    const code = err?.code || err?.message || '';
    if (String(code).includes('wrong-password') || String(code).includes('too-many-requests')) {
      return true;
    }
    // If user-not-found, likely truly not in Auth with password.
  }
  return false;
}

export async function setAuthPersistence(remember: boolean) {
  const mode = remember ? browserLocalPersistence : browserSessionPersistence;
  await setPersistence(auth, mode);
}
