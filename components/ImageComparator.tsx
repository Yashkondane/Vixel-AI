/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ImageComparatorProps {
  beforeImageUrl: string;
  afterImageUrl: string;
  afterImageStyle?: React.CSSProperties;
}

const ImageComparator: React.FC<ImageComparatorProps> = ({ beforeImageUrl, afterImageUrl, afterImageStyle }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      let percentage = (x / rect.width) * 100;
      
      // Clamp between 0 and 100
      percentage = Math.max(0, Math.min(100, percentage));
      
      setSliderPosition(percentage);
  }, []);

  // Use event listeners on the window to allow dragging outside the component bounds
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX);
    };
    const handleWindowTouchMove = (e: TouchEvent) => {
      if (isDragging) handleMove(e.touches[0].clientX);
    };
    const stopDragging = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
      window.addEventListener('mouseup', stopDragging);
      window.addEventListener('touchend', stopDragging);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('touchend', stopDragging);
    };
  }, [isDragging, handleMove]);

  const startDragging = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };
  
  return (
    <div 
      ref={containerRef} 
      className="relative w-full select-none" 
      style={{ maxHeight: '60vh' }}
      onMouseLeave={() => setIsDragging(false)} // Stop dragging if mouse leaves container
    >
      <img
        src={beforeImageUrl}
        alt="Original"
        className="block w-full h-auto object-contain max-h-[60vh] rounded-xl pointer-events-none"
        draggable={false}
      />
      
      <div
        className="absolute top-0 left-0 h-full w-full overflow-hidden rounded-xl"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={afterImageUrl}
          alt="Edited"
          className="absolute top-0 left-0 h-full w-full object-contain max-h-[60vh] rounded-xl pointer-events-none"
          draggable={false}
          style={afterImageStyle}
        />
      </div>

      <div
        className="absolute top-0 bottom-0 w-1 bg-purple-600 cursor-ew-resize z-10"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        onMouseDown={startDragging}
        onTouchStart={startDragging}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 h-10 w-10 bg-white/80 rounded-full flex items-center justify-center pointer-events-none ring-4 ring-purple-200 backdrop-blur-sm shadow-lg">
           <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{transform: 'rotate(90deg)'}}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
           </svg>
        </div>
      </div>
    </div>
  );
};

export default ImageComparator;