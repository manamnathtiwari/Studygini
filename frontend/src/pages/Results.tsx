import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom"; // <-- Add useSearchParams
import { toast } from "sonner";
import brain from "brain";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react"; // <-- Add AlertCircle, ArrowLeft
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "app/auth";
import { useHistoryStore } from "utils/useHistoryStore"; // <-- Import history store
import { HistoryEntry } from "utils/firestore"; // <-- Import history type

import { FeedbackForm } from "components/FeedbackForm";

// Define types for study materials
type StudyTab = "summary" | "flashcards" | "quiz";



type FlashcardModel = {
  question: string;
  answer: string;
};

type QuizQuestionOption = {
  option: string;
  is_correct: boolean;
};

type QuizQuestionModel = {
  question: string;
  options: QuizQuestionOption[];
  explanation: string;
};

type StudyMaterialResponse = {
  summary: string;
  flashcards: FlashcardModel[];
  quiz: QuizQuestionModel[];
};

// Store the form data in session storage to preserve it between page reloads
const getFormData = () => {
  const storedData = sessionStorage.getItem("studyFormData");
  return storedData ? JSON.parse(storedData) : null;
};

export default function Results() {
  const { user } = useCurrentUser(); 
  const addHistoryItem = useHistoryStore((state) => state.addHistoryItem); 
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams(); // <-- Add this hook
  const isHistoryView = searchParams.get("historyView") === "true"; // <-- Add this check

  const [activeTab, setActiveTab] = useState<StudyTab>("summary");
  const [loading, setLoading] = useState<boolean>(true);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterialResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFlashcardIndex, setSelectedFlashcardIndex] = useState<number>(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState<boolean>(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number>(0);


  // Function to generate study materials if not pre-loaded
  const generateStudyMaterials = async () => {
    console.log("Attempting to generate materials (fallback)...");
    const formDataString = sessionStorage.getItem("studyFormData");
    
    if (!formDataString) {
      setError("No study data found. Please return to the study page.");
      setLoading(false);
      return;
    }

    let formData;
    try {
      formData = JSON.parse(formDataString);
    } catch (parseError) {
      console.error("Error parsing studyFormData:", parseError);
      setError("Invalid study data found. Please return to the study page.");
      setLoading(false);
      sessionStorage.removeItem("studyFormData"); // Clear invalid data
      return;
    }

    // Only proceed if inputMethod is text or topic
    if (formData.inputMethod !== "text" && formData.inputMethod !== "topic") {
      console.error(`generateStudyMaterials called with unexpected inputMethod: ${formData.inputMethod}. Pre-generated results should exist.`);
      // If results ARE pre-generated but history saving failed in InputForm, we might end up here.
      // Let's try loading pre-generated results again just in case, otherwise show error.
      const preGen = sessionStorage.getItem("studyGenerationResult");
      if (preGen) {
          try {
              const parsedResult = JSON.parse(preGen) as StudyMaterialResponse;
              setStudyMaterials(parsedResult);
              // Make sure to clear the sessionStorage item here too if loaded this way
              sessionStorage.removeItem("studyGenerationResult");
              console.warn("Loaded pre-generated results in fallback, history might be missing.")
          } catch { 
             setError("Failed to parse results data. Please try again.");
             sessionStorage.removeItem("studyGenerationResult"); // Clear invalid data
          }
      } else {
           setError("An unexpected error occurred loading results. Please try again.");
      }
      setLoading(false);
      return; // Stop further generation attempts
    }
    
    try {
      // setLoading(true); // Already true from useEffect
      
      // Prepare request payload
      const payload: any = {
        input_method: formData.inputMethod,
        purpose: formData.purpose,
        difficulty_level: formData.difficultyLevel,
        // Add content or topic
        ...(formData.inputMethod === "text" && { content: formData.content }),
        ...(formData.inputMethod === "topic" && { topic: formData.topic }),
        // Add API key if present
        ...(formData.geminiApiKey && formData.geminiApiKey.trim() && { gemini_api_key: formData.geminiApiKey.trim() }),
      };
      
      console.log("Calling brain.generate_study_materials with payload:", payload);
      const response = await brain.generate_study_materials(payload);

      if (!response.ok) {
          // Attempt to read error detail from JSON response
          let errorDetail = `HTTP error! status: ${response.status}`;
          try {
              const errorData = await response.json();
              errorDetail = errorData.detail || errorDetail;
          } catch (e) {
              // Ignore if response is not JSON or already read
          }
          console.error("Error response from generate_study_materials:", errorDetail);
          throw new Error(errorDetail); // Throw an error to be caught below
      }
      
      const data: StudyMaterialResponse = await response.json();
      console.log("Received study materials (text/topic):", data);
      setStudyMaterials(data);

      // --- ADD HISTORY ITEM for text/topic ---
      if (user) { // Check if user is logged in
          // Determine input detail for history
          let inputDetailForHistory = "Unknown Input";
          if (formData.inputMethod === "topic" && formData.topic) {
              inputDetailForHistory = formData.topic;
          } else if (formData.inputMethod === "text") {
              inputDetailForHistory = formData.content.substring(0, 50) + (formData.content.length > 50 ? "..." : ""); // Use first 50 chars
          }

          const historyData: Omit<HistoryEntry, 'id' | 'userId' | 'createdAt'> = {
            summary: data.summary,
            flashcards: data.flashcards,
            quiz: data.quiz,
            inputType: formData.inputMethod, // "text" or "topic"
            inputDetail: inputDetailForHistory, 
            purpose: formData.purpose,
            difficultyLevel: formData.difficultyLevel,
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

    } catch (err: any) {
      console.error("Error in generateStudyMaterials:", err);
      setError(err.message || "Failed to generate study materials. Please try again later.");
      toast.error(err.message || "Could not generate study materials. Please try again.");
    } finally {
        setLoading(false); // Ensure loading is set to false
    }
  };

  useEffect(() => {
    const loadResults = async () => {
      setLoading(true);
      setError(null);
      setStudyMaterials(null); // Reset materials on load

      // --- HISTORY VIEW LOGIC ---
      if (isHistoryView) {
        console.log("Results Page: Loading history view.");
        const historyItemString = sessionStorage.getItem("selectedHistoryItem");
        // Clear immediately after reading, regardless of success
        sessionStorage.removeItem("selectedHistoryItem"); 

        if (historyItemString) {
          try {
            // Parse the stored item (Timestamps were serialized to ISO strings)
            const parsedItem = JSON.parse(historyItemString); 
            
            // Structure matches StudyMaterialResponse directly now
            const materials: StudyMaterialResponse = {
              summary: parsedItem.summary,
              flashcards: parsedItem.flashcards,
              quiz: parsedItem.quiz,
            };

            console.log("Loaded history item from sessionStorage:", materials);
            setStudyMaterials(materials);
            setLoading(false);
            return; // History item loaded, exit useEffect
          } catch (parseError) {
            console.error("Error parsing history item from sessionStorage:", parseError);
            setError("Failed to load the selected history item. The data might be corrupted. Please go back and try again.");
            setLoading(false);
            return; // Stop processing
          }
        } else {
          console.error("History view requested but no item found in sessionStorage.");
          setError("Could not find the history item data. Please go back to History and select again.");
          setLoading(false);
          return; // Stop processing
        }
      }
      // --- END HISTORY VIEW LOGIC ---

      // --- REGULAR GENERATION/LOADING LOGIC (Only if not history view) ---
      // 1. Check for pre-generated results (from file upload or recent generation)
      const preGeneratedResultString = sessionStorage.getItem("studyGenerationResult");
      if (preGeneratedResultString) {
        try {
          const parsedResult = JSON.parse(preGeneratedResultString) as StudyMaterialResponse;
          console.log("Loaded pre-generated results from sessionStorage:", parsedResult);
          setStudyMaterials(parsedResult);
          // Clear the item after successfully loading it
          sessionStorage.removeItem("studyGenerationResult"); 
          console.log("Cleared studyGenerationResult from sessionStorage.");
        } catch (parseError) {
          console.error("Error parsing pre-generated results from sessionStorage:", parseError);
          setError("Failed to load study results. Please try generating again.");
          sessionStorage.removeItem("studyGenerationResult"); // Clear invalid data
        } finally {
          setLoading(false);
          return; // Results handled (loaded or error set), exit useEffect
        }
      }

      // 2. If no pre-generated results, check for formData to trigger generation (text/topic)
      const formDataString = sessionStorage.getItem("studyFormData");
      if (formDataString) {
          console.log("No pre-generated results found, attempting to generate via API using formData...");
          // Call the fallback generation function which handles its own loading/error states
          await generateStudyMaterials(); 
          // generateStudyMaterials sets loading to false inside its finally block
          return; 
      }
      
      // 3. No history view, no pre-gen results, no form data - show error
      console.error("Results page loaded without historyView, preGeneratedResult, or formData.");
      setError("No study data found to display. Please start a new study session or select from History.");
      setLoading(false);
      // --- END REGULAR GENERATION/LOADING LOGIC ---
    };

    loadResults();
    // Rerun if isHistoryView changes (e.g., direct navigation with/without param)
  }, [isHistoryView]); // generateStudyMaterials removed as it's called conditionally


  // Handle tab switching
  const handleTabChange = (tab: StudyTab) => {
    setActiveTab(tab);
    
    // Reset states when switching tabs
    if (tab === "flashcards") {
      setSelectedFlashcardIndex(0);
      setIsFlashcardFlipped(false);
    } else if (tab === "quiz" && quizSubmitted) {
      // Ask if user wants to retake the quiz when returning to quiz tab
      const retake = window.confirm("Do you want to retake the quiz?");
      if (retake) {
        setQuizAnswers({});
        setQuizSubmitted(false);
        setQuizScore(0);
      }
    }
  };

  // Handle flashcard navigation
  const navigateFlashcards = (direction: "next" | "prev") => {
    if (!studyMaterials?.flashcards?.length) return;
    
    setIsFlashcardFlipped(false);
    if (direction === "next") {
      setSelectedFlashcardIndex((prev) => 
        (prev + 1) % studyMaterials.flashcards.length
      );
    } else {
      setSelectedFlashcardIndex((prev) => 
        (prev - 1 + studyMaterials.flashcards.length) % studyMaterials.flashcards.length
      );
    }
  };

  // Handle quiz answer selection
  const handleQuizAnswerSelect = (questionIndex: number, optionIndex: number) => {
    if (quizSubmitted) return;
    
    setQuizAnswers(prev => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
  };

  
  
  // Handle quiz submission
  const handleQuizSubmit = () => {
    if (!studyMaterials?.quiz?.length) return;
    
    // Calculate score
    let score = 0;
    studyMaterials.quiz.forEach((question, questionIndex) => {
      const selectedOptionIndex = quizAnswers[questionIndex];
      if (selectedOptionIndex !== undefined) {
        const isCorrect = question.options[selectedOptionIndex]?.is_correct;
        if (isCorrect) score++;
      }
    });
    
    setQuizScore(score);
    setQuizSubmitted(true);
    toast.success(`Quiz submitted! You scored ${score} out of ${studyMaterials.quiz.length}`);
  };

  // Check if user answered all quiz questions
  const hasAnsweredAllQuestions = () => {
    if (!studyMaterials?.quiz?.length) return false;
    return Object.keys(quizAnswers).length === studyMaterials.quiz.length;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header with navigation back */}
      <header className="py-4 px-4 md:px-6 border-b border-border">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button
            onClick={() => navigate(isHistoryView ? "/history" : "/Study")} // <-- Change target based on view
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-heading"
          >
            <ArrowLeft className="h-5 w-5" /> {/* <-- Use ArrowLeft icon */}
            <span>{isHistoryView ? "Back to History" : "Back to Study"}</span> {/* <-- Change text */}
          </button>
          
          <h1 className="text-xl font-bold font-heading">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">StudyGeni</span>
          </h1>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-1 py-6 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          
          {/* --- History View Banner --- */}
          {isHistoryView && !loading && !error && ( // Only show banner if successfully loaded history
            <div className="mb-6 flex items-center justify-between rounded-md border border-blue-300 bg-blue-50 p-4 dark:bg-blue-900/30">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                You are viewing a previously generated study session.
              </p>
              {/* Removed button from here, using header back button */}
            </div>
          )}
          {/* --- End History View Banner --- */}

          {/* Page title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold font-heading mb-3">
              {isHistoryView ? "Saved Study Materials" : "Your Study Materials"} {/* <-- Change title */}
            </h1>
            <p className="text-muted-foreground font-content max-w-2xl mx-auto">
              {isHistoryView 
                ? "Reviewing a previously generated session." 
                : "Review your personalized study materials in different formats to enhance your learning."} {/* <-- Change description */}
            </p>
          </div>
          
          {/* Tabs navigation */}
          <div className="border-b border-border mb-6">
            <nav className="flex space-x-2">
              <button
                onClick={() => handleTabChange("summary")}
                className={`px-4 py-2 font-medium rounded-t-lg transition-colors duration-200 ${activeTab === "summary" 
                  ? "border-b-2 border-primary text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              >
                📝 Summary
              </button>
              
              <button
                onClick={() => handleTabChange("flashcards")}
                className={`px-4 py-2 font-medium rounded-t-lg transition-colors duration-200 ${activeTab === "flashcards" 
                  ? "border-b-2 border-primary text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              >
                🧠 Flashcards
              </button>
              
              <button
                onClick={() => handleTabChange("quiz")}
                className={`px-4 py-2 font-medium rounded-t-lg transition-colors duration-200 ${activeTab === "quiz" 
                  ? "border-b-2 border-primary text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
              >
                📝 Quiz
              </button>
            </nav>
          </div>
          
          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center p-12">
              <div className="w-16 h-16 relative">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
                <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
                  <span className="text-xl">✨</span>
                </div>
              </div>
              <p className="mt-4 text-lg font-medium font-heading">Generating your study materials...</p>
              <p className="text-muted-foreground font-content">This may take a moment.</p>
            </div>
          )}
          
          {/* Error state - Updated */}
          {error && !loading && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
               <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" /> {/* <-- Use AlertCircle */}
              <h3 className="text-xl font-bold font-heading mb-2 text-destructive">Something went wrong</h3>
              <p className="mb-4">{error}</p>
              {/* Conditionally show back button */}
              <button
                onClick={() => navigate(isHistoryView ? "/history" : "/Study")} 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium font-heading"
              >
                 {isHistoryView ? "Back to History" : "Return to Study"}
              </button>
            </div>
          )}
          
          {/* Tab content */}
          {!loading && !error && studyMaterials && (
            <div className="bg-card border border-border rounded-lg shadow-sm">
              {/* Summary Tab */}
              {activeTab === "summary" && (
                <div className="p-6 fade-in">
                  <h2 className="text-2xl font-bold font-heading mb-4">Summary</h2>
                  <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none font-content">
                    {studyMaterials.summary.split('\n').map((paragraph, index) => {
                      // Remove asterisks and clean up formatting
                      const cleanedParagraph = paragraph
                        .replace(/\*\*/g, '') // Remove bold formatting
                        .replace(/\*/g, '')    // Remove italic formatting
                        .replace(/^- /gm, '')  // Remove list markers
                        .replace(/^\s*[IVXLCDM]+\.\s*/gm, '') // Remove Roman numeral headers
                        .replace(/^\s*\d+\.\s*/gm, '') // Remove numbered list markers
                        
                      return cleanedParagraph ? <p key={index} className="mb-4">{cleanedParagraph}</p> : null;
                    })}
                  </div>

                </div>
              )}
              
              {/* Flashcards Tab */}
              {activeTab === "flashcards" && studyMaterials.flashcards.length > 0 && (
                <div className="p-6 slide-in-right fade-in">
                  <h2 className="text-2xl font-bold font-heading mb-4">Flashcards</h2>
                  
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-muted-foreground font-content">
                      Card {selectedFlashcardIndex + 1} of {studyMaterials.flashcards.length}
                    </p>
                    <p className="text-sm text-muted-foreground font-content">
                      Click the card to reveal the answer
                    </p>
                  </div>
                  
                  {/* Flashcard */}
                  <div 
                    className={`perspective-1000 w-full mb-6 cursor-pointer transition-transform duration-300 ${isFlashcardFlipped ? "transform-style-preserve-3d" : ""}`}
                    onClick={() => setIsFlashcardFlipped(prev => !prev)}
                  >
                    <div 
                      className={`relative min-h-[300px] bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 shadow-md transition-all duration-500 ease-in-out ${isFlashcardFlipped ? "rotate-y-180 hidden" : ""}`}
                    >
                      <div className="flex items-center justify-center h-full">
                        <p className="text-xl font-medium font-content text-center">
                          {studyMaterials.flashcards[selectedFlashcardIndex].question}
                        </p>
                      </div>
                    </div>
                    
                    <div 
                      className={`absolute inset-0 min-h-[300px] bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 shadow-md transition-all duration-500 ease-in-out ${isFlashcardFlipped ? "" : "rotate-y-180 hidden"}`}
                    >
                      <div className="flex items-center justify-center h-full">
                        <p className="text-xl font-medium font-content text-center">
                          {studyMaterials.flashcards[selectedFlashcardIndex].answer}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Navigation buttons */}
                  <div className="flex justify-between">
                    <button
                      onClick={() => navigateFlashcards("prev")}
                      className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md flex items-center gap-2 font-heading hover-lift"
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
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      Previous
                    </button>
                    
                    <button
                      onClick={() => navigateFlashcards("next")}
                      className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md flex items-center gap-2 font-heading hover-lift"
                    >
                      Next
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
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Quiz Tab */}
              {activeTab === "quiz" && studyMaterials.quiz.length > 0 && (
                <div className="p-6 fade-in slide-in-right">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold font-heading">Quiz</h2>
                    
                    {quizSubmitted && (
                      <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium font-heading">
                        Score: {quizScore}/{studyMaterials.quiz.length}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-8 mb-6">
                    {studyMaterials.quiz.map((question, questionIndex) => (
                      <div 
                        key={questionIndex}
                        className={`p-5 rounded-lg border ${quizSubmitted ? "bg-muted/30" : "bg-card"}`}
                      >
                        <p className="text-lg font-medium font-content mb-4">
                          {questionIndex + 1}. {question.question}
                        </p>
                        
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => {
                            const isSelected = quizAnswers[questionIndex] === optionIndex;
                            const showCorrect = quizSubmitted && option.is_correct;
                            const showIncorrect = quizSubmitted && isSelected && !option.is_correct;
                            
                            return (
                              <div 
                                key={optionIndex}
                                className={`p-3 rounded-md border cursor-pointer transition-colors ${isSelected 
                                  ? quizSubmitted
                                    ? option.is_correct
                                      ? "bg-green-50 border-green-200"
                                      : "bg-red-50 border-red-200"
                                    : "bg-primary/10 border-primary/20"
                                  : quizSubmitted && option.is_correct
                                    ? "bg-green-50 border-green-200"
                                    : "hover:bg-muted/50"}`}
                                onClick={() => handleQuizAnswerSelect(questionIndex, optionIndex)}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${isSelected
                                    ? quizSubmitted
                                      ? option.is_correct
                                        ? "border-green-500 text-green-500"
                                        : "border-red-500 text-red-500"
                                      : "border-primary text-primary"
                                    : quizSubmitted && option.is_correct
                                      ? "border-green-500 text-green-500"
                                      : "border-muted-foreground text-muted-foreground"}`}>
                                    {String.fromCharCode(65 + optionIndex)}
                                  </div>
                                  <p className="text-foreground">{option.option}</p>
                                  
                                  {showCorrect && (
                                    <svg className="h-5 w-5 ml-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                  
                                  {showIncorrect && (
                                    <svg className="h-5 w-5 ml-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {quizSubmitted && question.explanation && (
                          <div className="mt-4 p-3 bg-muted/30 rounded-md">
                            <p className="text-sm font-medium font-heading text-muted-foreground mb-1">Explanation:</p>
                            <p className="text-sm font-content">{question.explanation}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {!quizSubmitted ? (
                    <button
                      onClick={handleQuizSubmit}
                      disabled={!hasAnsweredAllQuestions()}
                      className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-md font-medium font-heading shadow-md hover-lift disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
                    >
                      {hasAnsweredAllQuestions() ? "Submit Answers" : `Answer All Questions (${Object.keys(quizAnswers).length}/${studyMaterials.quiz.length})`}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setQuizAnswers({});
                        setQuizSubmitted(false);
                      }}
                      className="w-full px-4 py-3 bg-secondary text-secondary-foreground rounded-md font-medium font-heading hover-lift"
                    >
                      Retake Quiz
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      
      
      {/* Feedback Section - Conditional */}
      {!isHistoryView && !loading && !error && studyMaterials && ( // <-- Only show if not history view and loaded ok
        <div className="py-6 px-4 md:px-6">
          <div className="max-w-4xl mx-auto my-8">
            <h2 className="text-2xl font-bold font-heading mb-6 text-center">Your Feedback Matters</h2>
            <FeedbackForm />
          </div>
        </div>
      )}
      
      {/* Footer */}
      <footer className="py-6 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>© 2025 StudyGeni. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}