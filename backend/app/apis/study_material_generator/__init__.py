import databutton as db
import google.generativeai as genai
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from enum import Enum
from typing import List, Optional, Union
import io
import fitz  # PyMuPDF
import re
from time import sleep

# Configure Gemini API Key (using secret)
# It's better to configure once if the key doesn't change per request often
# However, current setup allows overriding via request
# api_key = db.secrets.get("GEMINI_API_KEY")
# if api_key:
#     genai.configure(api_key=api_key)
# else:
#     print("Warning: GEMINI_API_KEY secret not set.")

# Initialize router
router = APIRouter()



# Define enums for request parameters
class InputMethod(str, Enum):
    TEXT = "text"
    TOPIC = "topic"
    FILE = "file"

class StudyPurpose(str, Enum):
    REVISION = "revision"
    DEEP_LEARNING = "deep-learning"
    EXAM_PREP = "exam-prep"

class DifficultyLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"

# Define request and response models
class StudyMaterialRequest(BaseModel):
    input_method: InputMethod
    content: Optional[str] = Field(None, description="Text content when input_method is 'text'")
    topic: Optional[str] = Field(None, description="Topic name when input_method is 'topic'")
    # file_content would be handled separately
    purpose: StudyPurpose
    difficulty_level: DifficultyLevel
    gemini_api_key: Optional[str] = None # Optional API key from user

class FlashcardModel(BaseModel):
    question: str
    answer: str

class QuizQuestionOption(BaseModel):
    option: str
    is_correct: bool

class QuizQuestionModel(BaseModel):
    question: str
    options: List[QuizQuestionOption]
    explanation: str = ""

class StudyMaterialResponse(BaseModel):
    summary: str
    flashcards: List[FlashcardModel]
    quiz: List[QuizQuestionModel]

# Helper function to retry API calls with exponential backoff
def with_retry(func, max_attempts=5, initial_delay=2):
    def wrapper(*args, **kwargs):
        attempts = 0
        delay = initial_delay
        
        while attempts < max_attempts:
            try:
                return func(*args, **kwargs)
            except Exception as e:
                attempts += 1
                if attempts >= max_attempts:
                    raise e
                print(f"Attempt {attempts} failed with error: {e}. Retrying in {delay} seconds...")
                sleep(delay)
                delay *= 2
    
    return wrapper

# Helper function to parse flashcards from Gemini response
def parse_flashcards(text):
    flashcards = []
    
    # Try to find flashcards in markdown format or other structured formats
    flashcard_pattern = re.compile(r'\*\*Q:\s*(.+?)\*\*\s*\*\*A:\s*(.+?)\*\*', re.DOTALL)
    matches = flashcard_pattern.findall(text)
    
    if matches:
        for question, answer in matches:
            flashcards.append(FlashcardModel(
                question=question.strip(),
                answer=answer.strip()
            ))
    else:
        # Alternative format
        flashcard_pattern = re.compile(r'\d+\.\s*Q:\s*(.+?)\s*A:\s*(.+?)(?=\d+\.\s*Q:|$)', re.DOTALL)
        matches = flashcard_pattern.findall(text)
        
        if matches:
            for question, answer in matches:
                flashcards.append(FlashcardModel(
                    question=question.strip(),
                    answer=answer.strip()
                ))
    
    return flashcards

# Helper function to parse quiz questions from Gemini response
def parse_quiz(text):
    quiz_questions = []
    
    # Regex pattern to find quiz questions with options and correct answers
    quiz_pattern = re.compile(r'\d+\.\s*(.+?)\s*(?:Options:|A\.)(.*?)(?:Correct answer|correct option|correct choice):?\s*([A-D])', re.DOTALL)
    matches = quiz_pattern.findall(text)
    
    if matches:
        for question, options_text, correct_answer in matches:
            # Parse options
            option_pattern = re.compile(r'([A-D])\.\s*(.+?)(?=[A-D]\.|$)', re.DOTALL)
            option_matches = option_pattern.findall(options_text)
            
            if option_matches:
                options = []
                for option_letter, option_text in option_matches:
                    options.append(QuizQuestionOption(
                        option=option_text.strip(),
                        is_correct=(option_letter == correct_answer)
                    ))
                
                quiz_questions.append(QuizQuestionModel(
                    question=question.strip(),
                    options=options
                ))
    
    return quiz_questions

# Helper function to generate content with prompt engineering
@with_retry
def generate_content(model, prompt):
    response = model.generate_content(prompt)
    return response.text

