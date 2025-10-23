// Global Chrome Built-in AI API declarations
// This ensures LanguageModel is available globally across all files

declare const LanguageModel: {
  capabilities(): Promise<{
    available: 'readily' | 'after-download' | 'no';
    defaultTemperature?: number;
    defaultTopK?: number;
    maxTopK?: number;
  }>;
  create(options?: {
    systemPrompt?: string;
    temperature?: number;
    topK?: number;
  }): Promise<{
    prompt(input: string): Promise<string>;
    destroy(): void;
  }>;
};

// Chrome Extension APIs
/// <reference types="chrome"/>