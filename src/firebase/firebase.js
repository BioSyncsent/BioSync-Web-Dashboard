import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

/* =========================================================
   FIREBASE CONFIGURATION
========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyCqoyl-GM58YQM4xWSicl1q5oWfMEqgFJA",
  authDomain: "fyp-attendance-51ba3.firebaseapp.com",
  projectId: "fyp-attendance-51ba3",
  storageBucket: "fyp-attendance-51ba3.firebasestorage.app",
  messagingSenderId: "73352570242",
  appId: "1:73352570242:web:53c8e0ae2606b30fbadb9b",
};

/* =========================================================
   PRIMARY FIREBASE APP
========================================================= */

const app =
  getApps().find((firebaseApp) => firebaseApp.name === "[DEFAULT]") ||
  initializeApp(firebaseConfig);

/* =========================================================
   SECONDARY FIREBASE APP

   Used when Admin creates Student / Teacher accounts.
   This prevents the Admin from being logged out.
========================================================= */

const userCreationApp =
  getApps().find(
    (firebaseApp) => firebaseApp.name === "biosync-user-creation"
  ) || initializeApp(firebaseConfig, "biosync-user-creation");

/* =========================================================
   PRIMARY FIREBASE SERVICES
========================================================= */

export const db = getFirestore(app);

export const auth = getAuth(app);

export const storage = getStorage(app);

/* =========================================================
   SECONDARY AUTH

   Used only for creating new users.
========================================================= */

export const secondaryAuth = getAuth(userCreationApp);

/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default app;