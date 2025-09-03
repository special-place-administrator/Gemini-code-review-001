export const PROGRAMMING_LANGUAGES = [
  "JavaScript",
  "TypeScript",
 "Python",
  "Java",
  "C++",
  "C#",
  "Go",
  "Rust",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
  "SQL",
  "HTML",
  "CSS",
  "Shell",
  "Dockerfile",
];

// Set of file extensions to be considered for review.
const REVIEWABLE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.h', '.hpp',
  '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.sql', '.html',
  '.css', '.scss', '.less', '.vue', '.svelte', '.md', '.json', '.yaml', '.yml',
  '.sh', '.bash', '.toml', '.xml', '.env.example', '.gitignore'
]);

// Set of specific filenames to be considered for review.
const REVIEWABLE_FILENAMES = new Set([
  'dockerfile',
  'makefile',
  'gemfile',
  'package.json',
  'composer.json',
  'requirements.txt'
]);

/**
 * Checks if a given file path is likely a reviewable source code file.
 * @param filePath The full path of the file.
 * @returns True if the file should be included for review, false otherwise.
 */
export const isReviewableFile = (filePath: string): boolean => {
  const lowerFilePath = filePath.toLowerCase();
  const extension = '.' + lowerFilePath.split('.').pop();
  const filename = lowerFilePath.split('/').pop() || '';

  if (REVIEWABLE_FILENAMES.has(filename)) {
    return true;
  }
  
  if (REVIEWABLE_EXTENSIONS.has(extension)) {
    return true;
  }
  
  return false;
};
