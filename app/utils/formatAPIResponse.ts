import { TokenSuggestions } from '../action/job_details_suggestions';

type TokenMap = {
  [key: string]: string;
};

export function formatJobTemplateWithHighlights(
  template: string,
  data: TokenSuggestions
): string {
  // Replace known tokens with actual values
  let formatted = template;

  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    formatted = formatted.replace(regex, value);
  }

  // Highlight any remaining {{token}} placeholders in yellow background
  formatted = formatted.replace(/{{\s*([\w_]+)\s*}}/g, (_match, token) => {
    return `<span style="background-color: yellow;">{{${token}}}</span>`;
  });

  return formatted;
}
