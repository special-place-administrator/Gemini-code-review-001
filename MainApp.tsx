import React, { useState, useCallback, useEffect } from 'react';
import { marked } from 'marked';
import { reviewCode } from './services/geminiService';
import { fetchRepoFileTree, getFileContent, parseGitHubUrl } from './services/githubService';
import { PROGRAMMING_LANGUAGES, isReviewableFile, getLanguageForFile } from './constants';

import CopyButton from './components/CopyButton';
import Loader from './components/Loader';
import { PasteIcon } from './components/icons/PasteIcon';
import { GitIcon } from './components/icons/GitIcon';
import { CodeIcon } from './components/icons/CodeIcon';
import { SettingsIcon } from './components/icons/SettingsIcon';

type ViewMode = 'settings' | 'paste' | 'repo';

interface FileReview {
  path: string;
  rawFeedback: string;
  htmlFeedback: string;
}

interface FileError {
    path: string;
    error: string;
}

const GITHUB_URL_REGEX = /^https:\/\/github\.com\/[^/]+\/[^/]+(\/)?$/;

// Moved NavButton outside the MainApp component to prevent it from being
// recreated on every render, which is more performant.
const NavButton = ({ mode, currentMode, setMode, children, label }: { mode: ViewMode, currentMode: ViewMode, setMode: (mode: ViewMode) => void, children: React.ReactNode, label: string }) => (
  <button onClick={() => setMode(mode)} className={`flex flex-col items-center justify-center text-center w-20 p-2 rounded-lg transition-colors ${currentMode === mode ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-gray-700'}`} aria-label={label}>
   {children}
   <span className="text-xs mt-1">{label}</span>
  </button>
);


