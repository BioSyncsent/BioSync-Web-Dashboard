import { db } from "../firebase/firebase";
import { collection, doc, onSnapshot } from "firebase/firestore";

/** Live count of users, excluding any explicitly marked active: false. */
export function subscribeToTotalUsers(onData, onError) {
  const ref = collection(db, "users");
  return onSnapshot(
    ref,
    (snap) => {
      const activeCount = snap.docs.filter((d) => d.data().active !== false).length;
      onData(activeCount);
    },
    (err) => {
      console.error("subscribeToTotalUsers:", err);
      onError?.(err);
    }
  );
}

/** Live profile for the logged-in user, from users/{uid}. */
export function subscribeToUserProfile(uid, onData, onError) {
  if (!uid) return () => {};
  const ref = doc(db, "users", uid);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) return onData(null);
      const user = snap.data();
      onData({
        id: snap.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown",
        role: user.role,
        email: user.email,
        photoURL: user.photoURL || user.avatar || null,
      });
    },
    (err) => {
      console.error("subscribeToUserProfile:", err);
      onError?.(err);
    }
  );
}