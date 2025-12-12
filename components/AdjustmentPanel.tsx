

import React, { useState } from 'react';

export interface ManualAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  vibrance: number;
  sharpness: number;
}

export const defaultAdjustments: ManualAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  vibrance: 100,
  sharpness: 0,
};

interface AdjustmentPanelProps {
  onApplyAdjustment: (prompt: string) => void;
  isLoading: boolean;
  manualAdjustments: ManualAdjustments;
  onManualAdjustmentsChange: (adjustments: ManualAdjustments) => void;
}

const AdjustmentSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  unit?: string;
}> = ({ label, value, min, max, onChange, unit = '%' }) => (
  <div className="flex flex-col gap-2">
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium text-gray-400">{label}</label>
      <span className="text-sm font-mono text-purple-300 bg-gray-700/50 px-2 py-1 rounded w-16 text-center">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-purple-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-125"
    />
  </div>
);


const AdjustmentPanel: React.FC<AdjustmentPanelProps> = ({ onApplyAdjustment, isLoading, manualAdjustments, onManualAdjustmentsChange }) => {
  const [selectedPresetPrompt, setSelectedPresetPrompt] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');

  const presets = [
    { name: 'Blur Background', prompt: 'Apply a realistic depth-of-field effect, making the background blurry while keeping the main subject in sharp focus.' },
    { name: 'Enhance Details', prompt: 'Slightly enhance the sharpness and details of the image without making it look unnatural.' },
    { name: 'Warmer Lighting', prompt: 'Adjust the color temperature to give the image warmer, golden-hour style lighting.' },
    { name: 'Studio Light', prompt: 'Add dramatic, professional studio lighting to the main subject.' },
  ];

  const activePrompt = selectedPresetPrompt || customPrompt;

  const handlePresetClick = (prompt: string) => {
    setSelectedPresetPrompt(prompt);
    setCustomPrompt('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomPrompt(e.target.value);
    setSelectedPresetPrompt(null);
  };

  const handleApplyAIPrompt = () => {
    if (activePrompt) {
      onApplyAdjustment(activePrompt);
    }
  };

  const handleApplyManual = () => {
    const { brightness, contrast, saturation, hue, vibrance, sharpness } = manualAdjustments;
    const adjustmentDescriptions: string[] = [];
    if (brightness !== 100) adjustmentDescriptions.push(`brightness to ${brightness}%`);
    if (contrast !== 100) adjustmentDescriptions.push(`contrast to ${contrast}%`);
    if (saturation !== 100) adjustmentDescriptions.push(`saturation to ${saturation}%`);
    if (hue !== 0) adjustmentDescriptions.push(`hue shift by ${hue} degrees`);
    if (vibrance !== 100) adjustmentDescriptions.push(`vibrance to ${vibrance}%`);
    if (sharpness !== 0) adjustmentDescriptions.push(`sharpness to ${sharpness}%`);

    if (adjustmentDescriptions.length > 0) {
        const prompt = `Apply the following photorealistic adjustments to the entire image: ${adjustmentDescriptions.join(', ')}.`;
        onApplyAdjustment(prompt);
    }
  };

  const handleResetManual = () => {
      onManualAdjustmentsChange(defaultAdjustments);
  };

  const areManualAdjustmentsChanged = 
      manualAdjustments.brightness !== 100 ||
      manualAdjustments.contrast !== 100 ||
      manualAdjustments.saturation !== 100 ||
      manualAdjustments.hue !== 0 ||
      manualAdjustments.vibrance !== 100 ||
      manualAdjustments.sharpness !== 0;

  return (
    <div className="w-full bg-gray-900 border border-gray-700/50 rounded-xl p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <div className="p-1 bg-gray-800 rounded-lg flex gap-1">
        <button onClick={() => setMode('ai')} className={`w-full py-2 rounded-md font-semibold transition-all duration-200 ${mode === 'ai' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:bg-gray-700'}`}>
          AI Adjustments
        </button>
        <button onClick={() => setMode('manual')} className={`w-full py-2 rounded-md font-semibold transition-all duration-200 ${mode === 'manual' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:bg-gray-700'}`}>
          Manual Controls
        </button>
      </div>

      {mode === 'ai' && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <h3 className="text-lg font-semibold text-center text-gray-200">Apply a Professional Adjustment</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {presets.map(preset => (
              <button
                key={preset.name}
                onClick={() => handlePresetClick(preset.prompt)}
                disabled={isLoading}
                className={`w-full text-center bg-gray-800 border border-gray-700 text-gray-300 font-semibold py-3 px-4 rounded-md transition-all duration-200 ease-in-out hover:bg-gray-700 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed ${selectedPresetPrompt === preset.prompt ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-purple-500' : ''}`}
              >
                {preset.name}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={customPrompt}
            onChange={handleCustomChange}
            placeholder="Or describe an adjustment..."
            className="flex-grow bg-gray-800 border-gray-700 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-purple-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base placeholder-gray-500"
            disabled={isLoading}
          />

          {activePrompt && (
            <div className="animate-fade-in flex flex-col gap-4 pt-2">
                <button
                    onClick={handleApplyAIPrompt}
                    className="w-full bg-gradient-to-br from-purple-600 to-fuchsia-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-purple-400 disabled:to-fuchsia-300 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                    disabled={isLoading || !activePrompt.trim()}
                >
                    Apply AI Adjustment
                </button>
            </div>
          )}
        </div>
      )}

      {mode === 'manual' && (
        <div className="flex flex-col gap-6 animate-fade-in p-2">
           <h3 className="text-lg font-semibold text-center text-gray-200">Manual Adjustments</h3>
           <div className="flex flex-col gap-4">
              <AdjustmentSlider label="Brightness" value={manualAdjustments.brightness} min={50} max={150} onChange={val => onManualAdjustmentsChange({...manualAdjustments, brightness: val})} />
              <AdjustmentSlider label="Contrast" value={manualAdjustments.contrast} min={50} max={150} onChange={val => onManualAdjustmentsChange({...manualAdjustments, contrast: val})} />
              <AdjustmentSlider label="Saturation" value={manualAdjustments.saturation} min={0} max={200} onChange={val => onManualAdjustmentsChange({...manualAdjustments, saturation: val})} />
              <AdjustmentSlider label="Hue" value={manualAdjustments.hue} min={-180} max={180} onChange={val => onManualAdjustmentsChange({...manualAdjustments, hue: val})} unit="deg" />
              <AdjustmentSlider label="Vibrance" value={manualAdjustments.vibrance} min={0} max={200} onChange={val => onManualAdjustmentsChange({...manualAdjustments, vibrance: val})} />
              <AdjustmentSlider label="Sharpness" value={manualAdjustments.sharpness} min={0} max={100} onChange={val => onManualAdjustmentsChange({...manualAdjustments, sharpness: val})} />
           </div>
           <div className="flex items-center gap-2 mt-2">
                <button
                    onClick={handleResetManual}
                    disabled={isLoading || !areManualAdjustmentsChanged}
                    className="w-full text-center bg-gray-800 border border-gray-700 text-gray-300 font-semibold py-3 px-5 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-700 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-800/50"
                >
                    Reset
                </button>
                <button
                    onClick={handleApplyManual}
                    className="w-full bg-gradient-to-br from-purple-600 to-fuchsia-500 text-white font-bold py-3 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-purple-400 disabled:to-fuchsia-300 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                    disabled={isLoading || !areManualAdjustmentsChanged}
                >
                    Apply with AI
                </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdjustmentPanel;
