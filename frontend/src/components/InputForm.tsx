import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom"; // <-- Import useNavigate
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { API_URL, mode, Mode } from "app"; // <-- Import API_URL and mode
import { StudyMaterialResponse } from "types"; // <-- Import response type
import { useCurrentUser } from "app/auth"; // <-- Import useCurrentUser
import { useHistoryStore } from "utils/useHistoryStore"; // <-- Import history store
import { HistoryEntry } from "utils/firestore"; // <-- Import history type

type InputMethod = "text" | "topic" | "file";

type StudyPurpose = "revision" | "deep-learning" | "exam-prep";

type DifficultyLevel = "beginner" | "intermediate" | "advanced";

interface InputFormData {
  inputMethod: InputMethod;
  content: string;
  topic: string;
  purpose: StudyPurpose;
  difficultyLevel: DifficultyLevel;
  geminiApiKey?: string; // Add optional API key field
}

interface Props {
  onSubmit: (data: InputFormData) => void;
}

export function InputForm({ onSubmit }: Props) {
  const { user } = useCurrentUser(); // <-- Get current user
  const addHistoryItem = useHistoryStore((state) => state.addHistoryItem); // <-- Get function from store
  const navigate = useNavigate(); // <-- Initialize useNavigate
  const [inputMethod, setInputMethod] = useState<InputMethod>("text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // <-- Store the File object
  const [fileName, setFileName] = useState<string>("");
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    reset
  } = useForm<InputFormData>({
    defaultValues: {
      inputMethod: "text",
      content: "",
      topic: "",
      purpose: "revision",
      difficultyLevel: "intermediate"
    }
  });
  
  // Watch for changes to react accordingly
  const watchInputMethod = watch("inputMethod");
  const watchContent = watch("content");
  const watchTopic = watch("topic");
  
  const handleInputMethodChange = (method: InputMethod) => {
    setInputMethod(method);
    setValue("inputMethod", method);
    
    // Reset related fields when changing method
    if (method !== "text") setValue("content", "");
    if (method !== "topic") setValue("topic", "");
    if (method !== "file") {
      setSelectedFile(null); // <-- Reset file object
      setFileName("");
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if file is PDF or TXT
    const validTypes = ["application/pdf", "text/plain"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a PDF or TXT file");
      return;
    }
    
    // File size validation (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB");
      e.target.value = ""; // Reset the input
      return;
    }

    setSelectedFile(file); // <-- Store the file object
    setFileName(file.name);

    // No need to read the file here, backend handles it
  };
  
  const processForm = async (data: InputFormData) => { // <-- Add async
    // Validate based on input method
    if (data.inputMethod === "text" && !data.content.trim()) {
      toast.error("Please enter some content");
      return;
    }

    if (data.inputMethod === "topic" && !data.topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    // --- Handle file upload submission ---    
    if (data.inputMethod === "file") {
      if (!selectedFile) {
        toast.error("Please upload a file");
        return; // Stop submission if no file is selected
      }

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("purpose", data.purpose);
      formData.append("difficulty_level", data.difficultyLevel);
      if (data.geminiApiKey) {
        formData.append("gemini_api_key", data.geminiApiKey);
      }

      // Make the API call
      try {
        // Construct the full API URL
        const url = `${API_URL}/process-file-upload`;
        console.log(`Attempting to upload file to: ${url}`); // Debug log

        const response = await fetch(url, {
          method: "POST",
          body: formData,
          // Headers not needed for FormData, browser sets Content-Type with boundary
          credentials: mode === Mode.DEV ? "include" : "same-origin", // Include credentials in DEV
        });

        const result = await response.json(); // Always try to parse JSON

        if (!response.ok) {
          console.error("File upload failed:", result);
          // Use the detail from the backend error if available
          toast.error(`Error: ${result.detail || response.statusText || 'File processing failed'}`);
          return; // Stop execution on error
        }

        // --- Success --- 
        console.log("File processed successfully:", result);
        sessionStorage.setItem("studyGenerationResult", JSON.stringify(result));
        sessionStorage.removeItem("studyFormData"); 

        // --- ADD HISTORY ITEM ---
        if (user) { // Check if user is logged in
          const historyData: Omit<HistoryEntry, 'id' | 'userId' | 'createdAt'> = {
            summary: result.summary,
            flashcards: result.flashcards,
            quiz: result.quiz,
            inputType: "file",
            inputDetail: fileName || "Uploaded File", // Use the stored filename
            purpose: data.purpose,
            difficultyLevel: data.difficultyLevel,
          };
          try {
              await addHistoryItem(user.uid, historyData); // Save to Firestore
          } catch (historyError) {
              console.error("Failed to save history item:", historyError);
              // Non-critical, show toast but proceed
              toast.error("Failed to save to history, but results are generated.");
          }
        }
        // --- END ADD HISTORY ITEM ---
        
        // Navigate to results page
        navigate("/results");

      } catch (error) {
        console.error("Network or other error during file upload:", error);
        toast.error("An unexpected error occurred during file upload.");
      }

    } else {
      // --- Handle text/topic submission (existing logic) ---
      // Pass the data to the parent component
      onSubmit(data);
    }
  };
  
  return (
    <div className="w-full max-w-3xl mx-auto bg-card p-6 md:p-8 rounded-xl shadow-sm border border-border">
      <h2 className="text-2xl font-bold mb-6 font-heading">Create Your Study Kit</h2>
      
      {/* Input Method Selection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3 font-heading">Choose Your Input Method</h3>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => handleInputMethodChange("text")}
            className={`px-4 py-3 rounded-lg font-heading text-sm font-medium flex items-center gap-2 hover-lift ${inputMethod === "text" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >
            <span>📝</span> Paste Text
          </button>
          
          <button
            type="button"
            onClick={() => handleInputMethodChange("topic")}
            className={`px-4 py-3 rounded-lg font-heading text-sm font-medium flex items-center gap-2 hover-lift ${inputMethod === "topic" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >
            <span>🔍</span> Enter Topic
          </button>
          
          <button
            type="button"
            onClick={() => handleInputMethodChange("file")}
            className={`px-4 py-3 rounded-lg font-heading text-sm font-medium flex items-center gap-2 hover-lift ${inputMethod === "file" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >
            <span>📄</span> Upload File
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit(processForm)} className="space-y-8">
        {/* Hidden input for input method */}
        <input type="hidden" {...register("inputMethod")} />
        
        {/* Text Input Section */}
        {inputMethod === "text" && (
          <div className="space-y-2">
            <label htmlFor="content" className="block text-md font-medium font-heading">
              Your Study Content
            </label>
            <textarea
              id="content"
              {...register("content", {
                validate: value => 
                  inputMethod !== "text" || !!value.trim() || "Content is required"
              })}
              placeholder="Paste your study material here..."
              className="w-full min-h-[200px] p-4 rounded-lg border border-border bg-card shadow-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 font-content"
            />
            {errors.content && (
              <p className="text-destructive text-sm mt-1">{errors.content.message}</p>
            )}
          </div>
        )}
        
        {/* Topic Input Section */}
        {inputMethod === "topic" && (
          <div className="space-y-2">
            <label htmlFor="topic" className="block text-md font-medium font-heading">
              Topic to Study
            </label>
            <input
              type="text"
              id="topic"
              {...register("topic", {
                validate: value => 
                  inputMethod !== "topic" || !!value.trim() || "Topic is required"
              })}
              placeholder="Enter a subject or topic (e.g., 'Photosynthesis', 'World War II')"
              className="w-full p-4 rounded-lg border border-border bg-card shadow-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 font-content"
            />
            {errors.topic && (
              <p className="text-destructive text-sm mt-1">{errors.topic.message}</p>
            )}
          </div>
        )}
        
        {/* File Upload Section */}
        {inputMethod === "file" && (
          <div className="space-y-4">
            <label className="block text-md font-medium font-heading">
              Upload Your Study Material
            </label>
            
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              {!selectedFile ? ( // <-- Check selectedFile instead of fileUploaded
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <span className="text-4xl">📄</span>
                    <span className="font-medium font-heading">Drag & drop or click to upload</span>
                    <span className="text-sm text-muted-foreground font-content">
                      Supports PDF, TXT (Max 5MB)
                    </span>
                  </div>
                  
                  <input
                    type="file"
                    id="file-upload"
                    accept=".pdf,.txt,application/pdf,text/plain"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  <label
                    htmlFor="file-upload"
                    className="inline-block px-4 py-2 bg-secondary text-secondary-foreground rounded-lg cursor-pointer font-heading hover-lift text-sm"
                  >
                    Select File
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <span className="text-4xl">✅</span>
                    <span className="font-medium font-heading">File ready:</span>
                    <span className="text-muted-foreground font-content">{fileName}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setFileName("");
                      // Also reset the actual file input element if needed
                      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                      if(fileInput) fileInput.value = "";
                    }}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-heading hover-lift text-sm"
                  >
                    Remove File
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Preferences Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
          {/* Study Purpose */}
          <div className="space-y-2">
            <label htmlFor="purpose" className="block text-md font-medium font-heading">
              Study Purpose
            </label>
            <select
              id="purpose"
              {...register("purpose")}
              className="w-full p-3 rounded-lg border border-border bg-card shadow-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 font-content"
            >
              <option value="revision">Revision</option>
              <option value="deep-learning">Deep Learning</option>
              <option value="exam-prep">Exam Preparation</option>
            </select>
          </div>
          
          {/* Difficulty Level */}
          <div className="space-y-2">
            <label htmlFor="difficultyLevel" className="block text-md font-medium font-heading">
              Difficulty Level
            </label>
            <select
              id="difficultyLevel"
              {...register("difficultyLevel")}
              className="w-full p-3 rounded-lg border border-border bg-card shadow-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 font-content"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
        
        {/* Optional Gemini API Key Input */}
        <div className="space-y-2 pt-6 border-t border-border">
          <Label htmlFor="gemini-api-key" className="block text-md font-medium font-heading">
            Your Gemini API Key (Optional)
          </Label>
          <Input
            id="gemini-api-key"
            type="password" // Use password type to obscure the key
            placeholder="Enter your Google AI Studio API Key"
            className="w-full p-3 rounded-lg border border-border bg-card shadow-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 font-content" // Match styling of other inputs
            {...register("geminiApiKey")} // Register the field
          />
          <p className="text-xs text-muted-foreground font-content">
            Using your own key helps avoid rate limits. Get one from{" "}
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline"
            >
              Google AI Studio
            </a>.
          </p>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-md hover:shadow-lg transform transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 font-heading disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              "Generate Study Kit"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}