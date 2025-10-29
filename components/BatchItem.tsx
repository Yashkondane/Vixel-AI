/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import Spinner from './Spinner';
import { type BatchItem as BatchItemType } from './BatchProcessingScreen';
import { DownloadIcon, CheckIcon, ErrorIcon, ClockIcon } from './icons';

const BatchItem: React.FC<{ item: BatchItemType }> = ({ item }) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        const url = URL.createObjectURL(item.originalFile);
        setPreviewUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [item.originalFile]);

    const handleDownload = () => {
        if (!item.processedUrl) return;
        const link = document.createElement('a');
        link.href = item.processedUrl;
        
        const nameParts = item.originalFile.name.split('.');
        const extension = nameParts.pop();
        const baseName = nameParts.join('.');
        link.download = `${baseName}-edited.${extension || 'png'}`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderOverlay = () => {
        switch (item.status) {
            case 'pending':
                return (
                    <div className="absolute inset-0 bg-gray-950/60 flex flex-col items-center justify-center gap-2 text-gray-400">
                        <ClockIcon className="w-8 h-8" />
                        <p className="text-xs font-medium">Pending</p>
                    </div>
                );
            case 'processing':
                return (
                    <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-gray-200">
                        <Spinner />
                        <p className="text-xs font-medium">Processing...</p>
                    </div>
                );
            case 'complete':
                return (
                    <div className="absolute inset-0 bg-green-950/70 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-green-200">
                        <CheckIcon className="w-8 h-8" />
                        <p className="text-sm font-bold">Complete</p>
                        <button 
                            onClick={handleDownload}
                            className="mt-2 px-3 py-1 bg-green-600 text-white rounded-md shadow-lg text-xs font-bold hover:bg-green-700 active:scale-95 transition-all"
                            aria-label="Download edited image"
                        >
                           <div className="flex items-center gap-1.5">
                                <DownloadIcon className="w-4 h-4" />
                                Download
                           </div>
                        </button>
                    </div>
                );
            case 'error':
                 return (
                    <div className="group relative inset-0 bg-red-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-red-200 p-2 text-center">
                        <ErrorIcon className="w-8 h-8" />
                        <p className="text-sm font-bold">Failed</p>
                        {item.errorMessage && (
                             <div className="absolute z-10 bottom-full mb-2 w-max max-w-xs p-2 bg-gray-900 border border-gray-700 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                {item.errorMessage}
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };
    
    return (
        <div className="relative aspect-square w-full bg-gray-900 rounded-lg overflow-hidden shadow-md animate-fade-in border border-gray-700/50">
            <div 
                className={`w-full h-full transition-all duration-300 ${item.status === 'pending' || item.status === 'error' ? 'opacity-40 brightness-75' : 'opacity-100'}`}
            >
                {item.status === 'complete' && item.processedUrl ? (
                    <img src={item.processedUrl} alt="Edited result" className="w-full h-full object-cover" />
                ) : previewUrl ? (
                    <img src={previewUrl} alt={item.originalFile.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gray-800"></div>
                )}
            </div>
            {renderOverlay()}
        </div>
    );
};

export default BatchItem;
