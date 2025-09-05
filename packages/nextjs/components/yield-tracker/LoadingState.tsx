"use client";

import { useState, useEffect } from "react";

interface LoadingStateProps {
  isLoading: boolean;
  message?: string;
  showProgress?: boolean;
}

export const LoadingState = ({ isLoading, message = "Loading data...", showProgress = false }: LoadingStateProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading || !showProgress) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isLoading, showProgress]);

  if (!isLoading) return null;

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        {showProgress && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-blue-600">{Math.round(progress)}%</span>
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-400 mb-2">{message}</p>
        {showProgress && (
          <div className="w-48 bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 text-center max-w-sm">
        <p>Fetching data from DeFi protocols...</p>
        <p className="mt-1">This may take a few moments</p>
      </div>
    </div>
  );
};

export const ErrorState = ({ error, onRetry }: { error: Error; onRetry?: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="text-red-400 text-4xl">⚠️</div>
      <div className="text-center">
        <h3 className="text-lg font-medium text-white mb-2">Failed to Load Data</h3>
        <p className="text-sm text-gray-400 mb-4">
          {error.message || "An error occurred while fetching data"}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};
