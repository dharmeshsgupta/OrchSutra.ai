/**
 * Firebase Authentication service.
 *
 * Provides helpers for:
 *  - Email / Password sign-up & sign-in
 *  - Google Sign-In (popup)
 *  - Phone OTP (reCAPTCHA)
 *  - Sign-out
 *  - Get current ID token (to send to backend)
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  type ConfirmationResult,
  type UserCredential,
} from 'firebase/auth';
import { auth, googleProvider, githubProvider } from '../firebase';

/* ─── Email / Password ─── */

export async function signUpWithEmail(email: string, password: string): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

/* ─── Google ─── */

export async function signInWithGoogle(): Promise<UserCredential> {
  return signInWithPopup(auth, googleProvider);
}

/* ─── GitHub ─── */

export async function signInWithGitHub(): Promise<UserCredential> {
  return signInWithPopup(auth, githubProvider);
}

/* ─── Phone OTP ─── */

/**
 * Must call this first — attaches an invisible reCAPTCHA to the given element.
 * Returns a RecaptchaVerifier instance that you pass to `sendPhoneOtp()`.
 */
export function setupRecaptcha(elementId: string): RecaptchaVerifier {
  return new RecaptchaVerifier(auth, elementId, { size: 'invisible' });
}

/**
 * Sends an SMS OTP to the given phone number.
 * Returns a ConfirmationResult — call `.confirm(otp)` with the code the user enters.
 */
export async function sendPhoneOtp(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier,
): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
}

/* ─── Forgot Password ─── */

/**
 * Sends a password-reset email to the given address.
 * The user clicks the link in the email to set a new password.
 */
export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

/* ─── Sign Out ─── */

export async function signOutUser(): Promise<void> {
  return firebaseSignOut(auth);
}

/* ─── Token helper ─── */

/**
 * Returns the Firebase ID token for the currently signed-in user.
 * Pass this to the backend as `Authorization: Bearer <token>`.
 */
export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}
