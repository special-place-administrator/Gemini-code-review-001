import React, { useState, useCallback, useEffect } from 'react';
import { marked } from 'marked';
import { reviewCode } from './services/geminiService';
import { fetchRepoFileTree, getFileContent, parseGitHubUrl } from './services/githubService';
import { PROGRAMMING_LANGUAGES, isReviewableFile, getLanguageForFile } from './constants';

import CopyButton from './components/CopyButton';
import Loader from './components/Loader';
import { PasteIcon } from './components/icons/PasteIcon';
import { GitIcon } from './components/icons/GitIcon';
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

const MainApp = () => {
  const [apiKey, setApiKey] = useState('');
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


  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setTempApiKey(savedKey);
      setViewMode('paste'); // Go to paste mode if key exists
    }
  }, []);

  const handleApiKeySave = useCallback(() => {
    localStorage.setItem('gemini_api_key', tempApiKey);
    setApiKey(tempApiKey);
    setViewMode('paste'); // Switch to paste mode after saving
  }, [tempApiKey]);
  
  const handleApiKeyClear = useCallback(() => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setTempApiKey('');
  }, []);

  const handleRepoUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setRepoUrl(newUrl);
    setIsRepoUrlValid(GITHUB_URL_REGEX.test(newUrl) || newUrl === '');
  }, []);

  const handleReviewPaste = useCallback(async () => {
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
      if (!isRepoUrlValid || !repoUrl) return;

      setIsLoading(true);
      setError(null);
      setRepoReviews([]);
      setRepoErrors([]);
      setRepoProgress({ current: 0, total: 0 });

      try {
          const fileTree = await fetchRepoFileTree(repoUrl);
          const reviewableFiles = fileTree.filter(file => isReviewableFile(file.path));
          
          setRepoProgress({ current: 0, total: reviewableFiles.length });
          
          const { owner, repo } = parseGitHubUrl(repoUrl)!;
          
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

      } catch (e: any) {
          setError(e.message);
      } finally {
          setIsLoading(false);
          setRepoProgress(null);
      }
  }, [apiKey, repoUrl, isRepoUrlValid]);


  const renderContent = () => {
    if (viewMode === 'settings') {
      return (
        <div className="w-full max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4">Settings</h2>
          <p className="text-gray-400 mb-6">Please enter your Google Gemini API key to use the code reviewer.</p>
          <div className="space-y-4">
            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="Enter your Gemini API Key"
              className="w-full bg-gray-700 border border-gray-600 text-white py-3 px-4 rounded-lg focus:outline-none focus:bg-gray-600 focus:border-cyan-500"
            />
            <div className="flex space-x-4">
              <button onClick={handleApiKeySave} disabled={!tempApiKey} className="flex-1 px-6 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition">Save Key</button>
              <button onClick={handleApiKeyClear} className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition">Clear Key</button>
            </div>
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
          
          {!isLoading && (repoReviews.length > 0 || repoErrors.length > 0) && (
             <div className="mt-6 space-y-4">
              <h3 className="text-xl font-bold text-white">Review Summary</h3>
              {repoErrors.length > 0 && (
                <details className="bg-red-900/50 p-4 rounded-lg">
                  <summary className="cursor-pointer font-semibold text-red-300">Encountered {repoErrors.length} error(s)</summary>
                  <ul className="mt-2 list-disc list-inside text-red-400">
                    {repoErrors.map(err => <li key={err.path}><strong>{err.path}:</strong> {err.error}</li>)}
                  </ul>
                </details>
              )}
               {repoReviews.length > 0 && (
                <details className="bg-gray-800 p-4 rounded-lg" open>
                  <summary className="cursor-pointer font-semibold text-gray-200">Found issues in {repoReviews.length} file(s)</summary>
                   <div className="mt-4 space-y-4">
                  {repoReviews.map(review => (
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
              )}
              {repoReviews.length === 0 && repoErrors.length === 0 && (
                 <div className="p-4 bg-green-900/50 text-green-300 border border-green-700 rounded-lg">
                  Excellent! No significant issues were found in any of the reviewed files.
                 </div>
              )}
            </div>
          )}
        </>
       );
    }
  };

  const NavButton = ({ mode, currentMode, setMode, children, label }: { mode: ViewMode, currentMode: ViewMode, setMode: (mode: ViewMode) => void, children: React.ReactNode, label: string }) => (
     <button onClick={() => setMode(mode)} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${currentMode === mode ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-gray-700'}`} aria-label={label}>
      {children}
      <span className="text-xs mt-1">{label}</span>
     </button>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col p-4 md:p-6 lg:p-8">
      <header className="w-full max-w-7xl mx-auto flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
            <svg className="w-8 h-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            <h1 className="text-2xl font-bold">Gemini Code Reviewer</h1>
        </div>
        <nav className="flex space-x-2 bg-gray-800 p-1 rounded-lg">
            <NavButton mode="settings" currentMode={viewMode} setMode={setViewMode} label="Settings"><SettingsIcon className="w-5 h-5"/></NavButton>
            <NavButton mode="paste" currentMode={viewMode} setMode={setViewMode} label="Paste Code"><PasteIcon className="w-5 h-5"/></NavButton>
            <NavButton mode="repo" currentMode={viewMode} setMode={setViewMode} label="Git Repo"><GitIcon className="w-5 h-5"/></NavButton>
        </nav>
      </header>
      <main className="w-full max-w-7xl mx-auto flex flex-col flex-1">
        {apiKey || viewMode === 'settings' ? renderContent() : (
            <div className="text-center p-8 bg-gray-800 rounded-lg">
                <h2 className="text-2xl font-bold text-white mb-4">API Key Required</h2>
                <p className="text-gray-400 mb-6">Please go to the <button onClick={() => setViewMode('settings')} className="text-cyan-400 underline">Settings</button> tab to enter your Gemini API key.</p>
            </div>
        )}
      </main>
    </div>
  );
};

export default MainApp;
