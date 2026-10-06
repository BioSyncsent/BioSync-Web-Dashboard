import { auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

/** Live subscription to the logged-in Firebase Auth user (null if logged out). */
export function subscribeToAuthUser(onChange) {
  return onAuthStateChanged(auth, (user) => onChange(user));
}