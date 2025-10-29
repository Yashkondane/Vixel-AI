/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import Spinner from './Spinner';
import { type BatchItem as BatchItemType } from './BatchProcessingScreen';

interface BatchItemProps {
    item: BatchItemType;
}

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const BatchItem: React.FC<BatchItemProps> = ({ item }) => {
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
        
        // Add a suffix to the original filename
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
            case 'processing':
                return (
                    <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-gray-200">
                        <Spinner />
                        <p className="text-xs font-medium">Processing...</p>
                    </div>
                );
            case 'complete':
                return (
                    <div className="absolute bottom-2 right-2">
                        <button 
                            onClick={handleDownload}
                            className="p-2 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 active:scale-95 transition-all"
                            aria-label="Download edited image"
                        >
                           <DownloadIcon className="w-4 h-4" />
                        </button>
                    </div>
                );
            default: // pending
                return null;
        }
    };
    
    return (
        <div className="relative aspect-square w-full bg-gray-900 rounded-lg overflow-hidden shadow-md animate-fade-in">
            {item.status === 'complete' && item.processedUrl ? (
                <img src={item.processedUrl} alt="Edited result" className="w-full h-full object-cover" />
            ) : previewUrl ? (
                <img src={previewUrl} alt={item.originalFile.name} className="w-full h-full object-cover" />
            ) : null}
            {renderOverlay()}
        </div>
    );
};

export default BatchItem;
