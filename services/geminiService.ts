import { GoogleGenAI } from "@google/genai";

export const reviewCode = async (apiKey: string, code: string, language: string, filePath?: string): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please provide it in the Settings tab.");
  }
  if (!code.trim()) {
    return "Please provide some code to review.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const fileContext = filePath ? `The following code is from the file: \`${filePath}\`.` : '';

  const prompt = `
    As an expert senior software engineer and code reviewer, please provide a thorough review of the following ${language} code.
    ${fileContext}
    
    Your review should be comprehensive and constructive. Structure your feedback into the following sections using Markdown formatting:
    1.  **Overall Assessment:** A brief summary of the code's quality, purpose, and adherence to best practices.
    2.  **Potential Bugs & Errors:** Identify any logical errors, edge cases not handled, or potential runtime exceptions.
    3.  **Performance Improvements:** Suggest optimizations to improve execution speed or reduce memory consumption.
    4.  **Security Vulnerabilities:** Point out any potential security risks (e.g., injection attacks, data exposure).
    5.  **Readability & Style:** Comment on code clarity, naming conventions, and adherence to ${language} style guides.
    6.  **Refactoring Suggestions:** Provide concrete examples of how the code could be refactored for better maintainability and structure.

    Format your response clearly using Markdown-style headings, bold text, and lists. Be specific in your feedback and provide corrected code examples in fenced code blocks where applicable.

    **IMPORTANT:** If you find no significant issues, bugs, or areas for improvement, please respond with the exact phrase "No issues found." and nothing else.

    Here is the code to review:
    \`\`\`${language.toLowerCase()}
    ${code}
    \`\`\`
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        // Lower temperature for more deterministic and factual code reviews
        temperature: 0.2,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error reviewing code with Gemini API:", error);
    if (error instanceof Error) {
        // Provide a more user-friendly error message
        if (error.message.includes('API key not valid')) {
            return "Error: The Gemini API key you provided is invalid. Please check it in the Settings tab.";
        }
        return `An error occurred while communicating with the API: ${error.message}`;
    }
    return "An unknown error occurred while reviewing the code.";
  }
};
