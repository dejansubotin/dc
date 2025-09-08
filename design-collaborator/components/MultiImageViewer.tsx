import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import type { Annotation, SelectionRectangle, SessionImage } from '../types';
import ImageViewer from './ImageViewer';

interface MultiImageViewerProps {
  images: SessionImage[];
  annotations: Annotation[];
  pendingAnnotation: Annotation | null;
  activeAnnotationId: number | null;
  onSelectionEnd: (selection: SelectionRectangle, imageIndex?: number) => void;
  onAnnotationClick: (annotationId: number) => void;
  onDeleteAnnotation: (annotationId: number) => void;
  canAddImages?: boolean;
  onOpenAddImages?: () => void;
  canDeleteImages?: boolean;
  onDeleteImage?: (index: number) => void;
}

const MultiImageViewer: React.FC<MultiImageViewerProps> = ({
  images,
  annotations,
  pendingAnnotation,
  activeAnnotationId,
  onSelectionEnd,
  onAnnotationClick,
  onDeleteAnnotation,
  canAddImages,
  onOpenAddImages,
  canDeleteImages,
  onDeleteImage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollToIndex = useCallback((idx: number) => {
    const el = slideRefs.current[idx];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    } else if (containerRef.current) {
      const width = containerRef.current.clientWidth;
      containerRef.current.scrollTo({ left: idx * width, behavior: 'smooth' });
    }
    setCurrentIndex(idx);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => {
      const w = container.clientWidth;
      if (w > 0) {
        const idx = Math.round(container.scrollLeft / w);
        setCurrentIndex(Math.max(0, Math.min(images.length - 1, idx)));
      }
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [images.length]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Thumbnails */}
      <div className="flex-shrink-0 p-2 bg-gray-800/60 border-b border-gray-700 overflow-x-auto thumbs-scroll">
        <div className="flex gap-2 items-center">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <button
                onClick={() => scrollToIndex(i)}
                className={`rounded overflow-hidden border ${currentIndex === i ? 'border-cyan-400' : 'border-gray-600 hover:border-gray-500'}`}
                title={`Image ${i + 1}`}
              >
                <img
                  src={img.thumbnailUrl || img.url}
                  alt={`thumb-${i}`}
                  className="w-20 h-14 object-cover block bg-gray-900"
                  draggable={false}
                />
              </button>
              {canDeleteImages && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteImage && onDeleteImage(i); }}
                  className="absolute -top-1 -right-1 hidden group-hover:block bg-gray-900/80 hover:bg-red-600 text-white rounded-full border border-gray-600 w-6 h-6 flex items-center justify-center"
                  title="Remove image"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {canAddImages && (
            <button
              onClick={(e) => { e.preventDefault(); onOpenAddImages?.(); }}
              className="ml-1 w-20 h-14 flex items-center justify-center rounded border border-dashed border-gray-600 text-gray-300 hover:text-white hover:border-cyan-400"
              title="Add images"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Slides */}
      <div ref={containerRef} className="flex-1 overflow-x-auto overflow-y-hidden flex snap-x snap-mandatory slides-scroll">
        {images.map((img, i) => {
          const annos = annotations.filter(a => (a.imageIndex ?? 0) === i);
          const pending = pendingAnnotation && (pendingAnnotation.imageIndex ?? 0) === i ? pendingAnnotation : null;
          return (
            <div
              key={i}
              ref={el => (slideRefs.current[i] = el)}
              className="flex-shrink-0 w-full h-full snap-start flex items-stretch justify-stretch"
            >
              <div className="w-full h-full">
                <ImageViewer
                  imageUrl={img.url}
                  annotations={annos}
                  pendingAnnotation={pending}
                  activeAnnotationId={activeAnnotationId}
                  onSelectionEnd={(sel) => onSelectionEnd(sel, i)}
                  onAnnotationClick={onAnnotationClick}
                  onDeleteAnnotation={onDeleteAnnotation}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MultiImageViewer;
