/** Body_process_file_upload */
export interface BodyProcessFileUpload {
  /**
   * File
   * @format binary
   */
  file: File;
  purpose: StudyPurpose;
  difficulty_level: DifficultyLevel;
  /** Gemini Api Key */
  gemini_api_key?: string | null;
}

/** DifficultyLevel */
export enum DifficultyLevel {
  Beginner = "beginner",
  Intermediate = "intermediate",
  Advanced = "advanced",
}

/** FeedbackRequest */
export interface FeedbackRequest {
  /**
   * Feedback
   * The feedback text
   */
  feedback: string;
  /**
   * Name
   * The user's name
   */
  name?: string | null;
  /**
   * Email
   * The user's email
   */
  email?: string | null;
}

/** FeedbackResponse */
export interface FeedbackResponse {
  /**
   * Success
   * Whether the feedback was sent successfully
   */
  success: boolean;
  /**
   * Message
   * A message about the feedback status
   */
  message: string;
}

/** FlashcardModel */
export interface FlashcardModel {
  /** Question */
  question: string;
  /** Answer */
  answer: string;
}

/** HTTPValidationError */
export interface HTTPValidationError {
  /** Detail */
  detail?: ValidationError[];
}

/** HealthResponse */
export interface HealthResponse {
  /** Status */
  status: string;
}

/** InputMethod */
export enum InputMethod {
  Text = "text",
  Topic = "topic",
  File = "file",
}

/** QuizQuestionModel */
export interface QuizQuestionModel {
  /** Question */
  question: string;
  /** Options */
  options: QuizQuestionOption[];
  /**
   * Explanation
   * @default ""
   */
  explanation?: string;
}

/** QuizQuestionOption */
export interface QuizQuestionOption {
  /** Option */
  option: string;
  /** Is Correct */
  is_correct: boolean;
}

/** StudyMaterialRequest */
export interface StudyMaterialRequest {
  input_method: InputMethod;
  /**
   * Content
   * Text content when input_method is 'text'
   */
  content?: string | null;
  /**
   * Topic
   * Topic name when input_method is 'topic'
   */
  topic?: string | null;
  purpose: StudyPurpose;
  difficulty_level: DifficultyLevel;
  /** Gemini Api Key */
  gemini_api_key?: string | null;
}

/** StudyMaterialResponse */
export interface StudyMaterialResponse {
  /** Summary */
  summary: string;
  /** Flashcards */
  flashcards: FlashcardModel[];
  /** Quiz */
  quiz: QuizQuestionModel[];
}

/** StudyPurpose */
export enum StudyPurpose {
  Revision = "revision",
  DeepLearning = "deep-learning",
  ExamPrep = "exam-prep",
}

/** ValidationError */
export interface ValidationError {
  /** Location */
  loc: (string | number)[];
  /** Message */
  msg: string;
  /** Error Type */
  type: string;
}

export type CheckHealthData = HealthResponse;

export type SendFeedbackData = FeedbackResponse;

export type SendFeedbackError = HTTPValidationError;

export type GenerateStudyMaterialsData = StudyMaterialResponse;

export type GenerateStudyMaterialsError = HTTPValidationError;

export type ProcessFileUploadData = StudyMaterialResponse;

export type ProcessFileUploadError = HTTPValidationError;
