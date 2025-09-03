// The "worker" - maps file extensions and names to a language.
export const LANGUAGE_MAP: { [key: string]: string } = {
  // Extensions
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.py': 'Python',
  '.java': 'Java',
  '.cpp': 'C++',
  '.c': 'C',
  '.h': 'C',
  '.hpp': 'C++',
  '.cs': 'C#',
  '.go': 'Go',
  '.rs': 'Rust',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.swift': 'Swift',
  '.kt': 'Kotlin',
  '.sql': 'SQL',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'CSS',
  '.less': 'CSS',
  '.sh': 'Shell',
  '.bash': 'Shell',
  '.json': 'JSON',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.xml': 'XML',
  '.md': 'Markdown',
  '.dart': 'Dart',
  '.lua': 'Lua',
  '.pl': 'Perl',
  '.svelte': 'Svelte',
  '.vue': 'Vue',
  '.tf': 'Terraform',
  '.hcl': 'Terraform',
  '.gradle': 'Groovy',
  
  // Filenames (should be lowercase)
  'dockerfile': 'Dockerfile',
  'makefile': 'Makefile',
  'gemfile': 'Ruby',
  'pipfile': 'TOML',
  'requirements.txt': 'Text',
  'package.json': 'JSON',
  'package-lock.json': 'JSON',
  'yarn.lock': 'YAML',
  'composer.json': 'JSON',
  '.gitignore': 'Git',
  '.dockerignore': 'Git',
  'jenkinsfile': 'Groovy',
  'procfile': 'Text',
  '.env': 'Text',
  '.env.example': 'Text',
};

// Create a sorted, unique list of languages for the dropdown.
export const PROGRAMMING_LANGUAGES = [...new Set(Object.values(LANGUAGE_MAP))]
  .filter(lang => !['Git', 'Text', 'TOML', 'Markdown', 'JSON', 'YAML', 'XML'].includes(lang)) // Filter out non-code languages
  .sort();


/**
 * The language detection worker.
 * Determines the programming language of a file based on its path.
 * @param filePath The full path of the file.
 * @returns The detected language name, or null if not recognized.
 */
export const getLanguageForFile = (filePath: string): string | null => {
  const lowerFilePath = filePath.toLowerCase();
  const filename = lowerFilePath.split('/').pop() || '';

  // 1. Check for exact filename match (e.g., 'dockerfile', '.gitignore')
  if (LANGUAGE_MAP[filename]) {
    return LANGUAGE_MAP[filename];
  }

  // 2. Check for extension match (e.g., '.js', '.py')
  const extension = '.' + filename.split('.').pop();
  if (LANGUAGE_MAP[extension]) {
    return LANGUAGE_MAP[extension];
  }

  return null;
};


/**
 * Checks if a given file path is likely a reviewable source code file.
 * @param filePath The full path of the file.
 * @returns True if the file should be included for review, false otherwise.
 */
export const isReviewableFile = (filePath: string): boolean => {
  // A file is reviewable if we can determine its language.
  return getLanguageForFile(filePath) !== null;
};