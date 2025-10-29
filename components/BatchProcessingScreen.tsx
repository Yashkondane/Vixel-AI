/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import { generateFilteredImage, generateAdjustedImage } from '../services/geminiService';
import BatchItem from './BatchItem';
import { DownloadZipIcon } from './icons';
import Spinner from './Spinner';

interface BatchProcessingScreenProps {
  files: File[];
  onExit: () => void;
}

export interface BatchItem {
    id: string;
    originalFile: File;
    processedUrl?: string;
    status: 'pending' | 'processing' | 'complete';
}

/**
 * A helper function to retry an async function if it fails.
 * @param fn The async function to execute.
 * @param retries Number of retries.
 * @param delay The initial delay in ms, which doubles on each retry.
 * @returns The result of the async function.
 */
const withRetry = async <T,>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000
): Promise<T> => {
    try {
        return await fn();
    } catch (err) {
        if (retries > 0) {
            console.log(
                `Request failed, retrying in ${delay / 1000}s... (${retries} retries left)`
            );
            await new Promise((res) => setTimeout(res, delay));
            return withRetry(fn, retries - 1, delay * 2);
        } else {
            console.error("All retries failed.");
            throw err;
        }
    }
};

const presets = [
    // Adjustments
    { name: 'Blur Background', prompt: 'Apply a realistic depth-of-field effect, making the background blurry while keeping the main subject in sharp focus.', type: 'adjustment' },
    { name: 'Enhance Details', prompt: 'Slightly enhance the sharpness and details of the image without making it look unnatural.', type: 'adjustment' },
    { name: 'Warmer Lighting', prompt: 'Adjust the color temperature to give the image warmer, golden-hour style lighting.', type: 'adjustment' },
    { name: 'Studio Light', prompt: 'Add dramatic, professional studio lighting to the main subject.', type: 'adjustment' },
    // Filters
    { name: 'Synthwave', prompt: 'Apply a vibrant 80s synthwave aesthetic with neon magenta and cyan glows, and subtle scan lines.', type: 'filter' },
    { name: 'Anime', prompt: 'Give the image a vibrant Japanese anime style, with bold outlines, cel-shading, and saturated colors.', type: 'filter' },
    { name: 'Lomo', prompt: 'Apply a Lomography-style cross-processing film effect with high-contrast, oversaturated colors, and dark vignetting.', type: 'filter' },
    { name: 'Glitch', prompt: 'Transform the image into a futuristic holographic projection with digital glitch effects and chromatic aberration.', type: 'filter' },
  ];

