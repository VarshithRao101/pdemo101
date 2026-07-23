import React, { useState, useRef } from 'react';

interface HeroVideoBackgroundProps {
  videoUrl?: string;
  overlayOpacity?: number;
}

export const HeroVideoBackground: React.FC<HeroVideoBackgroundProps> = ({
  videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-university-students-working-in-a-chemistry-lab-41398-large.mp4',
  overlayOpacity = 0.65
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        zIndex: 1
      }}
    >
      {/* Background Video element */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted={isMuted}
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'brightness(0.55) contrast(1.25) saturate(1.2)',
          transition: 'opacity 0.6s ease'
        }}
      >
        <source src={videoUrl} type="video/mp4" />
        <source src="https://assets.mixkit.co/videos/preview/mixkit-futuristic-robotic-arm-working-in-a-laboratory-41402-large.mp4" type="video/mp4" />
      </video>

      {/* Premium Dark Gradient Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `radial-gradient(ellipse at center, rgba(10, 37, 64, 0.4) 0%, rgba(5, 19, 41, ${overlayOpacity}) 70%, rgba(3, 10, 24, 0.95) 100%)`,
          pointerEvents: 'none'
        }}
      />

      {/* Cyber Grid Scanlines */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
          opacity: 0.7
        }}
      />

      {/* Video Interactive Control Pills (Bottom Right) */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          zIndex: 20,
          display: 'flex',
          gap: '8px',
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(12px)',
          padding: '6px 12px',
          borderRadius: '30px',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        <button
          onClick={togglePlay}
          style={{
            background: 'none',
            border: 'none',
            color: '#38BDF8',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px'
          }}
          title={isPlaying ? 'Pause Background Video' : 'Play Background Video'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            {isPlaying ? (
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            ) : (
              <path d="M8 5v14l11-7z" />
            )}
          </svg>
          <span>{isPlaying ? 'PAUSE VIDEO' : 'PLAY VIDEO'}</span>
        </button>

        <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>

        <button
          onClick={toggleMute}
          style={{
            background: 'none',
            border: 'none',
            color: isMuted ? '#94A3B8' : '#34D399',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px'
          }}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            {isMuted ? (
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            ) : (
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            )}
          </svg>
          <span>{isMuted ? 'MUTED' : 'AUDIO ON'}</span>
        </button>
      </div>
    </div>
  );
};