# Generate summary based on content and preferences
def generate_summary(model, content, purpose, difficulty_level):
    prompt = f"""
    Generate a comprehensive summary of the following content. 
    Keep in mind this is for {purpose} purposes at a {difficulty_level} level.
    
    Content: {content}
    
    Please provide a clear, well-structured summary that captures the key concepts and main ideas.
    Use appropriate language complexity for a {difficulty_level} level student.
    For revision purposes, focus on key points and memory aids.
    For deep learning, include more detailed explanations and connections between concepts.
    For exam preparation, emphasize key definitions, formulas, and potential test points.
    """
    
    return generate_content(model, prompt)

# Generate flashcards based on content and preferences
def generate_flashcards(model, content, purpose, difficulty_level):
    prompt = f"""
    Create 5-10 flashcards based on the following content.
    Keep in mind this is for {purpose} purposes at a {difficulty_level} level.
    
    Content: {content}
    
    Format each flashcard as follows:
    **Q: [Question]**
    **A: [Answer]**
    
    Make sure the questions test understanding at a {difficulty_level} level.
    For revision purposes, focus on key facts and important recall information.
    For deep learning, focus on conceptual understanding and applications.
    For exam preparation, focus on likely exam questions and key test points.
    """
    
    flashcards_text = generate_content(model, prompt)
    return parse_flashcards(flashcards_text)

# Generate quiz questions based on content and preferences
def generate_quiz(model, content, purpose, difficulty_level):
    prompt = f"""
    Create 5 multiple-choice quiz questions based on the following content.
    Keep in mind this is for {purpose} purposes at a {difficulty_level} level.
    
    Content: {content}
    
    Format each question as follows:
    1. [Question]
    Options:
    A. [Option 1]
    B. [Option 2]
    C. [Option 3]
    D. [Option 4]
    Correct answer: [A/B/C/D]
    
    Make sure the questions are at an appropriate {difficulty_level} level.
    For revision purposes, focus on testing recall of key facts.
    For deep learning, focus on testing deeper understanding and application.
    For exam preparation, mimic the style of exam questions for this subject.
    """
    
    quiz_text = generate_content(model, prompt)
    return parse_quiz(quiz_text)

# Helper function to generate content for a given topic
def generate_topic_content(model, topic, purpose, difficulty_level):
    prompt = f"""
    Generate comprehensive study material on the topic: {topic}.
    This should be suitable for {purpose} purposes at a {difficulty_level} level.
    
    Please provide a thorough explanation of the topic including key concepts,
    principles, examples, and applications as appropriate for the level.
    
    For a {difficulty_level} level:
    - Beginner: Use simple language, basic concepts, and clear explanations
    - Intermediate: Include more detailed concepts and some specialized terminology
    - Advanced: Cover complex aspects, detailed analysis, and specialized knowledge
    """
    
    return generate_content(model, prompt)

@router.post("/generate", response_model=StudyMaterialResponse)
async def generate_study_materials(request: StudyMaterialRequest):
    # Determine the API key to use
    api_key_to_use = request.gemini_api_key if request.gemini_api_key else db.secrets.get("GEMINI_API_KEY")
    
    if not api_key_to_use:
        raise HTTPException(
            status_code=400,
            detail="Gemini API key not found. Please provide one or configure it in secrets."
        )
        
    try:
        # Configure genai with the determined key for this request
        genai.configure(api_key=api_key_to_use)
        # Instantiate the model for this specific request
        model = genai.GenerativeModel('gemini-1.5-pro')
        
        # Get content based on input method
        if request.input_method == InputMethod.TEXT:
            if not request.content:
                raise HTTPException(status_code=400, detail="Content is required for text input method")
            content = request.content
        elif request.input_method == InputMethod.TOPIC:
            if not request.topic:
                raise HTTPException(status_code=400, detail="Topic is required for topic input method")
            content = generate_topic_content(
                model, # Pass the model instance
                request.topic, 
                request.purpose.value, 
                request.difficulty_level.value
            )
        else:  # FILE input method would be handled differently
            raise HTTPException(status_code=400, detail="File upload not supported in this endpoint")
        
        # Generate study materials using the request-specific model
        summary = generate_summary(
            model, # Pass the model instance
            content, 
            request.purpose.value, 
            request.difficulty_level.value
        )
        
        flashcards = generate_flashcards(
            model, # Pass the model instance
            content, 
            request.purpose.value, 
            request.difficulty_level.value
        )
        
        quiz = generate_quiz(
            model, # Pass the model instance
            content, 
            request.purpose.value, 
            request.difficulty_level.value
        )
        
        return StudyMaterialResponse(
            summary=summary,
            flashcards=flashcards,
            quiz=quiz
        )
    
    except Exception as e:
        # Log the error for debugging
        error_message = str(e)
        print(f"Error generating study materials: {error_message}")
        
        # Return appropriate error message based on error type
        if "rate limit" in error_message.lower() or "quota" in error_message.lower():
            # For demo purposes - generate mock data instead when rate limited
            print("Using mock data due to rate limits...")
            return generate_mock_study_materials(request)
        elif "invalid" in error_message.lower() or "api key" in error_message.lower() or "credentials" in error_message.lower():
            raise HTTPException(status_code=401, detail="Invalid API key or authentication error.")
        else:
            raise HTTPException(status_code=500, detail=f"Error generating study materials: {error_message}")

