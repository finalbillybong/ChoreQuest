import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';

let app = null;
let auth = null;

export function initFirebase(firebaseConfig) {
  if (app) return auth;
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  return auth;
}

export function getFirebaseAuth() {
  return auth;
}

export async function firebaseSignIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function firebaseSignUp(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }
  // Sign out so the user is prompted to log in manually after registration
  await signOut(auth);
  return cred.user;
}

export async function firebaseSignOut() {
  await signOut(auth);
}

export async function getIdToken(forceRefresh = false) {
  if (!auth?.currentUser) return null;
  return auth.currentUser.getIdToken(forceRefresh);
}

export function onFirebaseAuthChange(callback) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}
