'use server';

import OpenAI from 'openai';
import { AI_TOKEN_SUGGESTION_SYSTEM_PROMPT } from '../utils/aiTokenSuggestionSystemPrompt';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TokenSuggestions {
  job_title: string;
  contact_email: string;
  country: string;
  working_location: string;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

function validateInput(input: string): ValidationResult {
  if (!input) {
    return { isValid: false, error: 'Input is required for token suggestions' };
  }
  if (typeof input !== 'string') {
    return { isValid: false, error: 'Input must be a string' };
  }
  if (input.trim().length < 2) {
    return {
      isValid: false,
      error: 'Input must be at least 2 characters long',
    };
  }
  const maxLength = Number.parseInt(process.env.MAX_CONTENT_LENGTH || '1000');
  if (input.trim().length > maxLength) {
    return {
      isValid: false,
      error: `Input must be less than ${maxLength} characters`,
    };
  }

  const suspiciousPatterns = [
    /javascript:/i,
    /<script/i,
    /onclick/i,
    /onerror/i,
    /eval\(/i,
    /document\./i,
    /window\./i,
    /prompt\(/i,
    /alert\(/i,
    /confirm\(/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(input)) {
      return { isValid: false, error: 'Invalid characters detected in input' };
    }
  }
  return { isValid: true };
}

function sanitizeInput(input: string): string {
  const maxLength = Number.parseInt(process.env.MAX_CONTENT_LENGTH || '1000');
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .substring(0, maxLength);
}

function validateTokenSuggestions(suggestions: any): ValidationResult {
  if (!suggestions || typeof suggestions !== 'object') {
    return { isValid: false, error: 'Invalid suggestions format' };
  }

  const requiredKeys = [
    'job_title',
    'contact_email',
    'country',
    'working_location',
  ];
  for (const key of requiredKeys) {
    if (!suggestions[key] || typeof suggestions[key] !== 'string') {
      return { isValid: false, error: `Missing or invalid ${key} suggestion` };
    }
    if (suggestions[key].trim().length === 0) {
      return { isValid: false, error: `Empty suggestion for ${key}` };
    }
  }
  return { isValid: true };
}

export async function generateTokenSuggestions(input: string): Promise<{
  success: boolean;
  suggestions?: TokenSuggestions;
  error?: string;
}> {
  try {
    const validation = validateInput(input);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const sanitizedInput = sanitizeInput(input);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: AI_TOKEN_SUGGESTION_SYSTEM_PROMPT },
        { role: 'user', content: sanitizedInput },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      return { success: false, error: 'No suggestions generated' };
    }

    let suggestions: TokenSuggestions;
    try {
      suggestions = JSON.parse(response);
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse AI response',
      };
    }

    const suggestionsValidation = validateTokenSuggestions(suggestions);
    if (!suggestionsValidation.isValid) {
      return {
        success: false,
        error: suggestionsValidation.error,
      };
    }

    return {
      success: true,
      suggestions,
    };
  } catch (error: any) {
    let errorMessage = 'An error occurred while generating token suggestions';

    if (error.message?.includes('API key')) {
      errorMessage =
        'AI service authentication failed. Please check configuration.';
    } else if (
      error.message?.includes('rate limit') ||
      error.message?.includes('quota')
    ) {
      errorMessage = 'AI service rate limit exceeded. Please try again later.';
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Request timed out. Please try again.';
    } else if (
      error.message?.includes('network') ||
      error.message?.includes('fetch')
    ) {
      errorMessage =
        'Network error occurred. Please check your connection and try again.';
    }

    return { success: false, error: errorMessage };
  }
}
