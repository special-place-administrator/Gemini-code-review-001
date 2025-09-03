import React, { useState, useCallback } from 'react';
import { reviewCode } from './services/geminiService';
import { fetchRepoFileTree, getFileContent, parseGitHubUrl } from './services/githubService';
import { PROGRAMMING_LANGUAGES, isReviewableFile } from './constants';

import Header from './components/Header';
import CopyButton from './components/CopyButton';
import { PasteIcon } from './components/icons/PasteIcon';
import { GitIcon } from './components/icons/GitIcon';


type InputMode = 'paste' | 'repo';
interface FileReview {
  path: string;
  feedback: string;
}

// UI Components (defined outside App to prevent re-creation)
const LanguageSelector: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }> = React.memo(({ value, onChange }) => (
    <div className="relative">
        <select value={value} onChange={onChange} className="appearance-none w-full md:w-auto bg-gray-700 border border-gray-600 text-white py-3 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-gray-600 focus:border-cyan-500 transition">
            {PROGRAMMING_LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
        </div>
    </div>
));

const CodeInput: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void }> = React.memo(({ value, onChange }) => (
    <textarea value={value} onChange={onChange} placeholder="Paste your code here..." className="w-full h-96 p-4 font-mono text-sm text-gray-200 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow resize-y" />
));

const ErrorAlert: React.FC<{ message: string; title?: string }> = ({ message, title = "An Error Occurred" }) => (
    <div className="mt-6 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
        <p className="font-bold">{title}</p>
        <p>{message}</p>
    </div>
);

