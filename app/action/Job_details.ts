'use server';

import OpenAI from 'openai';
import AI_JOB_DESCRIPTION_SYSTEM_PROMPT from '../utils/aiJobdescriptionSystemPrompt';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface MissingFieldsInterface {
  fieldName: string;
  description: string;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

const placeholderFieldMap: Record<
  string,
  { fieldName: string; description: string }
> = {
  '{{contact_email}}': {
    fieldName: 'Contact Email',
    description: 'Contact email address for applicants',
  },
  '{{job_title}}': {
    fieldName: 'Job Title',
    description: 'Title of the job/role',
  },
  '{{country}}': {
    fieldName: 'Country',
    description: 'Country where the job is located',
  },
  '{{working_location}}': {
    fieldName: 'Working Location',
    description: 'Specific working arrangement (remote, hybrid, on-site, etc.)',
  },
};

function validateInput(query: string): ValidationResult {
  if (!query) {
    return { isValid: false, error: 'Job description query is required' };
  }

  if (typeof query !== 'string') {
    return { isValid: false, error: 'Job description query must be a string' };
  }

  if (query.trim().length < 3) {
    return {
      isValid: false,
      error: 'Job description query must be at least 3 characters long',
    };
  }

  const AI_MAX_LENGTH = 2000;

  if (query.trim().length > AI_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Job description query must be less than ${AI_MAX_LENGTH} characters`,
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
    if (pattern.test(query)) {
      return { isValid: false, error: 'Invalid characters detected in query' };
    }
  }

  return { isValid: true };
}

function sanitizeInput(input: string): string {
  const maxLength = Number.parseInt(process.env.MAX_CONTENT_LENGTH || '2000');
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .substring(0, maxLength);
}

// Simple non-streaming server action

export async function generateJobDescription(query: string): Promise<{
  success: boolean;
  content?: string;
  error?: string;
  missingFields?: Array<MissingFieldsInterface>;
}> {
  try {
    const validation = validateInput(query);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const sanitizedQuery = sanitizeInput(query);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: AI_JOB_DESCRIPTION_SYSTEM_PROMPT },
        { role: 'user', content: sanitizedQuery },
      ],
      max_tokens: 2500,
      temperature: 0.7,
    });

    const fullJobDescription = completion.choices[0]?.message?.content || '';

    const requiredPlaceholders = [
      '{{contact_email}}',
      '{{job_title}}',
      '{{country}}',
      '{{working_location}}',
    ];

    const missingPlaceholders = requiredPlaceholders.filter(
      (ph) => !fullJobDescription.includes(ph)
    );

    if (missingPlaceholders.length > 0) {
      const missingFields = missingPlaceholders.map(
        (ph) => placeholderFieldMap[ph]
      );
      return {
        success: false,
        error:
          'Generated job description is missing required placeholder tokens',
        missingFields,
      };
    }

    return {
      success: true,
      content: fullJobDescription,
    };
  } catch (error: any) {
    console.error('Error generating job description:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// Streaming server action using async generator (alternative approach)
// export async function* generateJobDescriptionStream(query: string) {
//   try {
//     // Validate input
//     const validation = validateInput(query);
//     if (!validation.isValid) {
//       yield { type: 'error', error: validation.error };
//       return;
//     }

//     const sanitizedQuery = sanitizeInput(query);

//     yield {
//       type: 'connected',
//       message: 'Starting job description generation...',
//     };

//     let fullJobDescription = '';

//     const completion = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       messages: [
//         {
//           role: 'system',
//           content: AI_JOB_DESCRIPTION_SYSTEM_PROMPT,
//         },
//         {
//           role: 'user',
//           content: sanitizedQuery,
//         },
//       ],
//       max_tokens: 2500,
//       temperature: 0.7,
//       stream: true,
//     });

//     // Stream the text chunks
//     for await (const chunk of completion) {
//       const delta = chunk.choices[0]?.delta?.content || '';
//       if (delta) {
//         fullJobDescription += delta;
//         yield {
//           type: 'chunk',
//           content: delta,
//           fullContent: fullJobDescription,
//         };
//       }
//     }

//     // Check for required placeholders
//     const requiredPlaceholders: string[] = [
//       '{{contact_email}}',
//       '{{job_title}}',
//       '{{country}}',
//       '{{working_location}}',
//     ];

//     const missingPlaceholders = requiredPlaceholders.filter(
//       (placeholder) => !fullJobDescription.includes(placeholder)
//     );

//     if (missingPlaceholders.length > 0) {
//       const missingFields = missingPlaceholders.map(
//         (ph) => placeholderFieldMap[ph]
//       );

//       yield {
//         type: 'error',
//         error:
//           'Generated job description is missing required placeholder tokens',
//         missingFields,
//       };
//     } else {
//       yield {
//         type: 'complete',
//         message: 'Job description generated successfully!',
//         fullContent: fullJobDescription,
//       };
//     }
//   } catch (error: unknown) {
//     console.error('Error generating job description:', error);

//     let errorMessage = 'An error occurred while generating the job description';

//     if (error instanceof Error) {
//       if (error.message?.includes('API key')) {
//         errorMessage =
//           'AI service authentication failed. Please check configuration.';
//       } else if (
//         error.message?.includes('rate limit') ||
//         error.message?.includes('quota')
//       ) {
//         errorMessage =
//           'AI service rate limit exceeded. Please try again later.';
//       } else if (error.message?.includes('timeout')) {
//         errorMessage = 'Request timed out. Please try again.';
//       } else if (
//         error.message?.includes('network') ||
//         error.message?.includes('fetch')
//       ) {
//         errorMessage =
//           'Network error occurred. Please check your connection and try again.';
//       }
//     }

//     yield {
//       type: 'error',
//       error: errorMessage,
//     };
//   }
// }
