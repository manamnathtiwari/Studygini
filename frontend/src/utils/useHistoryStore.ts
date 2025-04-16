// ui/src/utils/useHistoryStore.ts
import { create } from 'zustand';
import { 
  userHistoryCollection, 
  getDocs, 
  addDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  getDoc, // For fetching single item later
  doc // For fetching single item later
} from './firestore'; // Import from our utility file
import { HistoryEntry } from './firestore'; // Import the type definition
import { toast } from "sonner";

interface HistoryState {
  historyItems: HistoryEntry[];
  isLoading: boolean;
  error: string | null;
  fetchHistory: (userId: string) => Promise<void>;
  addHistoryItem: (userId: string, itemData: Omit<HistoryEntry, 'id' | 'userId' | 'createdAt'>) => Promise<string | null>; // Returns new doc ID or null
  // We might add getSingleItem later for MYA-15
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  historyItems: [],
  isLoading: false,
  error: null,

  // Fetch all history items for a user
  fetchHistory: async (userId: string) => {
    if (!userId) {
      set({ historyItems: [], isLoading: false, error: "User not logged in." });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const historyCollectionRef = userHistoryCollection(userId);
      // Query to order by creation date, newest first
      const q = query(historyCollectionRef, orderBy("createdAt", "desc")); 
      const querySnapshot = await getDocs(q);
      
      const items: HistoryEntry[] = [];
      querySnapshot.forEach((doc) => {
        // Make sure createdAt is converted correctly if needed, Firestore SDK usually handles this
        items.push({ id: doc.id, ...doc.data() } as HistoryEntry);
      });
      
      set({ historyItems: items, isLoading: false });
      console.log(`Fetched ${items.length} history items for user ${userId}`);

    } catch (error: any) {
      console.error("Error fetching history:", error);
      const errorMessage = error.message || "Failed to fetch history.";
      set({ isLoading: false, error: errorMessage });
      toast.error(`Error fetching history: ${errorMessage}`);
    }
  },

  // Add a new history item
  addHistoryItem: async (userId: string, itemData: Omit<HistoryEntry, 'id' | 'userId' | 'createdAt'>) => {
     if (!userId) {
      console.error("Attempted to add history item without userId.");
      toast.error("Cannot save history: User not logged in.");
      return null;
    }
    // No loading state set here, as it might be called in the background
    try {
      const historyCollectionRef = userHistoryCollection(userId);
      const docRef = await addDoc(historyCollectionRef, {
        ...itemData,
        userId: userId, // Ensure userId is stored
        createdAt: serverTimestamp() // Add server-side timestamp
      });
      
      console.log("History item added with ID: ", docRef.id);
      
      // Add to local state optimistically 
       const newItem: HistoryEntry = {
         ...itemData,
         id: docRef.id,
         userId: userId,
         createdAt: Timestamp.now(), // Use client timestamp for optimistic update
       };

       set(state => ({
         historyItems: [newItem, ...state.historyItems]
           // Keep sorted? Firestore query already sorts, maybe sort here just in case?
           // .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
       }));

      toast.success("Study session saved to history!");
      return docRef.id;

    } catch (error: any) {
      console.error("Error adding history item:", error);
      const errorMessage = error.message || "Failed to save study session.";
      // Set error state? Maybe just toast is enough
      // set({ error: errorMessage }); 
      toast.error(`Error saving history: ${errorMessage}`);
      return null;
    }
  },

  // Placeholder for fetching a single item (for MYA-15)
  // getSingleHistoryItem: async (userId: string, itemId: string) => { ... }

}));