const App = () => {
    const [inputMode, setInputMode] = useState<InputMode>('paste');
    
    // Shared state
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [language, setLanguage] = useState<string>(PROGRAMMING_LANGUAGES[0]);

    // Paste mode state
    const [code, setCode] = useState<string>('');
    const [pasteFeedback, setPasteFeedback] = useState<string>('');
    
    // Repo mode state
    const [repoUrl, setRepoUrl] = useState<string>('');
    const [reviews, setReviews] = useState<FileReview[]>([]);
    const [reviewProgress, setReviewProgress] = useState<{ currentFile: string; progress: number } | null>(null);
    

    const handleAutonomousReview = useCallback(async () => {
        if (!repoUrl) {
            setError('Please enter a GitHub repository URL.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setReviews([]);
        setReviewProgress(null);

        try {
            const urlParts = parseGitHubUrl(repoUrl);
            if (!urlParts) {
                throw new Error('Invalid GitHub URL provided. Please check the format.');
            }
            const { owner, repo } = urlParts;

            const files = await fetchRepoFileTree(repoUrl);
            const reviewableFiles = files.filter(file => isReviewableFile(file.path));
            const totalFiles = reviewableFiles.length;
            
            if (totalFiles === 0) {
                 throw new Error('No reviewable source code files were found in this repository.');
            }

            for (let i = 0; i < totalFiles; i++) {
                const file = reviewableFiles[i];
                setReviewProgress({
                    currentFile: file.path,
                    progress: Math.round(((i + 1) / totalFiles) * 100),
                });

                const content = await getFileContent(owner, repo, file.path);
                
                // Skip empty, very large, or binary-like files
                if (!content || content.length > 150000 || content.includes('\uFFFD')) continue;
                
                const feedback = await reviewCode(content, language, file.path);

                if (feedback.trim().toLowerCase() !== 'no issues found.') {
                    setReviews(prevReviews => [...prevReviews, { path: file.path, feedback }]);
                }
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred during the review.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
            setReviewProgress(null);
        }
    }, [repoUrl, language]);
    
    const handlePasteReview = useCallback(async () => {
        if (!code.trim()) {
            setError('Please enter some code to review.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setPasteFeedback('');
        try {
            const result = await reviewCode(code, language);
            setPasteFeedback(result);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred during the review.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [code, language]);
    
    const handleReviewClick = () => {
        if (inputMode === 'paste') {
            handlePasteReview();
        } else {
            handleAutonomousReview();
        }
    };

    const renderRepoTab = () => (
        <div>
            <div className="flex flex-col sm:flex-row gap-4">
                <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className="flex-grow p-3 font-mono text-sm text-gray-200 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
                    aria-label="GitHub Repository URL"
                />
            </div>
            <p className="mt-2 text-xs text-gray-500">Note: Only public repositories are currently supported.</p>
        </div>
    );

    const renderPasteTab = () => (
        <CodeInput value={code} onChange={(e) => setCode(e.target.value)} />
    );

    const renderProgressIndicator = () => (
        <div className="flex flex-col items-center justify-center p-8 space-y-4 mt-8">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-cyan-400"></div>
            <p className="text-gray-300 text-lg text-center">
                {reviewProgress ? `Reviewing: ${reviewProgress.currentFile}` : 'Starting review...'}
            </p>
            {reviewProgress && (
                 <div className="w-full max-w-md bg-gray-700 rounded-full h-2.5">
                    <div className="bg-cyan-500 h-2.5 rounded-full transition-all duration-300 ease-linear" style={{ width: `${reviewProgress.progress}%` }}></div>
                 </div>
            )}
            <p className="text-gray-500 text-sm">This may take several minutes for large repositories.</p>
        </div>
    );

    const renderRepoReport = () => (
         <div className="mt-8">
            <h2 className="text-2xl font-semibold text-gray-200 mb-4">Autonomous Review Report</h2>
            {reviews.length > 0 ? (
                <div className="space-y-4">
                    {reviews.map((review, index) => (
                        <details key={index} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden group">
                            <summary className="p-4 cursor-pointer hover:bg-gray-700/50 flex justify-between items-center font-medium text-gray-200">
                                <span className="font-mono">{review.path}</span>
                                <svg className="w-5 h-5 text-gray-400 group-open:rotate-90 transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                            </summary>
                            <div className="p-6 border-t border-gray-700">
                                <div className="relative">
                                    <CopyButton textToCopy={review.feedback} />
                                    <div className="font-sans text-gray-300 space-y-4 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: review.feedback }}></div>
                                </div>
                            </div>
                        </details>
                    ))}
                </div>
            ) : (
                 <div className="text-center py-8 px-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                    <p className="text-gray-300">No significant issues were found during the review, or the repository contained no reviewable files.</p>
                    <p className="text-gray-500 text-sm mt-1">Great job!</p>
                </div>
            )}
        </div>
    );

     const renderPasteFeedback = () => (
         <div className="mt-8">
            <h2 className="text-2xl font-semibold text-gray-200 mb-4">Review Feedback</h2>
            <div className="relative bg-gray-800 border border-gray-700 rounded-lg p-6">
                <CopyButton textToCopy={pasteFeedback} />
                <div className="font-sans text-gray-300 space-y-4 whitespace-pre-wrap">{pasteFeedback}</div>
            </div>
        </div>
     );

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <Header />

                <div className="mt-8 p-6 bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg">
                    <div className="mb-6 border-b border-gray-700">
                        <nav className="flex -mb-px space-x-6">
                            <button onClick={() => setInputMode('paste')} className={`flex items-center space-x-2 shrink-0 py-4 px-1 border-b-2 font-medium text-sm ${inputMode === 'paste' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                                <PasteIcon className="w-5 h-5" />
                                <span>Paste Code</span>
                            </button>
                             <button onClick={() => setInputMode('repo')} className={`flex items-center space-x-2 shrink-0 py-4 px-1 border-b-2 font-medium text-sm ${inputMode === 'repo' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                                <GitIcon className="w-5 h-5" />
                                <span>Git Repository</span>
                            </button>
                        </nav>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <LanguageSelector value={language} onChange={(e) => setLanguage(e.target.value)} />
                         <button onClick={handleReviewClick} disabled={isLoading} className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg">
                            {isLoading ? (inputMode === 'repo' ? 'Reviewing Repo...' : 'Reviewing...') : (inputMode === 'repo' ? 'Start Autonomous Review' : 'Review Code')}
                        </button>
                    </div>
                    
                    {inputMode === 'paste' ? renderPasteTab() : renderRepoTab()}
                </div>

                {isLoading && renderProgressIndicator()}
                {error && <ErrorAlert message={error} />}
                
                {inputMode === 'paste' && pasteFeedback && !isLoading && renderPasteFeedback()}
                {inputMode === 'repo' && !isLoading && reviews && renderRepoReport()}


            </main>

             <footer className="text-center py-6 text-gray-500 text-sm">
                <p>Powered by Google Gemini. Built with React & Tailwind CSS.</p>
            </footer>
        </div>
    );
};

export default App;