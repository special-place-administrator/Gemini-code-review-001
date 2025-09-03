import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you'd want to handle this more gracefully,
  // but for this context, throwing an error is sufficient.
  // The environment variable is expected to be set externally.
  console.error("API_KEY environment variable not set. The app will not function.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const reviewCode = async (code: string, language: string): Promise<string> => {
  if (!code.trim()) {
    return "Please provide some code to review.";
  }
   if (!API_KEY) {
    return "Error: Gemini API key is not configured. Please contact the administrator.";
  }

  const prompt = `
    As an expert senior software engineer and code reviewer, please provide a thorough review of the following ${language} code snippet.

    Your review should be comprehensive and constructive. Structure your feedback into the following sections using Markdown formatting:
    1.  **Overall Assessment:** A brief summary of the code's quality, purpose, and adherence to best practices.
    2.  **Potential Bugs & Errors:** Identify any logical errors, edge cases not handled, or potential runtime exceptions.
    3.  **Performance Improvements:** Suggest optimizations to improve execution speed or reduce memory consumption.
    4.  **Security Vulnerabilities:** Point out any potential security risks (e.g., injection attacks, data exposure).
    5.  **Readability & Style:** Comment on code clarity, naming conventions, and adherence to ${language} style guides.
    6.  **Refactoring Suggestions:** Provide concrete examples of how the code could be refactored for better maintainability and structure.

    Format your response clearly using Markdown-style headings, bold text, and lists. Be specific in your feedback and provide corrected code examples in fenced code blocks where applicable.

    Here is the code to review:
    \`\`\`${language.toLowerCase()}
    ${code}
    \`\`\`
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error reviewing code with Gemini API:", error);
    if (error instanceof Error) {
        return `An error occurred while reviewing the code: ${error.message}`;
    }
    return "An unknown error occurred while reviewing the code.";
  }
};
