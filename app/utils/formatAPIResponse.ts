import { marked } from 'marked';
import { TokenSuggestions } from '../action/job_details_suggestions';

export async function formatJobTemplateWithHighlights(
  template: string,
  tokenValues?: TokenSuggestions
): Promise<string> {
  const highlighted = template.replace(
    /{{\s*([\w_]+)\s*}}/g,
    (_match, token) => {
      const replacement =
        tokenValues?.[token as keyof TokenSuggestions] ?? `[${token}]`;
      return `<span style="background-color: yellow;">${replacement}</span>`;
    }
  );

  const htmlOutput = await marked.parse(highlighted);

  return htmlOutput;
}
