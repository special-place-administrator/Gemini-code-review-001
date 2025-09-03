import React from 'react';

interface LoaderProps {
  message?: string;
}

const Loader: React.FC<LoaderProps> = ({ message = "Analyzing your code..." }) => (
  <div className="flex flex-col items-center justify-center p-8 space-y-4 mt-8">
    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-cyan-400"></div>
    <p className="text-gray-300 text-lg">{message}</p>
    <p className="text-gray-500 text-sm">This may take a few moments.</p>
  </div>
);

export default Loader;