const BatchProcessingScreen: React.FC<BatchProcessingScreenProps> = ({ files, onExit }) => {
    const [batchItems, setBatchItems] = useState<BatchItem[]>(() => 
        files.map(file => ({
            id: `${file.name}-${file.lastModified}`,
            originalFile: file,
            status: 'pending'
        }))
    );
    const [selectedPreset, setSelectedPreset] = useState<(typeof presets)[number] | null>(null);
    const [customPrompt, setCustomPrompt] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedCount, setProcessedCount] = useState(0);
    const [isZipping, setIsZipping] = useState(false);
    const [hasStartedProcessing, setHasStartedProcessing] = useState(false);
    const isCancelledRef = useRef(false);

    const handlePresetClick = (preset: (typeof presets)[number]) => {
        setSelectedPreset(preset);
        setCustomPrompt('');
    };

    const handleCustomPromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomPrompt(e.target.value);
        setSelectedPreset(null);
    };

    const handleCancelProcessing = () => {
        isCancelledRef.current = true;
    };

    const handleStartProcessing = useCallback(async () => {
        const activePrompt = customPrompt.trim() || selectedPreset?.prompt;
        if (!activePrompt) return;

        setHasStartedProcessing(true);
        isCancelledRef.current = false;
        setIsProcessing(true);
        setProcessedCount(0);

        for (const item of batchItems) {
            if (isCancelledRef.current) {
                console.log("Batch processing cancelled by user.");
                break;
            }

            setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));
            try {
                const apiCall = () => {
                    if (customPrompt.trim()) {
                        // Custom prompts use the general-purpose 'adjustment' function
                        return generateAdjustedImage(item.originalFile, activePrompt);
                    } else if (selectedPreset) {
                        const call = selectedPreset.type === 'adjustment'
                            ? generateAdjustedImage(item.originalFile, selectedPreset.prompt)
                            : generateFilteredImage(item.originalFile, selectedPreset.prompt);
                        return call;
                    } else {
                         // This should not be reached if button logic is correct, but as a safeguard:
                        return Promise.reject(new Error("No prompt or preset selected."));
                    }
                };

                const resultUrl = await withRetry(apiCall);
                
                if (isCancelledRef.current) break;
                setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'complete', processedUrl: resultUrl } : i));

            } catch (err) {
                if (isCancelledRef.current) break;
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                console.error(`Failed to process ${item.originalFile.name} after all retries:`, err);
                // On error, remove the item from the display to allow the process to continue.
                setBatchItems(prev => prev.filter(i => i.id !== item.id));
            }
            setProcessedCount(prev => prev + 1);
        }

        setIsProcessing(false);
        if (isCancelledRef.current) {
            // Revert status for any items that were stuck in 'processing'
            setBatchItems(prev => prev.map(item =>
                item.status === 'processing' ? { ...item, status: 'pending' } : item
            ));
        }
    }, [selectedPreset, customPrompt, batchItems]);
    
    const handleDownloadAll = async () => {
        const completedItems = batchItems.filter(item => item.status === 'complete' && item.processedUrl);
        if (completedItems.length === 0) return;

        setIsZipping(true);
        try {
            const zip = new JSZip();

            await Promise.all(completedItems.map(async (item) => {
                const response = await fetch(item.processedUrl!);
                const blob = await response.blob();

                const nameParts = item.originalFile.name.split('.');
                const extension = nameParts.pop() || 'png';
                const baseName = nameParts.join('.').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const fileName = `${baseName}-edited.${extension}`;

                zip.file(fileName, blob);
            }));

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = `vixel-ai-batch-${new Date().getTime()}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

        } catch (error) {
            console.error("Failed to create ZIP file", error);
        } finally {
            setIsZipping(false);
        }
    };

    const totalCompleted = batchItems.filter(i => i.status === 'complete').length;
    const isFullyComplete = totalCompleted > 0 && totalCompleted === files.length;
    const canStart = (!!selectedPreset || customPrompt.trim() !== '') && !isProcessing;

    const renderResults = () => {
        if (!hasStartedProcessing || isProcessing) return null;

        if (isFullyComplete) {
            return (
                <div className="w-full p-6 border-2 border-dashed border-green-300 rounded-lg bg-green-50/50 flex flex-col items-center gap-4 text-center">
                    <h3 className="text-2xl font-bold text-green-800">Batch Processing Complete!</h3>
                    <p className="text-green-700">Images that failed to process have been removed. You can download your successful edits below.</p>
                    {renderActionButtons()}
                </div>
            );
        } else {
             return (
                <div className="w-full p-6 border-2 border-dashed border-amber-400 rounded-lg bg-amber-900/20 flex flex-col items-center gap-4 text-center">
                    <h3 className="text-2xl font-bold text-amber-200">Batch Processing Stopped</h3>
                    <p className="text-amber-300">The process was stopped. {totalCompleted} images were successfully processed and are available for download.</p>
                    {renderActionButtons()}
                </div>
            );
        }
    }

    const renderActionButtons = () => (
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
            <button
                onClick={handleDownloadAll}
                disabled={isZipping || totalCompleted === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-3 bg-gradient-to-br from-purple-600 to-fuchsia-500 text-white font-bold py-3 px-8 text-base rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-purple-400 disabled:to-fuchsia-300 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
            >
                {isZipping ? (
                    <>
                        <Spinner /> Zipping...
                    </>
                ) : (
                    <>
                        <DownloadZipIcon className="w-5 h-5" />
                        Download All as ZIP
                    </>
                )}
            </button>
            <button 
                onClick={onExit}
                className="text-center bg-gray-800 border border-gray-700 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-700 active:scale-95 text-sm"
            >
                Start Over
            </button>
        </div>
    );

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
            <div className="w-full bg-gray-900 border border-gray-700/50 rounded-xl p-4 md:p-6 flex flex-col gap-4 backdrop-blur-sm shadow-lg">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-200">Batch Processing</h2>
                    <p className="text-md text-gray-400">{files.length} images ready to edit.</p>
                </div>

                {/* --- Step 1: Controls --- */}
                {!hasStartedProcessing && (
                    <div className="w-full p-4 border-2 border-dashed border-gray-700 rounded-lg bg-gray-800/50 flex flex-col items-center gap-4">
                        <div className="w-full flex flex-col items-center gap-4">
                            <label className="text-lg font-semibold text-gray-200">
                               1. Select a Preset Effect
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 w-full">
                               {presets.map(preset => (
                                  <button
                                    key={preset.name}
                                    onClick={() => handlePresetClick(preset)}
                                    className={`w-full text-center border font-semibold py-3 px-2 rounded-md transition-all duration-200 ease-in-out active:scale-95 text-sm ${selectedPreset?.name === preset.name ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700'}`}
                                  >
                                    {preset.name}
                                  </button>
                               ))}
                            </div>
                        </div>

                        <div className="flex items-center w-full max-w-lg my-2">
                            <div className="flex-grow border-t border-gray-700"></div>
                            <span className="flex-shrink mx-4 text-gray-400 font-semibold">OR</span>
                            <div className="flex-grow border-t border-gray-700"></div>
                        </div>
                        
                        <div className="w-full flex flex-col items-center gap-4">
                            <label htmlFor="custom-prompt-input" className="text-lg font-semibold text-gray-200">
                                2. Describe a Custom Edit
                            </label>
                            <input
                                id="custom-prompt-input"
                                type="text"
                                value={customPrompt}
                                onChange={handleCustomPromptChange}
                                placeholder="e.g., 'remove the background and make it transparent'"
                                className="w-full max-w-xl bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-4 text-base focus:ring-2 focus:ring-purple-500 focus:outline-none transition disabled:cursor-not-allowed disabled:opacity-60 placeholder-gray-500"
                                disabled={isProcessing}
                            />
                        </div>

                        <button
                            onClick={handleStartProcessing}
                            disabled={!canStart}
                            className="w-full max-w-md mt-4 bg-gradient-to-br from-purple-600 to-fuchsia-500 text-white font-bold py-4 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-purple-400 disabled:to-fuchsia-300 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                        >
                            Start Batch Process
                        </button>
                    </div>
                )}
                
                {/* --- Step 2: Progress --- */}
                {isProcessing && (
                     <div className="w-full p-6 border-2 border-dashed border-gray-700 rounded-lg bg-gray-800/50 flex flex-col items-center gap-4">
                         <h3 className="text-xl font-semibold text-gray-200">Processing... Please keep this window open.</h3>
                         <div className="w-full max-w-2xl bg-gray-700 rounded-full h-5 overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-purple-500 to-fuchsia-500 h-full rounded-full transition-all duration-500 ease-out progress-bar-animated"
                                style={{ width: `${(processedCount / files.length) * 100}%`}}
                            ></div>
                         </div>
                         <p className="font-mono text-purple-300 text-lg mt-1">{processedCount} / {files.length} images processed</p>
                         <button 
                            onClick={handleCancelProcessing}
                            className="mt-2 text-center text-red-500 font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-red-500/10 active:scale-95 text-sm"
                         >
                            Cancel Processing
                         </button>
                    </div>
                )}

                {/* --- Step 3: Results --- */}
                {renderResults()}
            </div>
            
            <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {batchItems.map(item => <BatchItem key={item.id} item={item} />)}
            </div>
        </div>
    );
};

export default BatchProcessingScreen;
