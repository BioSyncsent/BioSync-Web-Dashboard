import { db } from "../firebase/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

/** Live count of pending disputes. */
export function subscribeToPendingDisputes(onData, onError) {
  const ref = collection(db, "disputes");
  const q = query(ref, where("status", "==", "Pending"));
  return onSnapshot(
    q,
    (snap) => onData(snap.size),
    (err) => {
      console.error("subscribeToPendingDisputes:", err);
      onError?.(err);
    }
  );
}