# Generate mock study materials for demo purposes when API rate limits are hit
def generate_mock_study_materials(request: StudyMaterialRequest) -> StudyMaterialResponse:
    # Determine what content we're dealing with
    content_type = "general"
    content_topic = "study materials"
    
    if request.input_method == InputMethod.TEXT and request.content:
        # Extract a topic from the first few words
        words = request.content.split()[:10]
        content_topic = " ".join(words)[:30] + "..."
    elif request.input_method == InputMethod.TOPIC and request.topic:
        content_topic = request.topic
    
    # Generate a mock summary based on the topic
    summary = f"This is a summary about {content_topic}. It is designed for {request.purpose.value} at a {request.difficulty_level.value} level.\n\n"
    summary += "The study material covers the key concepts and important aspects of the topic. "
    summary += "It includes definitions, examples, and applications that are relevant to the subject matter. "
    summary += "The content is organized in a logical sequence, starting with fundamental concepts and building towards more complex ideas."
    
    # Generate mock flashcards
    flashcards = [
        FlashcardModel(question=f"What is {content_topic}?", answer=f"{content_topic.capitalize()} is a subject that covers important concepts in this field."),
        FlashcardModel(question=f"Why is {content_topic} important?", answer=f"It's important because it forms the foundation of understanding in this area of study."),
        FlashcardModel(question=f"Name a key concept in {content_topic}.", answer="One key concept is the relationship between theory and application in real-world scenarios."),
        FlashcardModel(question="What are the main components to consider?", answer="The main components include theoretical frameworks, practical applications, and analytical methods."),
        FlashcardModel(question="How can you apply this knowledge?", answer="This knowledge can be applied through case studies, problem-solving exercises, and real-world projects.")
    ]
    
    # Generate mock quiz questions
    quiz = [
        QuizQuestionModel(
            question=f"What best describes {content_topic}?",
            options=[
                QuizQuestionOption(option=f"A systematic approach to understanding {content_topic}", is_correct=True),
                QuizQuestionOption(option="An abstract concept with no practical applications", is_correct=False),
                QuizQuestionOption(option="A historical perspective only", is_correct=False),
                QuizQuestionOption(option="A mathematical formula", is_correct=False)
            ],
            explanation=f"The correct answer provides a comprehensive view of what {content_topic} encompasses."
        ),
        QuizQuestionModel(
            question=f"Which of the following is NOT a key aspect of {content_topic}?",
            options=[
                QuizQuestionOption(option="Theoretical foundation", is_correct=False),
                QuizQuestionOption(option="Practical application", is_correct=False),
                QuizQuestionOption(option="Unrelated concepts from other fields", is_correct=True),
                QuizQuestionOption(option="Critical analysis", is_correct=False)
            ],
            explanation="While the subject integrates knowledge from various fields, unrelated concepts are not considered key aspects."
        ),
        QuizQuestionModel(
            question="What approach is most effective when studying this subject?",
            options=[
                QuizQuestionOption(option="Memorization only", is_correct=False),
                QuizQuestionOption(option="Practical application combined with theoretical understanding", is_correct=True),
                QuizQuestionOption(option="Ignoring the fundamentals", is_correct=False),
                QuizQuestionOption(option="Studying unrelated materials", is_correct=False)
            ],
            explanation="A balanced approach that combines theory with practice leads to better comprehension and retention."
        ),
        QuizQuestionModel(
            question="Which statement is true about this topic?",
            options=[
                QuizQuestionOption(option="It has no real-world applications", is_correct=False),
                QuizQuestionOption(option="It's only relevant in academic settings", is_correct=False),
                QuizQuestionOption(option="It's an interdisciplinary field with broad applications", is_correct=True),
                QuizQuestionOption(option="It's too complex for practical use", is_correct=False)
            ],
            explanation="The interdisciplinary nature of the topic makes it applicable across various fields and settings."
        ),
        QuizQuestionModel(
            question="What is a common misconception about this subject?",
            options=[
                QuizQuestionOption(option="It's only theoretical with no practical value", is_correct=True),
                QuizQuestionOption(option="It requires extensive study to understand basics", is_correct=False),
                QuizQuestionOption(option="It's a fundamental concept in education", is_correct=False),
                QuizQuestionOption(option="It's constantly evolving with new research", is_correct=False)
            ],
            explanation="The most common misconception is that theoretical knowledge doesn't translate to practical skills, which is false."
        )
    ]
    
    return StudyMaterialResponse(
        summary=summary,
        flashcards=flashcards,
        quiz=quiz
    )

