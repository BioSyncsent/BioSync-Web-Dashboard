import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import {
    onAuthStateChanged
} from "firebase/auth";

import {
    doc,
    getDoc
} from "firebase/firestore";

import {
    auth,
    db
} from "../firebase/firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        const unsubscribe = onAuthStateChanged(
            auth,
            async (firebaseUser) => {

                if (firebaseUser) {

                    try {

                        const userRef = doc(
                            db,
                            "users",
                            firebaseUser.uid
                        );

                        const userDoc = await getDoc(userRef);

                        if (userDoc.exists()) {

                            const data = userDoc.data();

                            setUser({

                                // Firebase Auth
                                uid: firebaseUser.uid,
                                email: firebaseUser.email,

                                // Firestore Data
                                ...data,

                                // Computed Values
                                fullName: `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim()

                            });

                        } else {

                            console.warn("User document not found.");

                            setUser({
                                uid: firebaseUser.uid,
                                email: firebaseUser.email,
                            });

                        }

                    } catch (error) {

                        console.error("Error loading user:", error);

                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                        });

                    }

                } else {

                    setUser(null);

                }

                setLoading(false);

            }
        );

        return () => unsubscribe();

    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}