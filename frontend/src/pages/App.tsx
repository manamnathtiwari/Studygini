import React from "react";
import { useNavigate } from "react-router-dom";
import { FeedbackForm } from "components/FeedbackForm";

export default function App() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/Study");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-primary font-heading">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">StudyGeni</span>
            </h1>
            <p className="text-xl md:text-2xl font-medium text-muted-foreground mt-4 font-heading">
              Transform any content into effective study materials in seconds
            </p>
          </div>

          <div className="mt-12 max-w-3xl mx-auto text-center">
            <p className="text-lg text-muted-foreground mb-8 font-content">
              Instantly convert your notes, textbooks, or any topic into summaries, flashcards, and quizzes using AI — no account required.
            </p>

            <button
              onClick={handleGetStarted}
              className="px-8 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium text-lg shadow-md hover:shadow-lg transform transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 font-heading hover-lift"
            >
              Generate Study Kit
            </button>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto bg-secondary/30 rounded-lg my-12">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 font-heading">How StudyGeni Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-card rounded-lg p-6 shadow-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <span className="text-3xl">📝</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 font-heading">Enter Your Content</h3>
              <p className="text-muted-foreground font-content">
                Paste text, type a topic, or upload study material (PDF/TXT).
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-card rounded-lg p-6 shadow-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <span className="text-3xl">🧠</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Customize</h3>
              <p className="text-muted-foreground">
                Select your learning purpose and preferred difficulty level.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-card rounded-lg p-6 shadow-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <span className="text-3xl">✨</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Generate & Learn</h3>
              <p className="text-muted-foreground">
                Get AI-powered summaries, flashcards, and quizzes instantly.
              </p>
            </div>
          </div>
        </section>

        {/* Output Types Section */}
        <section className="py-16 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto my-12">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 font-heading">Study Your Way</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Output 1 */}
            <div className="bg-card rounded-lg p-6 shadow-sm border border-border hover:border-primary/50 transition-colors duration-200 hover-lift">
              <h3 className="text-xl font-semibold mb-4 flex items-center font-heading">
                <span className="mr-2">✨</span> Summary
              </h3>
              <p className="text-muted-foreground">
                Concise, easy-to-read explanations that capture the most important concepts.
              </p>
            </div>

            {/* Output 2 */}
            <div className="bg-card rounded-lg p-6 shadow-sm border border-border hover:border-primary/50 transition-colors duration-200">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="mr-2">🧠</span> Flashcards
              </h3>
              <p className="text-muted-foreground">
                Interactive Q&A cards that help reinforce key information through active recall.
              </p>
            </div>

            {/* Output 3 */}
            <div className="bg-card rounded-lg p-6 shadow-sm border border-border hover:border-primary/50 transition-colors duration-200">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="mr-2">📝</span> Quiz
              </h3>
              <p className="text-muted-foreground">
                Multiple-choice questions to test your knowledge with immediate feedback.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto text-center my-12">
          <div className="bg-gradient-to-r from-indigo-500/10 to-purple-600/10 rounded-xl py-12 px-4 md:px-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 font-heading">Ready to elevate your learning?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto font-content">
              Start creating personalized study materials in seconds with the power of AI.
            </p>
            <button
              onClick={handleGetStarted}
              className="px-8 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium text-lg shadow-md hover:shadow-lg transform transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 font-heading hover-lift"
            >
              Generate Study Kit
            </button>
          </div>
        </section>
      </main>

      {/* Feedback Section */}
      <section className="py-16 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto my-12">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 font-heading">Your Feedback Matters</h2>
        <div className="max-w-2xl mx-auto">
          <FeedbackForm />
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-6 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>© 2025 StudyGeni. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