const MainApp = () => {
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem('gemini-api-key'));
  const [tempApiKey, setTempApiKey] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('settings');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for 'Paste Code' mode
  const [pasteCode, setPasteCode] = useState('');
  const [pasteLanguage, setPasteLanguage] = useState(PROGRAMMING_LANGUAGES[0] || 'JavaScript');
  const [pasteFeedback, setPasteFeedback] = useState<{ raw: string; html: string } | null>(null);

  // State for 'Git Repo' mode
  const [repoUrl, setRepoUrl] = useState('');
  const [isRepoUrlValid, setIsRepoUrlValid] = useState(true);
  const [repoReviews, setRepoReviews] = useState<FileReview[]>([]);
  const [repoErrors, setRepoErrors] = useState<FileError[]>([]);
  const [repoProgress, setRepoProgress] = useState<{ current: number; total: number } | null>(null);
  const [repoScanSummary, setRepoScanSummary] = useState<{ total: number; analyzed: number; withIssues: number; errors: number } | null>(null);

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('gemini-api-key', apiKey);
      setTempApiKey(apiKey);
      // If key is set, move away from settings to a useful tab
      if (viewMode === 'settings') {
          setViewMode('paste');
      }
    } else {
      localStorage.removeItem('gemini-api-key');
      setViewMode('settings');
    }
  }, [apiKey, viewMode]);
  
  const handleSaveApiKey = () => {
      if (tempApiKey.trim()) {
          setApiKey(tempApiKey.trim());
          alert('API Key saved successfully!');
      }
  };
  
  const handleClearApiKey = () => {
      setApiKey(null);
      setTempApiKey('');
  };


  const handleRepoUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setRepoUrl(newUrl);
    setIsRepoUrlValid(GITHUB_URL_REGEX.test(newUrl) || newUrl === '');
  }, []);

  const handleReviewPaste = useCallback(async () => {
    if (!apiKey) {
        setError("API Key is not set. Please set it in the Settings tab.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setPasteFeedback(null);
    try {
      const result = await reviewCode(apiKey, pasteCode, pasteLanguage);
      const html = await marked.parse(result);
      setPasteFeedback({ raw: result, html });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, pasteCode, pasteLanguage]);
  
  const handleAutonomousReview = useCallback(async () => {
      if (!apiKey) {
        setError("API Key is not set. Please set it in the Settings tab.");
        return;
      }
      if (!isRepoUrlValid || !repoUrl) return;

      setIsLoading(true);
      setError(null);
      setRepoReviews([]);
      setRepoErrors([]);
      setRepoScanSummary(null);
      setRepoProgress({ current: 0, total: 0 });

      try {
          const fileTree = await fetchRepoFileTree(repoUrl);
          const reviewableFiles = fileTree.filter(file => isReviewableFile(file.path));
          
          setRepoProgress({ current: 0, total: reviewableFiles.length });
          
          const urlParts = parseGitHubUrl(repoUrl);
          if (!urlParts) {
              throw new Error("Could not parse GitHub URL parts.");
          }
          const { owner, repo } = urlParts;
          
          const newReviews: FileReview[] = [];
          const newErrors: FileError[] = [];

          for (let i = 0; i < reviewableFiles.length; i++) {
              const file = reviewableFiles[i];
              setRepoProgress({ current: i + 1, total: reviewableFiles.length });
              try {
                  const language = getLanguageForFile(file.path);
                  if (!language) continue;

                  const content = await getFileContent(owner, repo, file.path);
                  const feedback = await reviewCode(apiKey, content, language, file.path);

                  if (feedback.trim() !== "No issues found.") {
                      const htmlFeedback = await marked.parse(feedback);
                      newReviews.push({ path: file.path, rawFeedback: feedback, htmlFeedback });
                  }
              } catch (e: any) {
                  newErrors.push({ path: file.path, error: e.message });
              }
          }
          setRepoReviews(newReviews);
          setRepoErrors(newErrors);
          setRepoScanSummary({
            total: fileTree.length,
            analyzed: reviewableFiles.length,
            withIssues: newReviews.length,
            errors: newErrors.length
          });

      } catch (e: any) {
          setError(e.message);
      } finally {
          setIsLoading(false);
          setRepoProgress(null);
      }
  }, [apiKey, repoUrl, isRepoUrlValid]);

  const groupReviewsByLanguage = (reviews: FileReview[]) => {
      return reviews.reduce((acc, review) => {
          const lang = getLanguageForFile(review.path) || 'Other';
          if (!acc[lang]) {
              acc[lang] = [];
          }
          acc[lang].push(review);
          return acc;
      }, {} as Record<string, FileReview[]>);
  };


  const renderContent = () => {
    if (!apiKey && viewMode !== 'settings') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-800 rounded-lg">
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">API Key Required</h2>
          <p className="text-gray-300 mb-6">Please set your Google Gemini API key in the Settings tab to begin.</p>
          <button onClick={() => setViewMode('settings')} className="px-6 py-2 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 transition">
            Go to Settings
          </button>
        </div>
      );
    }
    
    if (viewMode === 'settings') {
      return (
        <div className="w-full max-w-lg mx-auto bg-gray-800 p-8 rounded-lg">
            <h2 className="text-2xl font-bold text-white mb-4">Settings</h2>
            <p className="text-gray-400 mb-6">Your Gemini API key is stored securely in your browser's local storage and is never sent anywhere except to Google's API.</p>
            <div className="mb-4">
                <label htmlFor="apiKey" className="block text-gray-300 text-sm font-bold mb-2">Google Gemini API Key</label>
                <input
                    type="password"
                    id="apiKey"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="w-full bg-gray-700 border border-gray-600 text-white py-2 px-3 rounded-lg leading-tight focus:outline-none focus:bg-gray-600 focus:border-cyan-500 transition"
                />
            </div>
            <div className="flex items-center gap-4">
                <button onClick={handleSaveApiKey} className="px-6 py-2 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 disabled:bg-gray-500 transition">
                    Save Key
                </button>
                <button onClick={handleClearApiKey} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition">
                    Clear Key
                </button>
            </div>
        </div>
      );
    }
    
    if (viewMode === 'paste') {
      return (
        <>
          <div className="w-full flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-grow">
              <select value={pasteLanguage} onChange={(e) => setPasteLanguage(e.target.value)} className="appearance-none w-full bg-gray-700 border border-gray-600 text-white py-3 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-gray-600 focus:border-cyan-500 transition">
                  {PROGRAMMING_LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
              </div>
            </div>
            <button onClick={handleReviewPaste} disabled={isLoading || !pasteCode.trim() || !apiKey} className="px-8 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition">
                {isLoading ? 'Reviewing...' : 'Review Code'}
            </button>
          </div>
          <textarea
            value={pasteCode}
            onChange={(e) => setPasteCode(e.target.value)}
            placeholder={`Paste your ${pasteLanguage} code here...`}
            className="w-full flex-1 bg-gray-800 text-gray-200 p-4 rounded-lg border-2 border-gray-700 focus:outline-none focus:border-cyan-500 font-mono text-sm resize-none"
          ></textarea>
           {isLoading && <Loader message="Analyzing your code..." />}
           {error && <div className="mt-4 p-4 bg-red-900/50 text-red-300 border border-red-700 rounded-lg">{error}</div>}
           {pasteFeedback && (
              <div className="mt-6 relative">
                  <div className="p-6 bg-gray-800 rounded-lg border border-gray-700 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: pasteFeedback.html }}></div>
                  <CopyButton textToCopy={pasteFeedback.raw} />
              </div>
            )}
        </>
      );
    }

    if (viewMode === 'repo') {
       const groupedReviews = groupReviewsByLanguage(repoReviews);
       return (
        <>
          <div className="w-full flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-grow">
              <input 
                type="text"
                value={repoUrl}
                onChange={handleRepoUrlChange}
                placeholder="https://github.com/owner/repository"
                className={`w-full bg-gray-700 border text-white py-3 px-4 rounded-lg focus:outline-none focus:bg-gray-600 transition ${isRepoUrlValid ? 'border-gray-600 focus:border-cyan-500' : 'border-red-500'}`}
              />
              {!isRepoUrlValid && <p className="text-red-400 text-sm mt-1">Please enter a valid GitHub repository URL.</p>}
              <p className="text-xs text-gray-500 mt-1 pl-1">Only public repositories are supported.</p>
            </div>
            <button onClick={handleAutonomousReview} disabled={isLoading || !repoUrl || !isRepoUrlValid || !apiKey} className="px-8 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition">
                {isLoading ? 'Reviewing...' : 'Start Autonomous Review'}
            </button>
          </div>
          {isLoading && repoProgress && <Loader message={`Analyzing file ${repoProgress.current} of ${repoProgress.total}...`} />}
          {error && <div className="mt-4 p-4 bg-red-900/50 text-red-300 border border-red-700 rounded-lg">{error}</div>}
          
          {!isLoading && repoScanSummary && (
             <div className="mt-6 space-y-6">
                 {/* Executive Summary */}
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-3">Executive Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-gray-900 p-3 rounded-md"><p className="text-2xl font-bold text-cyan-400">{repoScanSummary.total}</p><p className="text-sm text-gray-400">Total Files</p></div>
                        <div className="bg-gray-900 p-3 rounded-md"><p className="text-2xl font-bold text-cyan-400">{repoScanSummary.analyzed}</p><p className="text-sm text-gray-400">Files Analyzed</p></div>
                        <div className="bg-gray-900 p-3 rounded-md"><p className="text-2xl font-bold text-yellow-400">{repoScanSummary.withIssues}</p><p className="text-sm text-gray-400">Issues Found</p></div>
                        <div className="bg-gray-900 p-3 rounded-md"><p className="text-2xl font-bold text-red-400">{repoScanSummary.errors}</p><p className="text-sm text-gray-400">Scan Errors</p></div>
                    </div>
                </div>

                {repoErrors.length > 0 && (
                    <details className="bg-red-900/50 p-4 rounded-lg">
                        <summary className="cursor-pointer font-semibold text-red-300">Encountered {repoErrors.length} file scan error(s)</summary>
                        <ul className="mt-2 list-disc list-inside text-red-400 font-mono text-sm">
                        {repoErrors.map(err => <li key={err.path}><strong>{err.path}:</strong> {err.error}</li>)}
                        </ul>
                    </details>
                )}

                {Object.keys(groupedReviews).length > 0 ? (
                    Object.entries(groupedReviews).map(([language, reviews]) => (
                        <details key={language} className="bg-gray-800 p-4 rounded-lg" open>
                            <summary className="cursor-pointer font-semibold text-gray-200 text-lg">{language} ({reviews.length} file(s) with issues)</summary>
                            <div className="mt-4 space-y-4">
                                {reviews.map(review => (
                                    <details key={review.path} className="bg-gray-900 p-4 rounded-lg">
                                        <summary className="cursor-pointer font-semibold text-cyan-400">{review.path}</summary>
                                        <div className="mt-2 relative">
                                        <div className="p-4 border-t border-gray-700 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: review.htmlFeedback }}></div>
                                        <CopyButton textToCopy={review.rawFeedback} />
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </details>
                    ))
                ) : repoErrors.length === 0 && (
                    <div className="p-4 bg-green-900/50 text-green-300 border border-green-700 rounded-lg">
                        Excellent! No significant issues were found in any of the {repoScanSummary.analyzed} analyzed files.
                    </div>
                )}
            </div>
          )}
        </>
       );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col p-4 md:p-6 lg:p-8">
      <header className="w-full max-w-7xl mx-auto flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
            <CodeIcon className="w-8 h-8 text-cyan-400" />
            <h1 className="text-2xl font-bold">Gemini Code Reviewer</h1>
        </div>
        <nav className="flex space-x-2 bg-gray-800 p-1 rounded-lg">
            <NavButton mode="settings" currentMode={viewMode} setMode={setViewMode} label="Settings"><SettingsIcon className="w-5 h-5"/></NavButton>
            <NavButton mode="paste" currentMode={viewMode} setMode={setViewMode} label="Paste Code"><PasteIcon className="w-5 h-5"/></NavButton>
            <NavButton mode="repo" currentMode={viewMode} setMode={setViewMode} label="Git Repo"><GitIcon className="w-5 h-5"/></NavButton>
        </nav>
      </header>
      <main className="w-full max-w-7xl mx-auto flex flex-col flex-1">
        {renderContent()}
      </main>
    </div>
  );
};

export default MainApp;