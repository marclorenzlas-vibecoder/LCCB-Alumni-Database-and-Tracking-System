import React, { useState } from 'react';

const AchievementVideoPreview = ({ src, className = '', videoClassName = '', muted = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  if (isPlaying) {
    return (
      <video
        src={src}
        className={videoClassName || className}
        controls
        autoPlay
        muted={muted}
      />
    );
  }

  return (
    <button
      type="button"
      className={`relative overflow-hidden bg-neutral-900 ${className}`}
      onClick={() => setIsPlaying(true)}
      aria-label="Play achievement video"
    >
      <video
        src={src}
        className={videoClassName || 'h-full w-full object-cover'}
        preload="metadata"
        muted
        playsInline
        aria-hidden="true"
      />
      <span className="absolute inset-0 bg-black/10" aria-hidden="true" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-black/25 text-white shadow-md">
          <svg className="ml-0.5 h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
      <span className="sr-only">Play achievement video</span>
    </button>
  );
};

export default AchievementVideoPreview;
