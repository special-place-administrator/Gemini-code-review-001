import React from 'react';
import { CodeIcon } from './icons/CodeIcon';

const Header = () => (
  <header className="py-8 text-center">
    <div className="inline-flex items-center justify-center bg-gray-800 p-4 rounded-full mb-4 border border-gray-700 shadow-lg">
      <CodeIcon className="w-10 h-10 text-cyan-400" />
    </div>
    <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
      Gemini Code Reviewer
    </h1>
    <p className="mt-4 text-lg text-gray-400">
      Get instant, AI-powered feedback on your code.
    </p>
  </header>
);

export default Header;