# Add the new file upload endpoint
@router.post("/process-file-upload", response_model=StudyMaterialResponse)
async def process_file_upload(
    file: UploadFile = File(...),
    purpose: StudyPurpose = Form(...),
    difficulty_level: DifficultyLevel = Form(...),
    gemini_api_key: Optional[str] = Form(None)
):
    """Handles PDF/TXT file upload, extracts text, and generates study materials."""
    extracted_text = ""
    try:
        file_content_bytes = await file.read()

        if file.content_type == "application/pdf":
            try:
                # Use io.BytesIO to treat the bytes as a file-like object for fitz
                pdf_document = fitz.open(stream=io.BytesIO(file_content_bytes), filetype="pdf")
                for page_num in range(len(pdf_document)):
                    page = pdf_document.load_page(page_num)
                    extracted_text += page.get_text()
                pdf_document.close()
                print(f"Extracted {len(extracted_text)} characters from PDF.")
            except Exception as pdf_error:
                print(f"PDF processing error: {pdf_error}")
                raise HTTPException(status_code=400, detail=f"Error processing PDF file: {pdf_error}")

        elif file.content_type == "text/plain":
            try:
                extracted_text = file_content_bytes.decode("utf-8")
                print(f"Read {len(extracted_text)} characters from TXT.")
            except UnicodeDecodeError:
                # Try decoding with latin-1 as a fallback
                try:
                    extracted_text = file_content_bytes.decode("latin-1")
                    print(f"Read {len(extracted_text)} characters from TXT (Latin-1 fallback).")
                except Exception as decode_error:
                     print(f"File decoding error: {decode_error}")
                     raise HTTPException(status_code=400, detail=f"Could not decode text file. Ensure it's UTF-8 or Latin-1 encoded: {decode_error}")
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type ({file.content_type}). Please upload PDF or TXT.")

        if not extracted_text.strip():
             raise HTTPException(status_code=400, detail="File seems empty or text could not be extracted.")

        # ---- Reuse existing Gemini logic ----
        api_key_to_use = gemini_api_key if gemini_api_key else db.secrets.get("GEMINI_API_KEY")
        if not api_key_to_use:
            raise HTTPException(
                status_code=400,
                detail="Gemini API key not found. Please provide one or configure it in secrets."
            )

        try:
            genai.configure(api_key=api_key_to_use)
            # Select the appropriate model - consider making this configurable or using a specific version
            model = genai.GenerativeModel('gemini-1.5-flash') # Using flash for potentially faster/cheaper generation
            print(f"Using model: {model.model_name} for file processing")

            # Generate study materials using the extracted text
            summary = generate_summary(
                model,
                extracted_text,
                purpose.value,
                difficulty_level.value
            )

            flashcards = generate_flashcards(
                model,
                extracted_text,
                purpose.value,
                difficulty_level.value
            )

            quiz = generate_quiz(
                model,
                extracted_text,
                purpose.value,
                difficulty_level.value
            )

            return StudyMaterialResponse(
                summary=summary,
                flashcards=flashcards,
                quiz=quiz
            )
        except Exception as gemini_error:
            # Handle specific Gemini errors
            error_message = str(gemini_error)
            print(f"Gemini API error during file processing: {error_message}")
            if "rate limit" in error_message.lower() or "quota" in error_message.lower():
                 raise HTTPException(status_code=429, detail="API rate limit exceeded. Please try again later.")
            elif "invalid" in error_message.lower() or "api key" in error_message.lower() or "credentials" in error_message.lower():
                raise HTTPException(status_code=401, detail="Invalid API key or authentication error.")
            # Add more specific Gemini error checks if needed
            # e.g., check for content filtering errors, etc.
            else:
                raise HTTPException(status_code=500, detail=f"Error generating study materials: {error_message}")

    except HTTPException as http_exc:
        # Re-raise known HTTPExceptions
        raise http_exc
    except Exception as e:
        error_message = str(e)
        print(f"Unexpected error processing file upload: {error_message}")
        raise HTTPException(status_code=500, detail=f"Error processing file: {error_message}")

