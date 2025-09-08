import React, { useCallback, useRef, useState } from 'react';

interface AddImagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFiles: (files: File[]) => void;
  remainingCapacity?: number; // up to 10 total
}

const UploadIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const AddImagesModal: React.FC<AddImagesModalProps> = ({ isOpen, onClose, onSelectFiles, remainingCapacity = 10 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    let files = Array.from(list).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    if (files.length > remainingCapacity) files = files.slice(0, remainingCapacity);
    onSelectFiles(files);
  }, [onSelectFiles, remainingCapacity]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl p-6 m-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-cyan-400">Add Images</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white">✕</button>
        </div>
        <div
          className={`p-10 border-2 border-dashed rounded-xl text-center cursor-pointer ${isDragging ? 'border-cyan-400 bg-gray-700/40' : 'border-gray-600 bg-gray-900/40 hover:border-cyan-500'}`}
          onDragEnter={(e)=>{e.preventDefault();e.stopPropagation();setIsDragging(true);}}
          onDragOver={(e)=>{e.preventDefault();e.stopPropagation();}}
          onDragLeave={(e)=>{e.preventDefault();e.stopPropagation();setIsDragging(false);}}
          onDrop={(e)=>{e.preventDefault();e.stopPropagation();setIsDragging(false);handleFiles(e.dataTransfer.files);}}
          onClick={()=>inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e)=>handleFiles(e.target.files)} />
          <div className="flex flex-col items-center">
            <UploadIcon />
            <p className="mt-3 text-gray-300 font-semibold">Drag & drop images here</p>
            <p className="text-gray-500 text-sm">or click to browse</p>
            <p className="mt-2 text-xs text-gray-400">You can add up to {remainingCapacity} more image{remainingCapacity===1?'':'s'} to this session (max 10 total).</p>
          </div>
        </div>
        <div className="mt-4 text-xs text-amber-300 bg-amber-900/30 border border-amber-700 rounded p-2 text-center">
          Tip: Large files may hit the 25 MB upload limit when adding many at once.
        </div>
      </div>
    </div>
  );
};

export default AddImagesModal;
