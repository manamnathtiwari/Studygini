import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import brain from "brain";

interface Props {
  className?: string;
}

export function FeedbackForm({ className = "" }: Props) {
  const [feedbackText, setFeedbackText] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedbackText.trim()) {
      toast.error("Please enter your feedback");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Submit feedback to backend using the brain client
      const response = await brain.send_feedback({
        feedback: feedbackText,
        name: name,
        email: email
      });
      
      if (response.ok) {
        toast.success("Thank you for your feedback!");
        setFeedbackText("");
        setEmail("");
        setName("");
      } else {
        toast.error("Failed to send feedback. Please try again.");
      }
    } catch (error) {
      console.error("Error sending feedback:", error);
      toast.error("An error occurred while sending feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-6 shadow-sm ${className}`}>
      <h3 className="text-xl font-bold font-heading mb-4">Feedback</h3>
      <p className="text-muted-foreground mb-4">We'd love to hear your thoughts about StudyGeni!</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Name (optional)</Label>
          <Input 
            id="name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Your name"
          />
        </div>
        
        <div>
          <Label htmlFor="email">Email (optional)</Label>
          <Input 
            id="email" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="Your email address"
          />
        </div>
        
        <div>
          <Label htmlFor="feedback">Your Feedback</Label>
          <Textarea 
            id="feedback" 
            value={feedbackText} 
            onChange={(e) => setFeedbackText(e.target.value)} 
            placeholder="What do you think about StudyGeni? Any suggestions for improvement?"
            rows={4}
            className="resize-none"
            required
          />
        </div>
        
        <Button 
          type="submit" 
          disabled={isSubmitting} 
          className="flex items-center gap-2"
        >
          {isSubmitting ? (
            <>Sending...</>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send Feedback
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
