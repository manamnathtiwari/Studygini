// ui/src/pages/History.tsx
import React, { useEffect } from "react";
import { useUserGuardContext } from "app/auth"; // Use this for protected pages
import { useHistoryStore } from "utils/useHistoryStore";
import { HistoryEntry } from "utils/firestore"; // Type for history items
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from 'date-fns'; // For formatting timestamps

// Helper to format Firestore Timestamp
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp || !timestamp.toDate) {
    // Firestore Timestamps might be null initially or not yet converted
    // Handle cases where it might already be a Date object (less likely with serverTimestamp)
    if (timestamp instanceof Date) {
      try {
         return format(timestamp, 'PPpp');
      } catch { return "Invalid Date"; }
    }
    return "Pending..."; // Or "Invalid date"
  }
  try {
    return format(timestamp.toDate(), 'PPpp'); // Example format: Sep 21, 2023, 4:30:00 PM
  } catch (e) {
    console.error("Error formatting timestamp:", e);
    return "Error date";
  }
};

export default function History() {
  const { user } = useUserGuardContext(); // User is guaranteed to be non-null here
  const navigate = useNavigate();
  const { historyItems, isLoading, error, fetchHistory } = useHistoryStore((state) => ({
    historyItems: state.historyItems,
    isLoading: state.isLoading,
    error: state.error,
    fetchHistory: state.fetchHistory,
  }));

  // Fetch history when the component mounts or user changes
  useEffect(() => {
    // Check if user is available and fetch hasn't been triggered recently (basic check)
    // A more robust check might involve checking if historyItems is null/empty and not loading
    if (user?.uid) {
      console.log("History Page: Fetching history for user:", user.uid);
      fetchHistory(user.uid);
    } else {
      console.log("History Page: No user UID available yet.");
    }
    // Dependency array includes user?.uid to refetch if the user logs in/out while on the page (though unlikely due to guard)
  }, [user?.uid, fetchHistory]);

  const handleViewDetails = (item: HistoryEntry) => {
    // Store the selected item in sessionStorage to pass it to the detail view
    // Convert Timestamp to serializable format (ISO string) if needed
    const serializableItem = {
      ...item,
      // Convert Timestamp fields to string or number if they exist
      createdAt: item.createdAt?.toDate ? item.createdAt.toDate().toISOString() : null,
      // Add conversions for other Timestamp fields if any
    };
    sessionStorage.setItem("selectedHistoryItem", JSON.stringify(serializableItem));
    navigate(`/results?historyView=true`); // Navigate to Results page with a flag
    console.log(`Navigating to view details for history item: ${item.id}`);
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Study History</h1>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "Failed to load study history. Please try again later."}
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && historyItems.length === 0 && (
        <Card>
          <CardHeader>
             <CardTitle>No History Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Looks like you haven't saved any study sessions. 
              Go back to the <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/')}>Home page</Button> to generate some summaries, flashcards, or quizzes!
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && historyItems.length > 0 && (
        <div className="space-y-4">
          {historyItems.map((item) => (
            <Card key={item.id} className="overflow-hidden"> {/* Added overflow-hidden */} 
              <CardHeader>
                <CardTitle className="capitalize truncate"> {/* Added truncate */} 
                  {item.inputType}: {item.inputDetail}
                </CardTitle>
                <CardDescription>
                   {/* Ensure createdAt is valid before formatting */} 
                  Generated on: {item.createdAt ? formatTimestamp(item.createdAt) : 'Date unavailable'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Purpose: {item.purpose} | Difficulty: {item.difficultyLevel}
                </p>
              </CardContent>
              <CardFooter className="bg-muted/50 px-6 py-3"> {/* Added subtle background */} 
                <Button size="sm" onClick={() => handleViewDetails(item)}> {/* Made button smaller */} 
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
       <div className="mt-8 text-center">
         <Button variant="outline" onClick={() => navigate('/')}>Back to Home</Button>
       </div>
    </div>
  );
}
