/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, generateStyleTransferImage, generateMaskedImage } from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel, { type ManualAdjustments, defaultAdjustments } from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import { UndoIcon, RedoIcon, EyeIcon, CompareIcon } from './components/icons';
import StartScreen from './components/StartScreen';
import ImageComparator from './components/ImageComparator';
import StyleTransferPanel from './components/StyleTransferPanel';
import BatchProcessingScreen from './components/BatchProcessingScreen';
import ZoomControls from './components/ZoomControls';
import MaskPanel from './components/MaskPanel';
import MaskingCanvas, { type MaskingCanvasRef } from './components/MaskingCanvas';

// Helper to convert a data URL string to a File object
export const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

type Tab = 'retouch' | 'adjust' | 'filters' | 'mask' | 'crop' | 'style';
type AppMode = 'start' | 'single' | 'batch';

const App: React.FC = () => {
  // Global State
  const [appMode, setAppMode] = useState<AppMode>('start');
  const [error, setError] = useState<string | null>(null);
  
  // Single Image Mode State
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('retouch');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [isSliderCompareActive, setIsSliderCompareActive] = useState<boolean>(false);
  const [manualAdjustments, setManualAdjustments] = useState<ManualAdjustments>(defaultAdjustments);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Batch Mode State
  const [batchFiles, setBatchFiles] = useState<File[]>([]);

  // Zoom & Pan State
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [isSpacebarDown, setIsSpacebarDown] = useState<boolean>(false);
  const panStartRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const didPanRef = useRef(false);

  // History Brush (Masking) State
  const [brushSourceIndex, setBrushSourceIndex] = useState<number | null>(null);
  const [brushSize, setBrushSize] = useState<number>(50);
  const [brushHardness, setBrushHardness] = useState<number>(100);
  const [brushMode, setBrushMode] = useState<'brush' | 'erase'>('brush');
  const [maskResetTrigger, setMaskResetTrigger] = useState<number>(0);
  const [drawnMaskDataUrl, setDrawnMaskDataUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [brushCursorPosition, setBrushCursorPosition] = useState<{ x: number, y: number } | null>(null);
  const [canUndoMaskStroke, setCanUndoMaskStroke] = useState<boolean>(false);
  const [canRedoMaskStroke, setCanRedoMaskStroke] = useState<boolean>(false);
  const maskingCanvasRef = useRef<MaskingCanvasRef>(null);


  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  // Effect to create and revoke object URLs safely for the current image
  useEffect(() => {
    if (appMode === 'single' && currentImage) {
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage, appMode]);
  
  // Effect to create and revoke object URLs safely for the original image
  useEffect(() => {
    if (appMode === 'single' && originalImage) {
      const url = URL.createObjectURL(originalImage);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalImageUrl(null);
    }
  }, [originalImage, appMode]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
    // Set a timeout to reset didPanRef, allowing click events to register again.
    setTimeout(() => { didPanRef.current = false; }, 0);
  }, []);
  
  // Effect for spacebar panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const activeElement = document.activeElement as HTMLElement;
        const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
        
        if (isTyping) return; // Do not interfere with text input fields

        if (e.code === 'Space' && !e.repeat && appMode === 'single' && !isLoading) {
            e.preventDefault();
            setIsSpacebarDown(true);
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        const activeElement = document.activeElement as HTMLElement;
        const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

        if (isTyping) return;

        if (e.code === 'Space' && appMode === 'single') {
            e.preventDefault();
            setIsSpacebarDown(false);
            // If the user was panning, end it when space is released.
            if (isPanning) {
              handlePanEnd();
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [appMode, isLoading, isPanning, handlePanEnd]);

  const getClampedPan = useCallback((newPan: { x: number, y: number }, currentZoom: number) => {
      if (!imgRef.current) return newPan;

      // The container for the image gives us the viewport size
      const container = imgRef.current.parentElement;
      if (!container) return newPan;

      const { clientWidth, clientHeight } = container;
      
      // Pan limits are calculated based on how much the scaled image overflows the viewport
      // The pan value is in pre-zoom units, so we must divide the pixel overflow by the zoom level.
      const panLimitX = Math.max(0, (clientWidth * currentZoom - clientWidth) / (2 * currentZoom));
      const panLimitY = Math.max(0, (clientHeight * currentZoom - clientHeight) / (2 * currentZoom));

      return {
          x: Math.max(-panLimitX, Math.min(panLimitX, newPan.x)),
          y: Math.max(-panLimitY, Math.min(panLimitY, newPan.y)),
      };
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const addImageToHistory = useCallback((newImageFile: File) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    // Reset transient states after an action
    setCrop(undefined);
    setCompletedCrop(undefined);
    setManualAdjustments(defaultAdjustments);
    setDrawnMaskDataUrl(null);
    setBrushSourceIndex(null);
    setMaskResetTrigger(t => t + 1);
    setCanUndoMaskStroke(false);
    setCanRedoMaskStroke(false);
  }, [history, historyIndex]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const validFiles = Array.from(files).filter(file => allowedTypes.includes(file.type));
    
    if (validFiles.length === 0) {
        setError("No valid image files were selected. Please upload files in JPG, PNG, GIF, or WEBP format.");
        return;
    }
    
    if (validFiles.length < files.length) {
        setError("Some files were not supported and have been ignored. Please only use JPG, PNG, GIF, or WEBP formats.");
    }
        
    if (validFiles.length === 1) {
        setHistory([validFiles[0]]);
        setHistoryIndex(0);
        setEditHotspot(null);
        setDisplayHotspot(null);
        setActiveTab('retouch');
        setCrop(undefined);
        setCompletedCrop(undefined);
        setManualAdjustments(defaultAdjustments);
        handleZoomReset();
        setAppMode('single');
    } else {
        setBatchFiles(validFiles);
        setAppMode('batch');
        // Reset single-mode state
        setHistory([]);
        setHistoryIndex(-1);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!currentImage) {
      setError('No image loaded to edit.');
      return;
    }
    
    if (!prompt.trim()) {
        setError('Please enter a description for your edit.');
        return;
    }

    if (!editHotspot) {
        setError('Please click on the image to select an area to edit.');
        return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
        const editedImageUrl = await generateEditedImage(currentImage, prompt, editHotspot);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setEditHotspot(null);
        setDisplayHotspot(null);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, prompt, editHotspot, addImageToHistory]);
  
  const handleApplyFilter = useCallback(async (filterPrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply a filter to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const filteredImageUrl = await generateFilteredImage(currentImage, filterPrompt);
        const newImageFile = dataURLtoFile(filteredImageUrl, `filtered-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the filter. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleApplyStyleTransfer = useCallback(async (styleImage: File, prompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply a style to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const stylizedImageUrl = await generateStyleTransferImage(currentImage, styleImage, prompt);
        const newImageFile = dataURLtoFile(stylizedImageUrl, `stylized-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the style. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  
  const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
    if (!currentImage) {
      setError('No image loaded to apply an adjustment to.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
        const adjustedImageUrl = await generateAdjustedImage(currentImage, adjustmentPrompt);
        const newImageFile = dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the adjustment. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, addImageToHistory]);

  const handleApplyMask = useCallback(async () => {
    if (!currentImage || brushSourceIndex === null || !drawnMaskDataUrl) {
        setError('Please select a history version and draw a mask on the image first.');
        return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
        const sourceImage = history[brushSourceIndex];
        const maskFile = dataURLtoFile(drawnMaskDataUrl, `mask-${Date.now()}.png`);

        const combinedImageUrl = await generateMaskedImage(currentImage, sourceImage, maskFile);
        const newImageFile = dataURLtoFile(combinedImageUrl, `masked-${Date.now()}.png`);
        
        addImageToHistory(newImageFile);
        
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to apply the history brush. ${errorMessage}`);
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, brushSourceIndex, drawnMaskDataUrl, history, addImageToHistory]);

  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) {
        setError('Please select an area to crop.');
        return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        setError('Could not process the crop.');
        return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = completedCrop.width * pixelRatio;
    canvas.height = completedCrop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );
    
    const croppedImageUrl = canvas.toDataURL('image/png');
    const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
    addImageToHistory(newImageFile);

  }, [completedCrop, addImageToHistory]);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(historyIndex - 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
      setManualAdjustments(defaultAdjustments);
      handleZoomReset();
    }
  }, [canUndo, historyIndex, handleZoomReset]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(historyIndex + 1);
      setEditHotspot(null);
      setDisplayHotspot(null);
      setManualAdjustments(defaultAdjustments);
      handleZoomReset();
    }
  }, [canRedo, historyIndex, handleZoomReset]);

  const handleReset = useCallback(() => {
    if (history.length > 0) {
      setHistoryIndex(0);
      setError(null);
      setEditHotspot(null);
      setDisplayHotspot(null);
      setIsSliderCompareActive(false);
      setManualAdjustments(defaultAdjustments);
      handleZoomReset();
    }
  }, [history, handleZoomReset]);

  const handleStartOver = useCallback(() => {
      setHistory([]);
      setHistoryIndex(-1);
      setError(null);
      setPrompt('');
      setEditHotspot(null);
      setDisplayHotspot(null);
      setIsSliderCompareActive(false);
      setManualAdjustments(defaultAdjustments);
      setBatchFiles([]);
      handleZoomReset();
      setAppMode('start');
  }, [handleZoomReset]);

  const handleDownload = useCallback(() => {
      if (currentImage) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(currentImage);
          link.download = `vixel-ai-edited-${currentImage.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
      }
  }, [currentImage]);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeTab !== 'retouch' || didPanRef.current || isSpacebarDown) return;
    
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    const xOnUnscaled = offsetX / zoom;
    const yOnUnscaled = offsetY / zoom;
    
    setDisplayHotspot({ x: xOnUnscaled, y: yOnUnscaled });

    const { naturalWidth, naturalHeight } = img;
    const imgDOMWidth = rect.width / zoom;
    const scaleToNatural = naturalWidth / imgDOMWidth;

    const originalX = Math.round(xOnUnscaled * scaleToNatural);
    const originalY = Math.round(yOnUnscaled * scaleToNatural);

    setEditHotspot({ x: originalX, y: originalY });
  };

  const generateFilterStyle = (adjustments: ManualAdjustments): React.CSSProperties => {
    const { brightness, contrast, saturation, hue } = adjustments;
    const filters: string[] = [];

    if (brightness !== 100) filters.push(`brightness(${brightness}%)`);
    if (contrast !== 100) filters.push(`contrast(${contrast}%)`);
    if (saturation !== 100) filters.push(`saturate(${saturation}%)`);
    if (hue !== 0) filters.push(`hue-rotate(${hue}deg)`);

    if (filters.length === 0) {
        return {};
    }
    
    return {
        filter: filters.join(' ')
    };
  };

  const imageStyle = generateFilterStyle(manualAdjustments);

  const ZOOM_STEP = 0.2;
  const handleZoom = (newZoomLevel: number) => {
    const clampedZoom = Math.max(0.5, Math.min(5, newZoomLevel));

    if (imgRef.current?.parentElement) {
      const { clientWidth, clientHeight } = imgRef.current.parentElement;
      const focusX = clientWidth / 2; // Center of viewport
      const focusY = clientHeight / 2;

      // Pan logic to zoom towards the center of the viewport
      const newPanX = (focusX / clampedZoom) - (focusX / zoom) + pan.x;
      const newPanY = (focusY / clampedZoom) - (focusY / zoom) + pan.y;

      const clampedPan = getClampedPan({x: newPanX, y: newPanY}, clampedZoom);

      setZoom(clampedZoom);
      setPan(clampedPan);
    } else {
      setZoom(clampedZoom);
    }
  };

  const handleZoomIn = () => handleZoom(zoom + ZOOM_STEP);
  const handleZoomOut = () => handleZoom(zoom - ZOOM_STEP);

  const handlePanStart = (e: React.MouseEvent | React.TouchEvent) => {
    const isPannable = (zoom > 1 || isSpacebarDown) && activeTab !== 'crop' && activeTab !== 'mask' && !isSliderCompareActive;
    if (!isPannable) return;
    
    e.preventDefault();
    didPanRef.current = false;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    panStartRef.current = { startX: clientX, startY: clientY, panX: pan.x, panY: pan.y };
    setIsPanning(true);
  };
  
  const handlePanMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPanning || !panStartRef.current) return;
    e.preventDefault();
    didPanRef.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const dx = clientX - panStartRef.current.startX;
    const dy = clientY - panStartRef.current.startY;
  
    // Pan values are in pre-zoom units, so divide mouse movement by zoom
    const newPanX = panStartRef.current.panX + (dx / zoom);
    const newPanY = panStartRef.current.panY + (dy / zoom);
  
    setPan(getClampedPan({x: newPanX, y: newPanY}, zoom));
  };
  
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (activeTab === 'crop' || isSliderCompareActive) return;
    
    e.preventDefault();
    
    const ZOOM_SENSITIVITY = 0.001;
    const newZoom = zoom - e.deltaY * ZOOM_SENSITIVITY * zoom;
    const clampedZoom = Math.max(0.5, Math.min(5, newZoom));
    
    if (clampedZoom.toFixed(2) === zoom.toFixed(2)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Pan logic to keep the point under the cursor stationary
    // T' = (p/s') - (p/s) + T
    const newPanX = (mouseX / clampedZoom) - (mouseX / zoom) + pan.x;
    const newPanY = (mouseY / clampedZoom) - (mouseY / zoom) + pan.y;
    
    const clampedPan = getClampedPan({x: newPanX, y: newPanY}, clampedZoom);

    setZoom(clampedZoom);
    setPan(clampedPan);
  }, [zoom, pan, activeTab, isSliderCompareActive, getClampedPan]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setImageDimensions({ width: e.currentTarget.clientWidth, height: e.currentTarget.clientHeight });
  };

  const handleUndoMaskStroke = () => {
    maskingCanvasRef.current?.undo();
  };
  
  const handleRedoMaskStroke = () => {
    maskingCanvasRef.current?.redo();
  };

  const renderContent = () => {
    if (isLoading && appMode === 'start') {
        return (
             <div className="text-center animate-fade-in flex flex-col items-center gap-4">
                <Spinner />
                <p className="text-gray-300 font-medium">Processing image(s)...</p>
             </div>
        )
    }

    if (error) {
       return (
           <div className="text-center animate-fade-in bg-red-100 border border-red-300 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-red-800">An Error Occurred</h2>
            <p className="text-md text-red-600">{error}</p>
            <button
                onClick={handleStartOver}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
              >
                Start Over
            </button>
          </div>
        );
    }
    
    if (appMode === 'start') {
      return <StartScreen onFileSelect={handleFileSelect} />;
    }
    
    if (appMode === 'batch') {
        return <BatchProcessingScreen files={batchFiles} onExit={handleStartOver} />;
    }

    const isPannable = (zoom > 1 || isSpacebarDown) && activeTab !== 'crop' && activeTab !== 'mask' && !isSliderCompareActive;
    
    let cursorClass = '';
    if (activeTab === 'mask') cursorClass = 'cursor-none';
    else if (isPannable) cursorClass = isPanning ? 'cursor-grabbing' : 'cursor-grab';

    const imageDisplay = (
       <div 
        className={`relative w-full rounded-xl overflow-hidden ${cursorClass}`}
        style={{maxHeight: '60vh'}}
        onMouseDown={handlePanStart}
        onMouseMove={(e) => {
            handlePanMove(e);
            if(activeTab === 'mask') {
                const rect = e.currentTarget.getBoundingClientRect();
                setBrushCursorPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }
        }}
        onMouseUp={handlePanEnd}
        onMouseLeave={() => {
            handlePanEnd();
            if (activeTab === 'mask') setBrushCursorPosition(null);
        }}
        onTouchStart={handlePanStart}
        onTouchMove={handlePanMove}
        onTouchEnd={handlePanEnd}
        onWheel={handleWheel}
      >
        <div // Transform wrapper
            className="relative w-full h-full"
            style={{
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                willChange: 'transform',
            }}
        >
            {originalImageUrl && (
                 <img
                    key={originalImageUrl}
                    src={originalImageUrl}
                    alt="Original"
                    className="w-full h-auto object-contain max-h-[60vh] rounded-xl pointer-events-none"
                 />
            )}
            <img
                ref={imgRef}
                key={currentImageUrl}
                src={currentImageUrl!}
                alt="Current"
                onLoad={onImageLoad}
                onClick={handleImageClick}
                style={imageStyle}
                className={`absolute top-0 left-0 w-full h-auto object-contain max-h-[60vh] rounded-xl transition-opacity duration-200 ease-in-out ${isComparing ? 'opacity-0' : 'opacity-100'} ${(activeTab === 'retouch' && !isPannable) ? 'cursor-crosshair' : ''}`}
                draggable={false}
            />
             {displayHotspot && !isLoading && activeTab === 'retouch' && !isSliderCompareActive && (
                <div 
                    className="absolute rounded-full w-6 h-6 bg-purple-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}
                >
                    <div className="absolute inset-0 rounded-full w-full h-full animate-ping bg-purple-400"></div>
                </div>
            )}
             {activeTab === 'mask' && !isLoading && imageDimensions.width > 0 && (
                <MaskingCanvas
                    ref={maskingCanvasRef}
                    width={imageDimensions.width}
                    height={imageDimensions.height}
                    brushSize={brushSize}
                    brushHardness={brushHardness}
                    brushMode={brushMode}
                    onMaskChange={setDrawnMaskDataUrl}
                    onDrawEnd={() => {}}
                    resetTrigger={maskResetTrigger}
                    onUndoStateChange={setCanUndoMaskStroke}
                    onRedoStateChange={setCanRedoMaskStroke}
                />
            )}
        </div>
         {activeTab === 'mask' && brushCursorPosition && !isPanning && (
            <div
                className="absolute rounded-full border border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-20"
                style={{
                    left: brushCursorPosition.x,
                    top: brushCursorPosition.y,
                    width: brushSize * zoom,
                    height: brushSize * zoom,
                    mixBlendMode: 'difference'
                }}
            />
        )}
      </div>
    );
    
    const cropImageElement = (
      <img 
        ref={imgRef}
        key={`crop-${currentImageUrl}`}
        src={currentImageUrl!} 
        alt="Crop this image"
        style={imageStyle}
        className="w-full h-auto object-contain max-h-[60vh] rounded-xl"
      />
    );


    return (
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative w-full bg-gray-900 border border-gray-700/50 rounded-xl overflow-hidden p-2">
            {isLoading && (
                <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
                    <Spinner />
                    <p className="text-gray-300 font-medium">AI is working its magic...</p>
                </div>
            )}
            
            {activeTab === 'crop' ? (
              <ReactCrop 
                crop={crop} 
                onChange={c => setCrop(c)} 
                onComplete={c => setCompletedCrop(c)}
                aspect={aspect}
                className="max-h-[60vh]"
              >
                {cropImageElement}
              </ReactCrop>
            ) : isSliderCompareActive && originalImageUrl && currentImageUrl ? (
                <ImageComparator 
                  beforeImageUrl={originalImageUrl} 
                  afterImageUrl={currentImageUrl}
                  afterImageStyle={imageStyle}
                />
            ) : imageDisplay }
            
            {!isSliderCompareActive && activeTab !== 'crop' && activeTab !== 'mask' && (
                <ZoomControls 
                    zoom={zoom} 
                    onZoomIn={handleZoomIn} 
                    onZoomOut={handleZoomOut} 
                    onReset={handleZoomReset} 
                />
            )}
        </div>
        
        <div className="w-full bg-gray-900 border border-gray-700/50 rounded-xl p-2 flex items-center justify-center gap-2 backdrop-blur-sm shadow-md">
            {(['retouch', 'adjust', 'filters', 'mask', 'crop', 'style'] as Tab[]).map(tab => (
                 <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`w-full capitalize font-semibold py-3 px-2 sm:px-5 rounded-lg transition-all duration-200 text-sm sm:text-base ${
                        activeTab === tab 
                        ? 'bg-gradient-to-br from-purple-600 to-fuchsia-500 text-white shadow-lg shadow-purple-500/40' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>
        
        <div className="w-full">
            {activeTab === 'retouch' && (
                <div className="flex flex-col items-center gap-4">
                    <p className="text-md text-gray-400">
                        {editHotspot ? 'Great! Now describe your localized edit below.' : 'Click an area on the image to make a precise edit.'}
                    </p>
                    <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex items-center gap-3">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={editHotspot ? "e.g., 'change my shirt color to blue'" : "First click a point on the image"}
                            className="flex-grow bg-gray-800 border-gray-700 text-gray-200 rounded-lg p-4 text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 placeholder-gray-500"
                            disabled={isLoading || !editHotspot}
                        />
                        <button 
                            type="submit"
                            className="bg-gradient-to-br from-purple-600 to-fuchsia-500 text-white font-bold py-4 px-8 text-base rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-purple-400 disabled:to-fuchsia-300 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                            disabled={isLoading || !prompt.trim() || !editHotspot}
                        >
                            Generate
                        </button>
                    </form>
                </div>
            )}
            {activeTab === 'crop' && <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setAspect} isLoading={isLoading} isCropping={!!completedCrop?.width && completedCrop.width > 0} />}
            {activeTab === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} manualAdjustments={manualAdjustments} onManualAdjustmentsChange={setManualAdjustments} />}
            {activeTab === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} />}
            {activeTab === 'style' && <StyleTransferPanel onApplyStyle={handleApplyStyleTransfer} isLoading={isLoading} />}
            {activeTab === 'mask' && (
                <MaskPanel
                    history={history}
                    historyIndex={historyIndex}
                    brushSourceIndex={brushSourceIndex}
                    onBrushSourceIndexChange={setBrushSourceIndex}
                    brushSize={brushSize}
                    onBrushSizeChange={setBrushSize}
                    brushHardness={brushHardness}
                    onBrushHardnessChange={setBrushHardness}
                    brushMode={brushMode}
                    onBrushModeChange={setBrushMode}
                    onApply={handleApplyMask}
                    onReset={() => {
                        setDrawnMaskDataUrl(null);
                        setMaskResetTrigger(t => t + 1);
                    }}
                    isLoading={isLoading}
                    canApply={!!drawnMaskDataUrl}
                    onUndoStroke={handleUndoMaskStroke}
                    canUndoStroke={canUndoMaskStroke}
                    onRedoStroke={handleRedoMaskStroke}
                    canRedoStroke={canRedoMaskStroke}
                />
            )}
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <button 
                onClick={handleUndo}
                disabled={!canUndo}
                className="flex items-center justify-center text-center bg-gray-800 border border-gray-700 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-700 active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-800/50"
                aria-label="Undo last action"
            >
                <UndoIcon className="w-4 h-4 mr-2" />
                Undo
            </button>
            <button 
                onClick={handleRedo}
                disabled={!canRedo}
                className="flex items-center justify-center text-center bg-gray-800 border border-gray-700 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-700 active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-800/50"
                aria-label="Redo last action"
            >
                <RedoIcon className="w-4 h-4 mr-2" />
                Redo
            </button>
            
            <div className="h-6 w-px bg-gray-700 mx-2 hidden sm:block"></div>

            {canUndo && (
              <>
                <button 
                    onMouseDown={() => setIsComparing(true)}
                    onMouseUp={() => setIsComparing(false)}
                    onMouseLeave={() => setIsComparing(false)}
                    onTouchStart={() => setIsComparing(true)}
                    onTouchEnd={() => setIsComparing(false)}
                    className="flex items-center justify-center text-center bg-gray-800 border border-gray-700 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-700 active:scale-95 text-sm"
                    aria-label="Press and hold to see original image"
                >
                    <EyeIcon className="w-4 h-4 mr-2" />
                    Hold to Compare
                </button>
                <button 
                  onClick={() => setIsSliderCompareActive(!isSliderCompareActive)}
                  className={`flex items-center justify-center text-center border font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out active:scale-95 text-sm ${isSliderCompareActive ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'}`}
                  aria-label="Toggle comparison slider"
                >
                    <CompareIcon className="w-4 h-4 mr-2" />
                    Slider
                </button>
              </>
            )}

            <button 
                onClick={handleReset}
                disabled={!canUndo}
                className="text-center text-purple-400 font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-800 active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset
            </button>
            <button 
                onClick={handleStartOver}
                className="text-center bg-gray-800 border border-gray-700 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-700 active:scale-95 text-sm"
            >
                Upload New
            </button>

            <button 
                onClick={handleDownload}
                className="flex-grow sm:flex-grow-0 ml-auto bg-gradient-to-br from-purple-600 to-fuchsia-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 hover:-translate-y-px active:scale-95 active:shadow-inner text-base"
            >
                Download
            </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen text-gray-200 flex flex-col">
      <Header />
      <main className={`flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex justify-center items-start`}>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;