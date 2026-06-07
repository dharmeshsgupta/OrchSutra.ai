import React, { useEffect, useRef, useState } from 'react';

const FRAME_COUNT = 300;

function currentFrame(index: number) {
  const paddedIndex = index.toString().padStart(3, '0');
  return `/animation-frames/ezgif-frame-${paddedIndex}.jpg`;
}

interface ScrollAnimationProps {
  // No longer takes scrollProgress from the page
}

export const ScrollAnimation: React.FC<ScrollAnimationProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const currentFrameIndex = useRef(1);

  // Preload images
  useEffect(() => {
    let loadedCount = 0;
    const loadedImages: HTMLImageElement[] = [];

    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new Image();
      img.src = currentFrame(i);
      img.onload = () => {
        loadedCount++;
        if (loadedCount === FRAME_COUNT) {
          setLoaded(true);
        }
      };
      loadedImages.push(img);
    }
    setImages(loadedImages);
  }, []);

  const renderFrame = (index: number) => {
    if (!canvasRef.current || images.length < FRAME_COUNT) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = images[index - 1];
    if (img) {
      if (canvas.width !== img.width) canvas.width = img.width;
      if (canvas.height !== img.height) canvas.height = img.height;
      
      // Clear and draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !loaded) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault(); // Prevent page scroll
      
      // Calculate scroll delta
      const delta = Math.sign(e.deltaY);
      
      // Update frame index (1 to FRAME_COUNT)
      let nextFrame = currentFrameIndex.current + delta * 2; // Speed factor
      nextFrame = Math.max(1, Math.min(nextFrame, FRAME_COUNT));
      
      currentFrameIndex.current = nextFrame;
      renderFrame(nextFrame);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [loaded]);

  // Render initial frame once loaded
  useEffect(() => {
    if (loaded) {
      renderFrame(currentFrameIndex.current);
    }
  }, [loaded]);

  return (
    <div 
      ref={containerRef}
      className="feature-card scroll-anim-card col-span-2" 
      style={{ 
        width: '100%',
        padding: 0, 
        overflow: 'hidden', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#000', 
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        aspectRatio: '16/9'
      }}
    >
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
      />
      {!loaded && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#94a3b8' }}>
          Loading Animation...
        </div>
      )}
    </div>
  );
};
