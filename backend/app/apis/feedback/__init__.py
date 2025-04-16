import databutton as db
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
import time

# Initialize router
router = APIRouter()

# Feedback request model
class FeedbackRequest(BaseModel):
    feedback: str = Field(..., description="The feedback text")
    name: Optional[str] = Field(None, description="The user's name")
    email: Optional[str] = Field(None, description="The user's email")

# Feedback response model
class FeedbackResponse(BaseModel):
    success: bool = Field(..., description="Whether the feedback was sent successfully")
    message: str = Field(..., description="A message about the feedback status")

@router.post("/send-feedback", response_model=FeedbackResponse)
def send_feedback(request: FeedbackRequest):
    """Send feedback via email"""
    try:
        # Format the email content
        subject = f"StudyGeni Feedback {int(time.time())}"
        
        # Format email body
        email_content = f"""<html>
        <body>
            <h2>New Feedback from StudyGeni</h2>
            
            <p><strong>From:</strong> {request.name or 'Anonymous'}</p>
            <p><strong>Email:</strong> {request.email or 'Not provided'}</p>
            
            <h3>Feedback:</h3>
            <p>{request.feedback}</p>
            
            <hr>
            <p>This email was sent from the StudyGeni feedback system.</p>
        </body>
        </html>"""
        
        # Plain text version
        text_content = f"""
        New Feedback from StudyGeni
        
        From: {request.name or 'Anonymous'}
        Email: {request.email or 'Not provided'}
        
        Feedback:
        {request.feedback}
        
        ---
        This email was sent from the StudyGeni feedback system.
        """
        
        # Send the email using Databutton's email service
        db.notify.email(
            to="manamnathtiwari@gmail.com",
            subject=subject,
            content_html=email_content,
            content_text=text_content,
        )
        
        return FeedbackResponse(
            success=True,
            message="Feedback sent successfully"
        )
        
    except Exception as e:
        print(f"Error sending feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send feedback: {str(e)}")
