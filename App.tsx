import React, { useState, useCallback } from 'react';
import { reviewCode } from './services/geminiService';
import { PROGRAMMING_LANGUAGES } from './constants';
import Header from './components/Header';
import Loader from './components/Loader';
import FeedbackDisplay from './components/FeedbackDisplay';

// Define components outside of App to prevent re-creation on re-renders
const LanguageSelector: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }> = ({ value, onChange }) => (
    <div className="relative">
        <select
            value={value}
            onChange={onChange}
            className="appearance-none w-full md:w-auto bg-gray-700 border border-gray-600 text-white py-3 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-gray-600 focus:border-cyan-500 transition"
        >
            {PROGRAMMING_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                    {lang}
                </option>
            ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
        </div>
    </div>
);

const CodeInput: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void }> = ({ value, onChange }) => (
    <textarea
        value={value}
        onChange={onChange}
        placeholder="Paste your code here..."
        className="w-full h-96 p-4 font-mono text-sm text-gray-200 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow resize-y"
    />
);

const ErrorAlert: React.FC<{ message: string }> = ({ message }) => (
    <div className="mt-6 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
        <p className="font-bold">An Error Occurred</p>
        <p>{message}</p>
    </div>
);

const App = () => {
    const [code, setCode] = useState<string>('');
    const [language, setLanguage] = useState<string>(PROGRAMMING_LANGUAGES[0]);
    const [feedback, setFeedback] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleReview = useCallback(async () => {
        if (!code) {
            setError('Please enter some code to review.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setFeedback('');

        try {
            const result = await reviewCode(code, language);
            setFeedback(result);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [code, language]);

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <Header />

                <div className="mt-8 p-6 bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <LanguageSelector
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                        />
                         <button
                            onClick={handleReview}
                            disabled={isLoading}
                            className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                        >
                            {isLoading ? 'Reviewing...' : 'Review Code'}
                        </button>
                    </div>

                    <CodeInput
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                    />
                </div>

                {isLoading && <Loader />}
                {error && <ErrorAlert message={error} />}
                {feedback && !isLoading && <FeedbackDisplay feedback={feedback} />}
            </main>

             <footer className="text-center py-6 text-gray-500 text-sm">
                <p>Powered by Google Gemini. Built with React & Tailwind CSS.</p>
            </footer>
        </div>
    );
};

export default App;
