/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { UploadIcon } from './icons';
import Spinner from './Spinner';

interface StyleTransferPanelProps {
  onApplyStyle: (styleImage: File, prompt: string) => void;
  isLoading: boolean;
}

const StyleTransferPanel: React.FC<StyleTransferPanelProps> = ({ onApplyStyle, isLoading }) => {
  const [styleFile, setStyleFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [prompt, setPrompt] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    if (styleFile) {
      objectUrl = URL.createObjectURL(styleFile);
      setPreviewUrl(objectUrl);
      return () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    } else {
      setPreviewUrl(null);
    }
  }, [styleFile]);


  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    if (allowedTypes.includes(file.type)) {
      setStyleFile(file);
      setError(null);
    } else {
      setError(`Unsupported file type. Please use JPG, PNG, GIF, or WEBP.`);
      setStyleFile(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    handleFileSelect(e.dataTransfer.files);
  };
  
  const handleApply = () => {
    if(styleFile) {
        onApplyStyle(styleFile, prompt);
    }
  };

  const handleRemoveImage = () => {
    setStyleFile(null);
    setPrompt('');
    setError(null);
  };

  const renderUploader = () => {
    if (error) {
        return (
            <div className="w-full h-48 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-red-100/50 border-red-300 text-center p-4">
                <p className="text-sm font-semibold text-red-700">Error Processing Image</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
                <button onClick={() => setError(null)} className="mt-4 bg-red-500 text-white text-xs font-bold py-1 px-3 rounded-md hover:bg-red-600 transition-colors">
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <label
            htmlFor="style-image-upload"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full h-48 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 ${isDraggingOver ? 'border-purple-500 bg-gray-800 ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900' : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'}`}
        >
            <div className={`flex flex-col items-center justify-center pt-5 pb-6 text-purple-400 transition-transform duration-200 ${isDraggingOver ? 'scale-105' : ''}`}>
                <UploadIcon className="w-10 h-10 mb-3" />
                <p className="mb-2 text-sm text-center font-semibold px-2">{isDraggingOver ? 'Drop the style image!' : 'Click to upload or drag and drop'}</p>
                <p className="text-xs">JPG, PNG, WEBP, or GIF</p>
            </div>
            <input
                id="style-image-upload"
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={(e) => handleFileSelect(e.target.files)}
            />
        </label>
    );
  }

  return (
    <div className="w-full bg-gray-900 border border-gray-700/50 rounded-xl p-4 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-center text-gray-200">Style Transfer</h3>
      <p className="text-sm text-center text-gray-400 -mt-2">Upload an image to transfer its artistic style to your photo.</p>
      
      {!previewUrl ? (
        <div className="w-full h-48">
            {renderUploader()}
        </div>
      ) : (
        <div className="w-full flex flex-col items-center gap-4 animate-fade-in">
            <p className="text-sm font-medium text-gray-400">Style Image:</p>
            <div className="relative group">
                <img src={previewUrl} alt="Style preview" className="h-32 w-auto rounded-lg shadow-md" />
                <button
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove style image"
                >
                    &times;
                </button>
            </div>
        </div>
      )}

      {styleFile && (
        <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Optional: Describe how to apply the style..."
            className="flex-grow bg-gray-800 border-gray-700 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-purple-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base placeholder-gray-500 mt-2"
            disabled={isLoading || !styleFile}
        />
      )}

      <button
        onClick={handleApply}
        disabled={isLoading || !styleFile}
        className="w-full max-w-xs mt-2 bg-gradient-to-br from-purple-600 to-fuchsia-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-purple-400 disabled:to-fuchsia-300 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
      >
        Apply Style
      </button>
    </div>
  );
};

export default StyleTransferPanel;
