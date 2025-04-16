import React from "react";
import { InputForm } from "components/InputForm";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type InputMethod = "text" | "topic" | "file";

type StudyPurpose = "revision" | "deep-learning" | "exam-prep";

type DifficultyLevel = "beginner" | "intermediate" | "advanced";

interface InputFormData {
  inputMethod: InputMethod;
  content: string;
  topic: string;
  purpose: StudyPurpose;
  difficultyLevel: DifficultyLevel;
}

export default function Study() {
  const navigate = useNavigate();
  
  const handleFormSubmit = (data: InputFormData) => {
    console.log("Form submitted with data:", data);
    toast.success("Study materials are being generated!");
    
    // Store form data in session storage
    sessionStorage.setItem("studyFormData", JSON.stringify(data));
    
    // Navigate to results page
    navigate("/Results");
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header with navigation back */}
      <header className="py-4 px-4 md:px-6 border-b border-border">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-heading"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Back to Home</span>
          </button>
          
          <h1 className="text-xl font-bold font-heading">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">StudyGeni</span>
          </h1>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-1 py-10 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold font-heading mb-3">Create Your Study Materials</h1>
            <p className="text-muted-foreground font-content max-w-2xl mx-auto">
              Enter your content, choose a topic, or upload a file. Then customize your learning preferences to generate personalized study materials.
            </p>
          </div>
          
          <InputForm onSubmit={handleFormSubmit} />
        </div>
      </main>
      
      {/* Footer */}
      <footer className="py-6 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>© 2025 StudyGeni. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}