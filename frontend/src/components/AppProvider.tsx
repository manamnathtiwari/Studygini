// ui/src/components/AppProvider.tsx
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "app/auth"; // Get user status
import { Button } from "@/components/ui/button"; // For styling buttons/links
import { firebaseAuth } from "app/auth"; // For logout
import { LogOut, LogIn, History, BrainCircuit } from "lucide-react"; // Icons
import { toast } from "sonner"; // Import toast

interface Props {
  children: ReactNode;
}

export const AppProvider = ({ children }: Props) => {
  const { user, loading } = useCurrentUser(); // Get user and loading state
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await firebaseAuth.signOut();
      toast.success("Logged out successfully.");
      navigate("/"); // Redirect to home after logout
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background"> {/* Ensure full height and background */} 
      {/* Font links */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet" />
      
      {/* Toaster */}
      <Toaster position="top-right" />

      {/* --- Simple Header --- */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center"> {/* Use container and max-width */} 
          {/* App Title/Logo */}
           <div className="mr-4 flex items-center">
                <BrainCircuit className="h-6 w-6 mr-2 text-primary" />
                <span 
                  className="font-bold cursor-pointer"
                  onClick={() => navigate('/')} // Navigate home on click
                >
                  StudyGeni
                </span>
           </div>

          {/* Navigation Links */}
          <div className="flex flex-1 items-center justify-end space-x-2">
            {!loading && ( // Only render buttons when auth state is resolved
              <>
                {user ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
                       <History className="mr-1.5 h-4 w-4" /> History {/* Adjusted spacing */}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                       <LogOut className="mr-1.5 h-4 w-4" /> Logout {/* Adjusted spacing */}
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                     <LogIn className="mr-1.5 h-4 w-4" /> Login {/* Adjusted spacing */}
                  </Button>
                )}
              </>
            )}
             {/* Optional: Loading indicator - can be a simple spinner or text */}
             {loading && (
                <div className="flex items-center space-x-2">
                     <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status"></div>
                     <span className="text-xs text-muted-foreground">Checking status...</span>
                 </div>
             )} 
          </div>
        </div>
      </header>
      {/* --- End Header --- */}
      
      {/* Main Content Area */}
      <main className="flex-1">{children}</main> {/* Make main content take remaining space */} 
    </div>
  );
};
