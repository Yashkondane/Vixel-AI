/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

export interface MaskingCanvasRef {
  undo: () => void;
  redo: () => void;
}

interface MaskingCanvasProps {
  width: number;
  height: number;
  brushSize: number;
  brushHardness: number;
  brushMode: 'brush' | 'erase';
  onMaskChange: (dataUrl: string) => void;
  onDrawEnd: () => void;
  resetTrigger: number;
  onUndoStateChange: (canUndo: boolean) => void;
  onRedoStateChange: (canRedo: boolean) => void;
}

const MaskingCanvas = forwardRef<MaskingCanvasRef, MaskingCanvasProps>(({
    width, height, brushSize, brushHardness, brushMode, onMaskChange, onDrawEnd, resetTrigger, onUndoStateChange, onRedoStateChange
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number, y: number } | null>(null);
  const historyStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);

  const getCtx = () => canvasRef.current?.getContext('2d');

  const saveState = () => {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;
    
    // A new action invalidates the redo history
    redoStackRef.current = [];
    onRedoStateChange(false);

    const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    historyStackRef.current.push(imageData);
    onUndoStateChange(historyStackRef.current.length > 1);
  };

  useImperativeHandle(ref, () => ({
    undo: () => {
      if (historyStackRef.current.length > 1) {
        const currentState = historyStackRef.current.pop(); // Remove current state
        if (currentState) {
            redoStackRef.current.push(currentState);
        }
        const prevState = historyStackRef.current[historyStackRef.current.length - 1];
        const ctx = getCtx();
        if (ctx && prevState && canvasRef.current) {
          ctx.putImageData(prevState, 0, 0);
          onMaskChange(canvasRef.current.toDataURL('image/png'));
        }
        onUndoStateChange(historyStackRef.current.length > 1);
        onRedoStateChange(redoStackRef.current.length > 0);
      }
    },
    redo: () => {
        if (redoStackRef.current.length > 0) {
            const nextState = redoStackRef.current.pop();
            if (nextState) {
                historyStackRef.current.push(nextState);
                const ctx = getCtx();
                if (ctx && canvasRef.current) {
                    ctx.putImageData(nextState, 0, 0);
                    onMaskChange(canvasRef.current.toDataURL('image/png'));
                }
            }
            onUndoStateChange(historyStackRef.current.length > 1);
            onRedoStateChange(redoStackRef.current.length > 0);
        }
    }
  }));

  useEffect(() => {
    // Initialize or clear canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = getCtx();
    if (!ctx) return;
    
    ctx.clearRect(0, 0, width, height);
    // Fill with black for the final mask
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    // Reset history and save the initial blank state
    historyStackRef.current = [];
    redoStackRef.current = [];
    const initialImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyStackRef.current.push(initialImageData);
    
    onUndoStateChange(false);
    onRedoStateChange(false);
  }, [width, height, resetTrigger]);

  const getCoords = (e: React.MouseEvent | React.TouchEvent): { x: number, y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const xOnDisplayedCanvas = clientX - rect.left;
    const yOnDisplayedCanvas = clientY - rect.top;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: xOnDisplayedCanvas * scaleX,
      y: yOnDisplayedCanvas * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    lastPoint.current = getCoords(e);
    // Draw a single point on click
    draw(e);
  };
  
  const endDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPoint.current = null;
    if (canvasRef.current) {
        onMaskChange(canvasRef.current.toDataURL('image/png'));
        saveState(); // Save state after drawing stroke is complete
    }
    onDrawEnd();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const ctx = getCtx();
    const currentPoint = getCoords(e);
    if (!ctx || !currentPoint || !lastPoint.current) return;

    ctx.globalCompositeOperation = brushMode === 'erase' ? 'destination-out' : 'source-over';

    const distance = Math.hypot(currentPoint.x - lastPoint.current.x, currentPoint.y - lastPoint.current.y);
    const angle = Math.atan2(currentPoint.y - lastPoint.current.y, currentPoint.x - lastPoint.current.x);
    
    const hardnessStop = Math.max(0.01, brushHardness / 100);

    const step = Math.min(brushSize / 4, 6);

    for (let i = 0; i < distance; i += step) {
        const x = lastPoint.current.x + (Math.cos(angle) * i);
        const y = lastPoint.current.y + (Math.sin(angle) * i);

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, brushSize / 2);
        gradient.addColorStop(0, 'white');
        gradient.addColorStop(hardnessStop, 'white');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    lastPoint.current = currentPoint;
  };
  
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 w-full h-full touch-none"
      style={{ mixBlendMode: 'screen', opacity: 0.5, pointerEvents: 'all', cursor: 'none' }}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={endDrawing}
      onMouseLeave={endDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={endDrawing}
    />
  );
});

export default MaskingCanvas;