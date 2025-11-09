/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

interface MaskPanelProps {
  history: File[];
  historyIndex: number;
  brushSourceIndex: number | null;
  onBrushSourceIndexChange: (index: number) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  brushHardness: number;
  onBrushHardnessChange: (hardness: number) => void;
  brushMode: 'brush' | 'erase';
  onBrushModeChange: (mode: 'brush' | 'erase') => void;
  onApply: () => void;
  onReset: () => void;
  isLoading: boolean;
  canApply: boolean;
  onUndoStroke: () => void;
  canUndoStroke: boolean;
  onRedoStroke: () => void;
  canRedoStroke: boolean;
}

const MaskPanel: React.FC<MaskPanelProps> = ({
  history,
  historyIndex,
  brushSourceIndex,
  onBrushSourceIndexChange,
  brushSize,
  onBrushSizeChange,
  brushHardness,
  onBrushHardnessChange,
  brushMode,
  onBrushModeChange,
  onApply,
  onReset,
  isLoading,
  canApply,
  onUndoStroke,
  canUndoStroke,
  onRedoStroke,
  canRedoStroke
}) => {
  const historyThumbnails = React.useMemo(() => history.map((file) => URL.createObjectURL(file)), [history]);
  
  React.useEffect(() => {
    return () => {
      historyThumbnails.forEach(url => URL.revokeObjectURL(url));
    };
  }, [historyThumbnails]);

  return (
    <div className="w-full bg-gray-900 border border-gray-700/50 rounded-xl p-4 flex flex-col gap-6 animate-fade-in backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2">
         <h3 className="text-lg font-semibold text-center text-gray-200">History Brush</h3>
         <p className="text-sm text-gray-400 text-center">Select a previous edit, then paint on the image to restore parts of it.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-base font-medium text-gray-300">1. Select a version to paint from:</label>
        <div className="flex overflow-x-auto gap-2 p-2 bg-gray-800/50 rounded-lg">
          {history.map((_, index) => {
            if (index === historyIndex) return null; // Can't select the current state
            return (
              <button
                key={index}
                onClick={() => onBrushSourceIndexChange(index)}
                className={`relative w-24 h-24 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all duration-200 ${brushSourceIndex === index ? 'border-purple-500 scale-105' : 'border-gray-700 hover:border-purple-400'}`}
              >
                <img src={historyThumbnails[index]} alt={`History state ${index}`} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 w-full bg-black/50 text-white text-xs text-center py-0.5">
                  {index === 0 ? 'Original' : `Step ${index}`}
                </div>
              </button>
            )
          }).reverse()}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <label className="text-base font-medium text-gray-300">2. Configure your brush:</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2">
                <div className="p-1 bg-gray-700/50 rounded-lg flex gap-1 w-full">
                    <button onClick={() => onBrushModeChange('brush')} className={`w-full py-2 rounded-md font-semibold transition-all duration-200 text-sm ${brushMode === 'brush' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:bg-gray-700'}`}>
                      Brush
                    </button>
                    <button onClick={() => onBrushModeChange('erase')} className={`w-full py-2 rounded-md font-semibold transition-all duration-200 text-sm ${brushMode === 'erase' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:bg-gray-700'}`}>
                      Eraser
                    </button>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-400">Size</label>
                    <span className="text-sm font-mono text-purple-300 bg-gray-700/50 px-2 py-1 rounded w-16 text-center">{brushSize}px</span>
                </div>
                <input
                    type="range"
                    min="10"
                    max="200"
                    value={brushSize}
                    onChange={e => onBrushSizeChange(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-purple-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-125"
                    disabled={isLoading}
                />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-400">Hardness</label>
                    <span className="text-sm font-mono text-purple-300 bg-gray-700/50 px-2 py-1 rounded w-16 text-center">{brushHardness}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={brushHardness}
                    onChange={e => onBrushHardnessChange(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-purple-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-125"
                    disabled={isLoading}
                />
            </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-2">
        <button
            onClick={onUndoStroke}
            disabled={isLoading || !canUndoStroke}
            className="w-full text-center bg-gray-800 border border-gray-700 text-gray-300 font-semibold py-3 px-5 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-700 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
            Undo Stroke
        </button>
        <button
            onClick={onRedoStroke}
            disabled={isLoading || !canRedoStroke}
            className="w-full text-center bg-gray-800 border border-gray-700 text-gray-300 font-semibold py-3 px-5 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-700 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
            Redo Stroke
        </button>
        <button
            onClick={onReset}
            disabled={isLoading || !canApply}
            className="w-full text-center bg-gray-800 border border-gray-700 text-gray-300 font-semibold py-3 px-5 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-700 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
            Reset Mask
        </button>
        <button
            onClick={onApply}
            className="w-full bg-gradient-to-br from-purple-600 to-fuchsia-500 text-white font-bold py-3 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-purple-400 disabled:to-fuchsia-300 disabled:shadow-none disabled:cursor-not-allowed"
            disabled={isLoading || !canApply || brushSourceIndex === null}
        >
            Apply with AI
        </button>
      </div>

    </div>
  );
};

export default MaskPanel;