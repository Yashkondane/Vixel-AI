/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { ResetZoomIcon } from './icons';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({ zoom, onZoomIn, onZoomOut, onReset }) => {
  return (
    <div className="absolute bottom-3 right-3 z-20 bg-gray-900/70 border border-gray-700/50 rounded-lg p-1 flex items-center gap-1 backdrop-blur-sm shadow-md">
      <button
        onClick={onZoomOut}
        disabled={zoom <= 0.5}
        className="w-8 h-8 flex items-center justify-center text-gray-300 font-bold text-xl rounded-md hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Zoom out"
      >
        -
      </button>
      <button
        onClick={onReset}
        className="w-20 h-8 flex items-center justify-center text-gray-300 font-mono text-sm rounded-md hover:bg-gray-700 active:scale-95 transition-all"
        aria-label="Reset zoom"
      >
        <ResetZoomIcon className="w-4 h-4 mr-1.5" />
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={onZoomIn}
        disabled={zoom >= 5}
        className="w-8 h-8 flex items-center justify-center text-gray-300 font-bold text-xl rounded-md hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Zoom in"
      >
        +
      </button>
    </div>
  );
};

export default ZoomControls;
