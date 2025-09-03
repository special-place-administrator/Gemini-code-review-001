import React, { useState, useCallback } from 'react';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';

interface CopyButtonProps {
  textToCopy: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (isCopied) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [textToCopy, isCopied]);

  return (
    <button
      onClick={handleCopy}
      className="absolute top-4 right-4 p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
      aria-label="Copy code"
    >
      {isCopied ? (
        <CheckIcon className="w-5 h-5 text-green-400" />
      ) : (
        <CopyIcon className="w-5 h-5" />
      )}
    </button>
  );
};

export default CopyButton;
