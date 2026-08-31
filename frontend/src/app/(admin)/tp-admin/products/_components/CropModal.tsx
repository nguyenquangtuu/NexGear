'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Check, Move } from 'lucide-react';

interface CropModalProps {
  imageSrc: string;
  onCrop: (croppedImage: string) => void;
  onClose: () => void;
  aspectRatio?: number;
  outputWidth?: number;
  title?: string;
}

export default function CropModal({ imageSrc, onCrop, onClose, aspectRatio = 1, outputWidth = 800, title = 'Cắt ảnh' }: CropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  const getCroppedImage = () => {
    if (!imgRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cropWidth = outputWidth;
    const cropHeight = Math.round(cropWidth / aspectRatio);
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    const containerRect = containerRef.current.getBoundingClientRect();
    const imgRect = imgRef.current.getBoundingClientRect();

    // Calculate source rect
    // The container is the 1:1 view. We want to capture what's inside it.
    const scaleX = imgRef.current.naturalWidth / imgRect.width;
    const scaleY = imgRef.current.naturalHeight / imgRect.height;

    const sourceX = (containerRect.left - imgRect.left) * scaleX;
    const sourceY = (containerRect.top - imgRect.top) * scaleY;
    const sourceWidth = containerRect.width * scaleX;
    const sourceHeight = containerRect.height * scaleY;

    ctx.drawImage(
      imgRef.current,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, cropWidth, cropHeight
    );

    onCrop(canvas.toDataURL('image/png'));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-border">
        <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/30">
          <h3 className="font-bold flex items-center gap-2"><Move size={18} className="text-primary" /> {title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl transition-all"><X size={20} /></button>
        </div>

        <div className="p-8 space-y-6">
          <div 
            ref={containerRef}
            style={{ aspectRatio: `${aspectRatio}/1` }}
            className="w-full max-w-[420px] mx-auto relative overflow-hidden rounded-2xl border-2 border-primary/20 cursor-move shadow-inner"
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: '#eef2f6',
                backgroundImage:
                  'linear-gradient(45deg, rgba(148, 163, 184, 0.12) 25%, transparent 25%), linear-gradient(-45deg, rgba(148, 163, 184, 0.12) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148, 163, 184, 0.12) 75%), linear-gradient(-45deg, transparent 75%, rgba(148, 163, 184, 0.12) 75%)',
                backgroundSize: '24px 24px',
                backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.08))',
              }}
            />
            <img 
              ref={imgRef}
              src={imageSrc} 
              alt="To crop" 
              className="absolute max-w-none transition-transform duration-75 select-none pointer-events-none"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transformOrigin: 'center'
              }}
            />
            {/* Grid overlay */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="border border-white/50" />
                ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-secondary/50 p-3 rounded-2xl border border-border">
              <ZoomOut size={18} className="text-muted-foreground" />
              <input 
                type="range" 
                min="0.1" 
                max="3" 
                step="0.01" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-primary h-1.5 bg-border rounded-lg appearance-none cursor-pointer"
              />
              <ZoomIn size={18} className="text-muted-foreground" />
              <span className="text-[10px] font-bold w-10 text-center">{Math.round(zoom * 100)}%</span>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl border border-border font-bold hover:bg-secondary transition-all text-sm"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={getCroppedImage}
                className="flex-2 py-3 px-8 rounded-2xl bg-primary text-white font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Check size={20} /> XÁC NHẬN CẮT
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-primary/5 text-center">
            <p className="text-[10px] text-primary/70 font-medium">Mẹo: Bạn có thể kéo ảnh để điều chỉnh vị trí và dùng thanh trượt để phóng to/nhỏ.</p>
        </div>
      </div>
    </div>
  );
}
