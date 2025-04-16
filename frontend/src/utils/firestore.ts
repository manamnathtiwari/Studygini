// ui/src/utils/firestore.ts
import { firebaseApp } from "app/auth"; // Import the initialized Firebase app
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp, // To store creation dates
  Timestamp // For type definitions
} from "firebase/firestore";

// Initialize Firestore
const db = getFirestore(firebaseApp);

// Define the main collection reference for user history
// We structure it as /userHistory/{userId}/entries/{entryId}
const userHistoryCollection = (userId: string) => collection(db, "userHistory", userId, "entries");

// Export necessary Firestore functions and references
export { 
  db, 
  userHistoryCollection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp, 
  collection // Export collection for potential other uses
}; 

// Define a type for the history entry (optional but good practice)
// We'll use the StudyMaterialResponse from 'types' and add metadata
import { StudyMaterialResponse } from "types";

export interface HistoryEntry extends StudyMaterialResponse {
  id?: string; // Firestore document ID
  userId: string;
  createdAt: Timestamp;
  inputType: "text" | "topic" | "file";
  inputDetail: string; // Topic name or filename
  purpose: string;
  difficultyLevel: string; 
}
