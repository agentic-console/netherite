// TypeScript declarations for Chrome's Built-in AI APIs (Gemini Nano)

export interface LanguageModelCapabilities {
  available: 'readily' | 'after-download' | 'no';
  defaultTemperature?: number;
  defaultTopK?: number;
  maxTopK?: number;
}

export interface LanguageModelSession {
  prompt(input: string): Promise<string>;
  destroy(): void;
}

export interface LanguageModelCreateOptions {
  systemPrompt?: string;
  temperature?: number;
  topK?: number;
}

export interface AILanguageModel {
  create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
}

export interface WindowAI {
  languageModel: AILanguageModel;
}

declare global {
  interface Window {
    ai?: WindowAI;
  }
  
  // Global access to LanguageModel (Chrome's implementation)
  const LanguageModel: AILanguageModel;
}

// Chrome Extension specific types
export interface StoredDocument {
  name: string;
  content: string;
  uploadDate: number;
  size: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface DetectedFormField {
  element: HTMLElement;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  maxLength?: number;
}

export interface FormAnalysis {
  purpose: string;
  fields: DetectedFormField[];
  summary: string;
  requiredFields: string[];
}

export interface GeneratedAnswer {
  fieldLabel: string;
  fieldType: string;
  answer: string;
  confidence: number;
}

// UI Component Events
export interface ToolbarEvents {
  'view-clicked': CustomEvent;
  'chat-clicked': CustomEvent;
  'voice-clicked': CustomEvent;
}

export interface ChatEvents {
  'message-sent': CustomEvent<{ message: string }>;
  'document-referenced': CustomEvent<{ docName: string }>;
  'answers-generated': CustomEvent<{ answers: GeneratedAnswer[] }>;
  'apply-requested': CustomEvent<{ answers: GeneratedAnswer[] }>;
}

// Mode types for AI service
export type AIMode = 'view' | 'chat' | 'rewrite';

export {};