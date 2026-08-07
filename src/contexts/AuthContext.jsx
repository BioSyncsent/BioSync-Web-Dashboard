import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  doc,
  onSnapshot,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase/firebase";

/* =========================================================
   AUTH CONTEXT
========================================================= */

const AuthContext = createContext();

/* =========================================================
   AUTH PROVIDER
========================================================= */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDocument = null;

    /* =====================================================
       LISTEN TO FIREBASE AUTH
    ===================================================== */

    const unsubscribeAuth = onAuthStateChanged(
      auth,

      (firebaseUser) => {
        /* Remove previous Firestore listener */

        if (unsubscribeUserDocument) {
          unsubscribeUserDocument();
          unsubscribeUserDocument = null;
        }

        /* =================================================
           NOT LOGGED IN
        ================================================= */

        if (!firebaseUser) {
          setUser(null);
          setLoading(false);

          return;
        }

        setLoading(true);

        /* =================================================
           LOAD USER PROFILE
        ================================================= */

        const userRef = doc(
          db,
          "users",
          firebaseUser.uid
        );

        unsubscribeUserDocument = onSnapshot(
          userRef,

          (userSnapshot) => {
            if (userSnapshot.exists()) {
              const data = userSnapshot.data();

              setUser({
                /* Firebase Authentication information */

                uid: firebaseUser.uid,
                email: firebaseUser.email,

                /* Firestore user information */

                ...data,

                /* Computed full name */

                fullName: `${data.firstName ?? ""} ${
                  data.lastName ?? ""
                }`.trim(),
              });
            } else {
              console.warn(
                "User document not found."
              );

              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
              });
            }

            setLoading(false);
          },

          (error) => {
            console.error(
              "Error listening to user profile:",
              error
            );

            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
            });

            setLoading(false);
          }
        );
      }
    );

    /* =====================================================
       CLEANUP
    ===================================================== */

    return () => {
      unsubscribeAuth();

      if (unsubscribeUserDocument) {
        unsubscribeUserDocument();
      }
    };
  }, []);

  /* =======================================================
     PROVIDER
  ======================================================= */

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* =========================================================
   USE AUTH HOOK
========================================================= */

export function useAuth() {
  return useContext(AuthContext);
}