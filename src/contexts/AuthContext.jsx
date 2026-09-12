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
  getDoc,
  onSnapshot,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase/firebase";

const AuthContext =
  createContext(null);

export function AuthProvider({
  children,
}) {
  const [
    user,
    setUser,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    profileError,
    setProfileError,
  ] = useState("");

  useEffect(() => {
    let unsubscribeProfile =
      null;

    let cancelled =
      false;

    const unsubscribeAuth =
      onAuthStateChanged(
        auth,

        async (
          firebaseUser
        ) => {
          /* Remove old listener */

          if (
            unsubscribeProfile
          ) {
            unsubscribeProfile();

            unsubscribeProfile =
              null;
          }

          setProfileError("");

          /* ================================================
             SIGNED OUT
          ================================================ */

          if (
            !firebaseUser
          ) {
            if (
              !cancelled
            ) {
              setUser(null);
              setLoading(false);
            }

            return;
          }

          setLoading(true);

          const userRef =
            doc(
              db,
              "users",
              firebaseUser.uid
            );

          /* ================================================
             INITIAL PROFILE LOAD

             getDoc gives us one reliable initial profile
             before starting the live listener.
          ================================================ */

          try {
            const snapshot =
              await getDoc(
                userRef
              );

            if (
              cancelled
            ) {
              return;
            }

            if (
              !snapshot.exists()
            ) {
              setUser(null);

              setProfileError(
                "Your BioSync profile could not be found."
              );

              setLoading(
                false
              );

              return;
            }

            const data =
              snapshot.data();

            setUser({
              uid:
                firebaseUser.uid,

              email:
                firebaseUser.email,

              ...data,

              fullName:
                `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim(),
            });

            setLoading(false);
          } catch (
            error
          ) {
            console.error(
              "Initial BioSync profile load failed:",
              error
            );

            if (
              cancelled
            ) {
              return;
            }

            /*
              Do NOT create a fake user with no role.
              That was causing ProtectedRoute to redirect
              incorrectly.
            */

            setUser(null);

            setProfileError(
              "Signed in successfully, but BioSync could not load your Firestore profile. Check your browser blocker/network and try again."
            );

            setLoading(false);

            return;
          }

          /* ================================================
             LIVE PROFILE SYNC

             Navbar / role / department / status stay synced
             with Firestore after login.
          ================================================ */

          unsubscribeProfile =
            onSnapshot(
              userRef,

              (
                snapshot
              ) => {
                if (
                  cancelled ||
                  !snapshot.exists()
                ) {
                  return;
                }

                const data =
                  snapshot.data();

                setUser({
                  uid:
                    firebaseUser.uid,

                  email:
                    firebaseUser.email,

                  ...data,

                  fullName:
                    `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim(),
                });

                setProfileError(
                  ""
                );
              },

              (
                error
              ) => {
                console.error(
                  "Live BioSync profile sync error:",
                  error
                );

                /*
                  Keep the already-loaded profile.
                  Do not kick the user out just because
                  the live listener temporarily failed.
                */
              }
            );
        }
      );

    return () => {
      cancelled = true;

      unsubscribeAuth();

      if (
        unsubscribeProfile
      ) {
        unsubscribeProfile();
      }
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        profileError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(
    AuthContext
  );
}