import React from 'react';
import { CodeIcon } from './icons/CodeIcon';

interface LandingPageProps {
  onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-center items-center p-4">
      <main className="text-center">
        <div className="inline-flex items-center justify-center bg-gray-800 p-4 rounded-full mb-6 border border-gray-700 shadow-lg animate-pulse">
            <CodeIcon className="w-12 h-12 text-cyan-400" />
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
            Gemini Code Reviewer
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-gray-400 mb-8">
            Harness the power of Google's Gemini API to get instant, intelligent, and in-depth reviews of your code. Paste a snippet or link a public GitHub repository to get started.
        </p>
        <button
            onClick={onEnter}
            className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg rounded-lg hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-cyan-300 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
        >
            Get Started
        </button>
      </main>

      <footer className="absolute bottom-0 left-0 right-0 py-6 text-gray-500 text-sm text-center">
        <p>Powered by Google Gemini. Built with React & Tailwind CSS.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
