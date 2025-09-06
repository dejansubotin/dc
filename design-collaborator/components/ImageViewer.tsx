
import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Annotation, SelectionRectangle } from '../types';

interface ImageViewerProps {
  imageUrl: string;
  annotations: Annotation[];
  pendingAnnotation: Annotation | null;
  activeAnnotationId: number | null;
  onSelectionEnd: (selection: SelectionRectangle) => void;
  onAnnotationClick: (annotationId: number) => void;
  onDeleteAnnotation: (annotationId: number) => void;
}

const DeleteIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PlusIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const MinusIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
  </svg>
);

const ImageViewer: React.FC<ImageViewerProps> = ({
  imageUrl,
  annotations,
  pendingAnnotation,
  activeAnnotationId,
  onSelectionEnd,
  onAnnotationClick,
  onDeleteAnnotation,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // State for drawing selections
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<SelectionRectangle | null>(null);

  // State for view control
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // Screen-space offset from the center
  const [isPanning, setIsPanning] = useState(false);

  // State for interaction modes
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // State for image loading and dimensions
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({width: 0, height: 0});
  
  const allAnnotations = pendingAnnotation ? [...annotations, pendingAnnotation] : annotations;

  const resetView = useCallback(() => {
    if (!imageRef.current || !containerRef.current || !imageRef.current.complete || imageRef.current.naturalWidth === 0) return;
    
    const image = imageRef.current;
    const container = containerRef.current;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imageWidth = image.naturalWidth;
    const imageHeight = image.naturalHeight;

    const scaleX = containerWidth / imageWidth;
    const scaleY = containerHeight / imageHeight;
    const newZoom = Math.min(scaleX, scaleY) * 0.98;

    setZoom(newZoom);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
        setImageSize({
            width: imageRef.current.naturalWidth,
            height: imageRef.current.naturalHeight,
        });
        setIsImageLoaded(true);
        resetView();
    }
  }, [resetView]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isImageLoaded) return;

    const resizeObserver = new ResizeObserver(resetView);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [resetView, isImageLoaded]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !e.repeat) {
        const target = e.target as HTMLElement;
        // Do not interfere if the user is typing in an input field.
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const getCoords = useCallback((e: React.MouseEvent): { x: number; y: number } | null => {
    if (!imageRef.current || !containerRef.current || !imageRef.current.complete) return null;
    
    const container = containerRef.current;
    const image = imageRef.current;
    const containerRect = container.getBoundingClientRect();
    
    const containerCenterX = containerRect.width / 2;
    const containerCenterY = containerRect.height / 2;
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;

    const imageCoordXFromCenter = (mouseX - containerCenterX - pan.x) / zoom;
    const imageCoordYFromCenter = (mouseY - containerCenterY - pan.y) / zoom;
    
    const imageX = imageCoordXFromCenter + image.naturalWidth / 2;
    const imageY = imageCoordYFromCenter + image.naturalHeight / 2;

    return { 
      x: Math.max(0, Math.min(imageX, image.naturalWidth)),
      y: Math.max(0, Math.min(imageY, image.naturalHeight))
    };
  }, [zoom, pan]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (isSpacePressed && e.button === 0) {
      setIsPanning(true);
      const panStart = { ...pan };
      const pointerStart = { x: e.clientX, y: e.clientY };

      const handlePanMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        const dx = moveEvent.clientX - pointerStart.x;
        const dy = moveEvent.clientY - pointerStart.y;
        setPan({
          x: panStart.x + dx,
          y: panStart.y + dy,
        });
      };

      const handlePanEnd = (upEvent: MouseEvent) => {
        upEvent.preventDefault();
        setIsPanning(false);
        window.removeEventListener('mousemove', handlePanMove);
        window.removeEventListener('mouseup', handlePanEnd);
      };

      window.addEventListener('mousemove', handlePanMove);
      window.addEventListener('mouseup', handlePanEnd);
      return;
    }

    if (e.button === 0) {
      const coords = getCoords(e);
      if (coords) {
        setIsDrawing(true);
        setStartPoint(coords);
        setCurrentPoint(coords);
      }
    }
  }, [getCoords, isSpacePressed, pan]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDrawing) {
      const coords = getCoords(e);
      if (coords) setCurrentPoint(coords);
    }
  }, [isDrawing, getCoords]);
  
  const handleMouseUp = useCallback(() => {
    if (isDrawing && selectionRect) {
      if (selectionRect.width >= 5 && selectionRect.height >= 5 && imageRef.current) {
        const image = imageRef.current;
        onSelectionEnd({
          x: (selectionRect.x / image.naturalWidth) * 100,
          y: (selectionRect.y / image.naturalHeight) * 100,
          width: (selectionRect.width / image.naturalWidth) * 100,
          height: (selectionRect.height / image.naturalHeight) * 100,
        });
      }
    }
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
  }, [isDrawing, selectionRect, onSelectionEnd]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const scaleAmount = -e.deltaY * 0.001 * 1.5;
    const newZoom = Math.min(Math.max(zoom * (1 + scaleAmount), 0.1), 10);
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    const mouseX = (e.clientX - containerRect.left) - (containerRect.width / 2);
    const mouseY = (e.clientY - containerRect.top) - (containerRect.height / 2);
    
    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [zoom, pan]);

  useEffect(() => {
    if (isDrawing && startPoint && currentPoint) {
      setSelectionRect({
        x: Math.min(startPoint.x, currentPoint.x),
        y: Math.min(startPoint.y, currentPoint.y),
        width: Math.abs(startPoint.x - currentPoint.x),
        height: Math.abs(startPoint.y - currentPoint.y),
      });
    } else {
      setSelectionRect(null);
    }
  }, [isDrawing, startPoint, currentPoint]);

  let cursorClass = isSpacePressed ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-crosshair';

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex items-center justify-center select-none overflow-hidden relative bg-gray-900/50 ${cursorClass}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
    >
      <div
        className="relative"
        style={{
          width: imageSize.width,
          height: imageSize.height,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          visibility: isImageLoaded ? 'visible' : 'hidden',
          willChange: 'transform',
        }}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Annotate"
          className="max-w-none max-h-none block pointer-events-none"
          onLoad={handleImageLoad}
          onDragStart={(e) => e.preventDefault()}
        />

        {allAnnotations.map((anno) => {
          const isPending = pendingAnnotation?.id === anno.id;
          const isActive = activeAnnotationId === anno.id;
          const isSolved = anno.isSolved;
          const scaledBorderWidth = isActive ? 3 / zoom : 2 / zoom;
          const borderColor = isSolved ? 'border-green-500/80' : isActive ? 'border-cyan-400' : 'border-yellow-400/70';

          return (
            <div
              key={anno.id}
              className={`absolute box-content transition-colors duration-200
                ${isSpacePressed ? 'cursor-grab' : 'cursor-pointer'} ${borderColor}
                ${!isActive && !isSolved && 'hover:border-yellow-300'}
                ${isPending ? 'border-dashed' : 'border-solid'}
                ${isActive ? 'shadow-lg shadow-cyan-500/30' : ''}
                ${isSolved ? 'opacity-70' : ''}`}
              style={{
                borderWidth: `${scaledBorderWidth}px`,
                left: `calc(${anno.x}% - ${scaledBorderWidth}px)`,
                top: `calc(${anno.y}% - ${scaledBorderWidth}px)`,
                width: `${anno.width}%`,
                height: `${anno.height}%`,
              }}
              onClick={(e) => { e.stopPropagation(); if (!isPending && !isSpacePressed) onAnnotationClick(anno.id); }}
            >
              {isActive && !isPending && !isSolved && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(anno.id); }}
                  className="absolute bg-gray-900/60 backdrop-blur-sm hover:bg-red-600 text-white rounded-full z-10 shadow-lg flex items-center justify-center transition-colors duration-200"
                  style={{
                    left: '100%',
                    bottom: '100%',
                    marginLeft: `${4 / zoom}px`,
                    marginBottom: `${4 / zoom}px`,
                    width: `${22 / zoom}px`,
                    height: `${22 / zoom}px`,
                  }}
                  aria-label="Delete annotation"
                >
                  <div style={{ width: `${16 / zoom}px`, height: `${16 / zoom}px` }}>
                    <DeleteIcon />
                  </div>
                </button>
              )}
            </div>
          );
        })}
        
        {selectionRect && (
          <div
            className="absolute border-dashed border-cyan-400 bg-cyan-400/20 pointer-events-none"
            style={{
              left: selectionRect.x,
              top: selectionRect.y,
              width: selectionRect.width,
              height: selectionRect.height,
              borderWidth: 2 / zoom,
            }}
          />
        )}
      </div>
      
      <div className="absolute bottom-4 right-4 bg-gray-800/80 backdrop-blur-sm text-white rounded-lg shadow-lg flex items-center p-1 gap-1 z-10">
        <button onClick={() => setZoom(z => Math.max(z / 1.25, 0.1))} className="p-2 rounded hover:bg-gray-700 transition-colors" aria-label="Zoom out"><MinusIcon /></button>
        <span className="font-mono text-sm w-16 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(z * 1.25, 10))} className="p-2 rounded hover:bg-gray-700 transition-colors" aria-label="Zoom in"><PlusIcon /></button>
        <div className="w-px h-6 bg-gray-600 mx-1"></div>
        <button onClick={resetView} className="p-2 rounded hover:bg-gray-700 transition-colors" aria-label="Reset view">
            <span className="h-6 w-6 flex items-center justify-center font-mono font-bold text-lg">R</span>
        </button>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-800/80 backdrop-blur-sm text-gray-400 text-xs font-mono rounded-md px-2 py-1 pointer-events-none z-10 opacity-70">
        Hold <kbd className="font-sans bg-gray-700 text-gray-300 rounded px-1.5 py-0.5 border-b-2 border-gray-600">Space</kbd> to pan
      </div>
    </div>
  );
};

export default ImageViewer;
