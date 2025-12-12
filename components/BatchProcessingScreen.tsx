
import React, { useState, useCallback, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { generateFilteredImage, generateAdjustedImage, generateStyleTransferImage } from '../services/geminiService';
import BatchItem from './BatchItem';
import { DownloadZipIcon, UploadIcon, RetryIcon } from './icons';
import Spinner from './Spinner';

interface BatchProcessingScreenProps {
  files: File[];
  onExit: () => void;
}

export interface BatchItem {
    id: string;
    originalFile: File;
    processedUrl?: string;
    status: 'pending' | 'processing' | 'complete' | 'error';
    errorMessage?: string;
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

    // New states for style transfer mode
    const [batchMode, setBatchMode] = useState<'effect' | 'style'>('effect');
    const [styleFile, setStyleFile] = useState<File | null>(null);
    const [stylePreviewUrl, setStylePreviewUrl] = useState<string | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [styleError, setStyleError] = useState<string | null>(null);
    const [stylePrompt, setStylePrompt] = useState('');
    const [isAdaptive, setIsAdaptive] = useState(false);
    
    useEffect(() => {
        let objectUrl: string | null = null;
        if (styleFile) {
          objectUrl = URL.createObjectURL(styleFile);
          setStylePreviewUrl(objectUrl);
          return () => {
            if (objectUrl) {
              URL.revokeObjectURL(objectUrl);
            }
          };
        } else {
          setStylePreviewUrl(null);
        }
    }, [styleFile]);

    const handlePresetClick = (preset: (typeof presets)[number]) => {
        setSelectedPreset(preset);
        setCustomPrompt('');
    };

    const handleCustomPromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomPrompt(e.target.value);
        setSelectedPreset(null);
    };

    const handleStartProcessing = useCallback(async (itemsToProcess: BatchItem[]) => {
        const canStartEffect = batchMode === 'effect' && (customPrompt.trim() || selectedPreset?.prompt);
        const canStartStyle = batchMode === 'style' && styleFile;
        if ((!canStartEffect && !canStartStyle) || itemsToProcess.length === 0) return;

        setHasStartedProcessing(true);
        isCancelledRef.current = false;
        setIsProcessing(true);

        const isInitialRun = itemsToProcess.length === batchItems.length && itemsToProcess.every(item => item.status !== 'complete');
        if (isInitialRun) {
            setProcessedCount(0);
        }

        setBatchItems(prev => prev.map(i => itemsToProcess.find(p => p.id === i.id) ? { ...i, status: 'pending', errorMessage: undefined } : i));
        await new Promise(resolve => setTimeout(resolve, 100));

        for (const item of itemsToProcess) {
            if (isCancelledRef.current) break;

            setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));
            try {
                const apiCall = () => {
                    if (batchMode === 'effect') {
                        const activePrompt = customPrompt.trim() || selectedPreset?.prompt;
                        if (customPrompt.trim()) return generateAdjustedImage(item.originalFile, activePrompt!, isAdaptive);
                        if (selectedPreset) return selectedPreset.type === 'adjustment' ? generateAdjustedImage(item.originalFile, selectedPreset.prompt, isAdaptive) : generateFilteredImage(item.originalFile, selectedPreset.prompt, isAdaptive);
                    } else if (batchMode === 'style') {
                        return generateStyleTransferImage(item.originalFile, styleFile!, stylePrompt);
                    }
                    return Promise.reject(new Error("Invalid processing mode or missing inputs."));
                };
                const resultUrl = await withRetry(apiCall);
                
                if (isCancelledRef.current) break;
                setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'complete', processedUrl: resultUrl } : i));
            } catch (err) {
                if (isCancelledRef.current) break;
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                console.error(`Failed to process ${item.originalFile.name}:`, err);
                setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', errorMessage } : i));
            }
             if (!isCancelledRef.current) {
                setProcessedCount(prev => prev + 1);
            }
        }
        setIsProcessing(false);
    }, [selectedPreset, customPrompt, batchItems, batchMode, styleFile, stylePrompt, isAdaptive]);

    const handleCancelProcessing = () => {
        isCancelledRef.current = true;
        setBatchItems(prev => prev.map(item =>
            item.status === 'processing' ? { ...item, status: 'pending' } : item
        ));
    };

    const handleRetryFailed = () => {
        const failedItems = batchItems.filter(item => item.status === 'error');
        handleStartProcessing(failedItems);
    }
    
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

    const handleStyleFileSelect = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const file = files[0];
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        
        if (allowedTypes.includes(file.type)) {
          setStyleFile(file);
          setStyleError(null);
        } else {
          setStyleError(`Unsupported file type. Please use JPG, PNG, GIF, or WEBP.`);
          setStyleFile(null);
        }
    };

    const totalCompleted = batchItems.filter(i => i.status === 'complete').length;
    const totalFailed = batchItems.filter(i => i.status === 'error').length;
    const totalPending = batchItems.filter(i => i.status === 'pending' || i.status === 'processing').length;
    const totalImages = batchItems.length;

    const isFullyComplete = !isProcessing && hasStartedProcessing && totalPending === 0;
    const canStart = !isProcessing && (
        (batchMode === 'effect' && (!!selectedPreset || customPrompt.trim() !== '')) ||
        (batchMode === 'style' && !!styleFile)
    );
    
    const renderStyleUploader = () => {
        if (styleError) {
            return (
                <div className="w-full max-w-lg h-48 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-red-100/50 border-red-300 text-center p-4">
                    <p className="text-sm font-semibold text-red-700">Error</p>
                    <p className="text-xs text-red-600 mt-1">{styleError}</p>
                    <button onClick={() => setStyleError(null)} className="mt-4 bg-red-500 text-white text-xs font-bold py-1 px-3 rounded-md hover:bg-red-600 transition-colors">
                        Try Again
                    </button>
                </div>
            );
        }
    
        if (stylePreviewUrl) {
            return (
                <div className="w-full flex flex-col items-center gap-4 animate-fade-in">
                    <p className="text-lg font-semibold text-gray-200">1. Selected Style Image</p>
                    <div className="relative group">
                        <img src={stylePreviewUrl} alt="Style preview" className="h-40 w-auto rounded-lg shadow-md" />
                        <button
                            onClick={() => setStyleFile(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Remove style image"
                        >
                            &times;
                        </button>
                    </div>
                </div>
            );
        }
    
        return (
            <div className="w-full flex flex-col items-center gap-4">
                <label className="text-lg font-semibold text-gray-200">1. Upload a Style Image</label>
                <label
                    htmlFor="style-image-upload"
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                    onDragLeave={() => setIsDraggingOver(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingOver(false);
                        handleStyleFileSelect(e.dataTransfer.files);
                    }}
                    className={`w-full max-w-lg h-48 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 ${isDraggingOver ? 'border-purple-500 bg-gray-800 ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900' : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'}`}
                >
                    <div className={`flex flex-col items-center justify-center pt-5 pb-6 text-purple-400 transition-transform duration-200 ${isDraggingOver ? 'scale-105' : ''}`}>
                        <UploadIcon className="w-10 h-10 mb-3" />
                        <p className="mb-2 text-sm text-center font-semibold px-2">{isDraggingOver ? 'Drop the image!' : 'Click to upload or drag and drop'}</p>
                        <p className="text-xs text-gray-500">JPG, PNG, WEBP, or GIF</p>
                    </div>
                    <input id="style-image-upload" type="file" className="hidden" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(e) => handleStyleFileSelect(e.target.files)} />
                </label>
            </div>
        );
    };

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
            <div className="w-full bg-gray-900 border border-gray-700/50 rounded-xl p-4 md:p-6 flex flex-col gap-6 backdrop-blur-sm shadow-lg">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-200">Batch Processing</h2>
                    <p className="text-md text-gray-400">{totalImages} images loaded.</p>
                </div>

                {/* --- Step 1: Controls (if not started) --- */}
                {!hasStartedProcessing && (
                    <div className="w-full p-4 border-2 border-dashed border-gray-700 rounded-lg bg-gray-800/50 flex flex-col items-center gap-6">
                        <div className="p-1 bg-gray-700/50 rounded-lg flex gap-1 w-full max-w-md">
                            <button onClick={() => setBatchMode('effect')} className={`w-full py-2 rounded-md font-semibold transition-all duration-200 ${batchMode === 'effect' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:bg-gray-700'}`}>
                              Apply Effect
                            </button>
                            <button onClick={() => setBatchMode('style')} className={`w-full py-2 rounded-md font-semibold transition-all duration-200 ${batchMode === 'style' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:bg-gray-700'}`}>
                              Apply Style
                            </button>
                        </div>

                        {batchMode === 'effect' && (
                            <div className="w-full flex flex-col items-center gap-4 animate-fade-in">
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
                            </div>
                        )}
                        
                        {batchMode === 'style' && (
                           <div className="w-full flex flex-col items-center gap-4 animate-fade-in">
                                {renderStyleUploader()}
                                {styleFile && (
                                    <div className="w-full flex flex-col items-center gap-4 mt-4 animate-fade-in">
                                        <label htmlFor="style-prompt-input" className="text-lg font-semibold text-gray-200">
                                            2. Describe how to apply the style (Optional)
                                        </label>
                                        <input
                                            id="style-prompt-input"
                                            type="text"
                                            value={stylePrompt}
                                            onChange={(e) => setStylePrompt(e.target.value)}
                                            placeholder="e.g., 'focus on the texture and color palette'"
                                            className="w-full max-w-xl bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-4 text-base focus:ring-2 focus:ring-purple-500 focus:outline-none transition disabled:cursor-not-allowed disabled:opacity-60 placeholder-gray-500"
                                            disabled={isProcessing}
                                        />
                                    </div>
                                )}
                           </div>
                        )}

                        {batchMode === 'effect' && (
                          <div className="relative group flex items-center justify-center mt-4 p-3 bg-gray-700/50 rounded-lg">
                              <label className="flex items-center cursor-pointer">
                                  <div className="relative">
                                      <input type="checkbox" checked={isAdaptive} onChange={() => setIsAdaptive(!isAdaptive)} className="sr-only peer" />
                                      <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                                      <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-full peer-checked:bg-purple-400"></div>
                                  </div>
                                  <div className="ml-3 text-gray-200 font-semibold">
                                      Enable Adaptive AI
                                  </div>
                              </label>
                              <div className="absolute z-10 bottom-full mb-2 w-max max-w-xs p-2 bg-gray-900 border border-gray-700 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                When enabled, the AI will intelligently adapt the selected effect for each image's unique lighting and composition, aiming for a consistent look across the batch.
                              </div>
                          </div>
                        )}

                        <button
                            onClick={() => handleStartProcessing(batchItems)}
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
                                style={{ width: `${(processedCount / totalImages) * 100}%`}}
                            ></div>
                         </div>
                         <div className="flex gap-4 sm:gap-6 font-mono text-sm mt-2">
                             <span className="text-purple-300">Total: {totalImages}</span>
                             <span className="text-green-400">Success: {totalCompleted}</span>
                             <span className="text-red-400">Failed: {totalFailed}</span>
                         </div>
                         <button 
                            onClick={handleCancelProcessing}
                            className="mt-2 text-center text-red-500 font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-red-500/10 active:scale-95 text-sm"
                         >
                            Cancel Processing
                         </button>
                    </div>
                )}

                {/* --- Step 3: Results --- */}
                {isFullyComplete && (
                    <div className="w-full p-6 border-2 border-dashed border-purple-400 rounded-lg bg-purple-950/20 flex flex-col items-center gap-4 text-center">
                        <h3 className="text-2xl font-bold text-gray-200">
                            {isCancelledRef.current ? "Processing Stopped" : "Processing Complete!"}
                        </h3>
                        <p className="text-gray-400">
                           {totalCompleted} of {totalImages} images processed successfully. {totalFailed > 0 && `${totalFailed} failed.`}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                             <button
                                onClick={handleDownloadAll}
                                disabled={isZipping || totalCompleted === 0}
                                className="flex items-center justify-center gap-3 bg-gradient-to-br from-purple-600 to-fuchsia-500 text-white font-bold py-3 px-6 text-base rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-purple-400 disabled:to-fuchsia-300 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {isZipping ? <><Spinner /> Zipping...</> : <><DownloadZipIcon className="w-5 h-5" /> Download All ({totalCompleted})</>}
                            </button>
                            {totalFailed > 0 && (
                                <button 
                                    onClick={handleRetryFailed}
                                    className="flex items-center justify-center gap-2 text-center bg-gray-800 border border-gray-700 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-700 active:scale-95 text-sm"
                                >
                                    <RetryIcon className="w-4 h-4" />
                                    Retry Failed ({totalFailed})
                                </button>
                            )}
                            <button 
                                onClick={onExit}
                                className="text-center bg-gray-800 border border-gray-700 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-700 active:scale-95 text-sm"
                            >
                                Start Over
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {batchItems.map(item => <BatchItem key={item.id} item={item} />)}
            </div>
        </div>
    );
};

export default BatchProcessingScreen;
