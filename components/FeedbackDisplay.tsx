import React from 'react';
import CopyButton from './CopyButton';

interface FeedbackDisplayProps {
  feedback: string;
}

const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ feedback }) => {
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold text-gray-200 mb-4">Review Feedback</h2>
      <div className="relative bg-gray-800 border border-gray-700 rounded-lg p-6">
        <CopyButton textToCopy={feedback} />
        <div className="font-sans text-gray-300 space-y-4 whitespace-pre-wrap">{feedback}</div>
      </div>
    </div>
  );
};

export default FeedbackDisplay;
