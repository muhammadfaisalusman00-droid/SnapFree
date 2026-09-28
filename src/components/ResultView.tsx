import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { DownloadResult } from '../types';

interface ResultViewProps {
  result: DownloadResult;
  onReset: () => void;
}

/**
 * Resilient Image component that attempts direct CDN loading with no-referrer,
 * and automatically falls back to server-side /api/proxy-media if the direct
 * request fails due to CORS, hotlinking, or 403 Forbidden.
 */
const ResilientImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className = '' }) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasTriedProxy, setHasTriedProxy] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setHasTriedProxy(false);
    setIsLoaded(false);
  }, [src]);

  const handleError = () => {
    if (!hasTriedProxy && src) {
      setHasTriedProxy(true);
      setCurrentSrc(`/api/proxy-media?url=${encodeURIComponent(src)}`);
    }
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={handleError}
      onLoad={() => setIsLoaded(true)}
      className={`${className} transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      loading="eager"
    />
  );
};

// Format seconds into m:ss format
function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const ResultView: React.FC<ResultViewProps> = ({ result, onReset }) => {
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [videoPlaybackError, setVideoPlaybackError] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Minimal Video Player State (Play, Pause, Seek only - no volume, fullscreen, or 3-dots)
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  // Swipe handling for slideshow
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const isVideo = result.type === 'video';
  const photos = useMemo(() => result.photos || [], [result.photos]);
  const hasPhotos = photos.length > 0;
  const caption = (result.title || '').trim();

  // Reset states when result changes
  useEffect(() => {
    setCurrentPhotoIndex(0);
    setVideoPlaybackError(false);
    setDownloadError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsSeeking(false);
  }, [result]);

  // Video canonical filename
  const videoFilename = useMemo(() => {
    return result.id ? `tiktok-${result.id}.mp4` : 'tiktok-video.mp4';
  }, [result.id]);

  // Video streaming source URL
  const videoStreamUrl = useMemo(() => {
    if (!result.videoUrl) return '';
    return `/api/proxy-media?url=${encodeURIComponent(result.videoUrl)}`;
  }, [result.videoUrl]);

  // Toggle Video Play / Pause
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      video.play().catch((err) => {
        console.warn('Playback error:', err);
      });
    } else {
      video.pause();
    }
  }, []);

  // Handle Seek Slider Change
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  // Verified browser download via server proxy
  const triggerDownload = async (fileUrl: string, filename: string, key: string = 'video') => {
    try {
      setDownloadingKey(key);
      setDownloadError(null);

      const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(filename)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        let errorMsg = "We couldn't download this media file. Please try again.";
        try {
          const json = await response.json();
          if (json?.error) {
            errorMsg = json.error;
          }
        } catch {
          // ignore
        }
        setDownloadError(errorMsg);
        return;
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
        setDownloadError('This media file is currently unavailable or restricted. Please try again.');
        return;
      }

      const blob = await response.blob();
      if (blob.type.includes('text/html') || (blob.size < 1500 && blob.type.includes('html'))) {
        setDownloadError("We couldn't download this media file. Please try again.");
        return;
      }

      // Save binary blob to device
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
    } catch (err: any) {
      console.error('Download execution error:', err);
      setDownloadError("We couldn't download this media file. Please check your internet connection and try again.");
    } finally {
      setDownloadingKey(null);
    }
  };

  // Download all slideshow photos sequentially
  const handleDownloadAllPhotos = async () => {
    if (photos.length === 0) return;
    setDownloadingAll(true);
    setDownloadError(null);

    for (let i = 0; i < photos.length; i++) {
      const photoUrl = photos[i];
      const photoFilename = `tiktok-${result.id || 'photo'}-${i + 1}.jpg`;
      await triggerDownload(photoUrl, photoFilename, `photo-${i}`);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    setDownloadingAll(false);
  };

  // Slideshow navigation helpers
  const goToPrev = useCallback(() => {
    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : prev));
  }, [photos.length]);

  // Touch event listeners for horizontal swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 45) {
      goToNext();
    } else if (distance < -45) {
      goToPrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Keyboard navigation for desktop users
  useEffect(() => {
    if (isVideo) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVideo, goToPrev, goToNext]);

  return (
    <div
      id="result-container"
      className="w-full bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden text-[#000C3C] transition-all p-4 sm:p-5"
    >
      {/* Download Error Banner */}
      {downloadError && (
        <div
          id="download-error-alert"
          className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start gap-3"
        >
          <div className="flex-1">
            <p className="font-bold text-red-950">Download Notice</p>
            <p className="mt-0.5 text-red-800 leading-relaxed">{downloadError}</p>
          </div>
          <button
            onClick={() => setDownloadError(null)}
            className="text-red-400 hover:text-red-600 font-bold ml-1 text-sm cursor-pointer leading-none min-w-[24px] min-h-[24px] flex items-center justify-center"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {isVideo ? (
        /* ================================================================== */
        /* 1. TIKTOK VIDEO RESULT (Order: Preview -> Caption -> Download)     */
        /* ================================================================== */
        <div className="w-full flex flex-col items-center space-y-3">
          {/* 1. Video Preview (Retaining quality, aspect ratio, rounded corners) */}
          <div className="w-full max-w-[340px] sm:max-w-[380px] aspect-[9/16] max-h-[560px] bg-zinc-950 rounded-2xl overflow-hidden relative shrink-0 border border-zinc-200/90 shadow-md flex items-center justify-center select-none group">
            {result.videoUrl && !videoPlaybackError ? (
              <>
                <video
                  ref={videoRef}
                  src={videoStreamUrl}
                  playsInline
                  preload="metadata"
                  poster={result.thumbnailUrl || undefined}
                  onClick={togglePlay}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={() => {
                    if (videoRef.current && !isSeeking) {
                      setCurrentTime(videoRef.current.currentTime);
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      setDuration(videoRef.current.duration || 0);
                    }
                  }}
                  onDurationChange={() => {
                    if (videoRef.current) {
                      setDuration(videoRef.current.duration || 0);
                    }
                  }}
                  onEnded={() => {
                    setIsPlaying(false);
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                    }
                  }}
                  onError={() => {
                    console.warn('Video playback error, falling back to thumbnail');
                    setVideoPlaybackError(true);
                  }}
                  className="w-full h-full object-contain bg-black cursor-pointer"
                />

                {/* Big Center Play Button when paused */}
                {!isPlaying && (
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label="Play video"
                    className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/60 hover:bg-black/75 text-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer backdrop-blur-xs z-10 pointer-events-auto"
                  >
                    <svg className="w-6 h-6 fill-current translate-x-0.5" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                )}

                {/* Simplified Minimal Controls: Play, Pause, Seek only (NO volume, fullscreen, or 3-dots) */}
                <div
                  className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-7 pb-2.5 px-3 z-20 flex flex-col gap-1.5 pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Seekbar */}
                  <div className="w-full flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={duration > 0 ? duration : 100}
                      step={0.1}
                      value={currentTime}
                      onMouseDown={() => setIsSeeking(true)}
                      onTouchStart={() => setIsSeeking(true)}
                      onChange={handleSeekChange}
                      onMouseUp={() => setIsSeeking(false)}
                      onTouchEnd={() => setIsSeeking(false)}
                      className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-[#FDBF2D] hover:bg-white/45 focus:outline-none transition-all"
                      aria-label="Seek video playback"
                    />
                  </div>

                  {/* Play/Pause Button + Time Display */}
                  <div className="flex items-center justify-between text-white text-xs font-semibold px-0.5">
                    <button
                      type="button"
                      onClick={togglePlay}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                      className="w-7 h-7 rounded-md hover:bg-white/15 flex items-center justify-center text-white transition-colors cursor-pointer"
                    >
                      {isPlaying ? (
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 fill-current translate-x-0.5" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>

                    <span className="text-[11px] font-mono text-zinc-300">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                </div>
              </>
            ) : result.thumbnailUrl ? (
              <ResilientImage
                src={result.thumbnailUrl}
                alt={caption || 'TikTok video preview thumbnail'}
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400 p-4 text-xs font-semibold">
                Video Preview
              </div>
            )}
          </div>

          {/* 2. Caption: Directly UNDER the video (never above, only when provided) */}
          {caption ? (
            <div className="w-full max-w-[340px] sm:max-w-[380px] text-center px-1">
              <p className="text-xs sm:text-sm text-zinc-700 font-medium leading-relaxed line-clamp-4 break-words">
                {caption}
              </p>
            </div>
          ) : null}

          {/* 3. Download Video (Primary action) */}
          <div className="w-full max-w-[340px] sm:max-w-[380px] flex flex-col items-stretch gap-2.5 pt-0.5">
            {result.videoUrl && (
              <button
                id="btn-download-video"
                onClick={() => triggerDownload(result.videoUrl!, videoFilename, 'video')}
                disabled={downloadingKey !== null}
                className="w-full h-12 sm:h-13 px-6 bg-[#FDBF2D] hover:bg-[#fab416] active:scale-[0.99] text-[#000C3C] font-extrabold rounded-xl transition-all shadow-xs hover:shadow-md disabled:opacity-50 flex items-center justify-center text-sm sm:text-base cursor-pointer"
              >
                {downloadingKey === 'video' ? 'Downloading...' : 'Download Video'}
              </button>
            )}

            {/* 4. Download Another Video */}
            <button
              id="btn-download-another-video"
              onClick={onReset}
              className="w-full h-11 sm:h-12 px-6 border-2 border-zinc-200 hover:border-[#000C3C] bg-white hover:bg-zinc-50 text-[#000C3C] font-bold rounded-xl transition-colors flex items-center justify-center text-xs sm:text-sm cursor-pointer"
            >
              Download Another Video
            </button>
          </div>
        </div>
      ) : (
        /* ================================================================== */
        /* 2. TIKTOK SLIDESHOW / PHOTO RESULT                                 */
        /* Order: Preview -> Counter -> Download Slide -> Download All Slides -> Download Another Video */
        /* ================================================================== */
        <div className="w-full flex flex-col items-center space-y-3">
          {/* 1. Slideshow Preview */}
          {hasPhotos && (
            <div className="w-full max-w-[400px] flex flex-col items-center space-y-2.5">
              <div
                className="w-full aspect-[4/5] sm:aspect-square max-h-[500px] bg-zinc-950 rounded-2xl overflow-hidden relative border border-zinc-200/90 shadow-md flex items-center justify-center select-none touch-pan-y"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Photo Display */}
                <ResilientImage
                  key={`photo-view-${currentPhotoIndex}`}
                  src={photos[currentPhotoIndex]}
                  alt={`TikTok photo ${currentPhotoIndex + 1} of ${photos.length}`}
                  className="w-full h-full object-contain bg-zinc-950"
                />

                {/* Left Navigation Arrow */}
                <button
                  type="button"
                  onClick={goToPrev}
                  disabled={currentPhotoIndex === 0}
                  aria-label="Previous photo"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] rounded-full bg-white/90 hover:bg-white text-[#000C3C] shadow-md flex items-center justify-center z-10 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer font-bold text-lg leading-none"
                >
                  ‹
                </button>

                {/* Right Navigation Arrow */}
                <button
                  type="button"
                  onClick={goToNext}
                  disabled={currentPhotoIndex === photos.length - 1}
                  aria-label="Next photo"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] rounded-full bg-white/90 hover:bg-white text-[#000C3C] shadow-md flex items-center justify-center z-10 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer font-bold text-lg leading-none"
                >
                  ›
                </button>
              </div>

              {/* 2. Slide Counter */}
              <div className="text-xs sm:text-sm font-bold text-[#000C3C] text-center">
                Slide {currentPhotoIndex + 1} of {photos.length}
              </div>

              {/* Optional Caption */}
              {caption ? (
                <p className="text-xs sm:text-sm text-zinc-600 line-clamp-3 text-center px-2">
                  {caption}
                </p>
              ) : null}

              {/* Thumbnail Strip: Jump directly to any photo */}
              {photos.length > 1 && (
                <div className="w-full max-w-[400px] flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 scrollbar-thin">
                  {photos.map((photoUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentPhotoIndex(idx)}
                      className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer relative bg-zinc-100 ${
                        idx === currentPhotoIndex
                          ? 'border-[#000C3C] ring-2 ring-[#FDBF2D]'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                      aria-label={`Jump to photo ${idx + 1}`}
                    >
                      <ResilientImage
                        src={photoUrl}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Slideshow Download Actions */}
          <div className="w-full max-w-[400px] flex flex-col items-stretch gap-2.5 pt-0.5">
            {/* Download This Slide */}
            {hasPhotos && (
              <button
                id="btn-download-photo"
                onClick={() =>
                  triggerDownload(
                    photos[currentPhotoIndex],
                    `tiktok-${result.id || 'photo'}-${currentPhotoIndex + 1}.jpg`,
                    `photo-${currentPhotoIndex}`
                  )
                }
                disabled={downloadingKey !== null || downloadingAll}
                className="w-full h-12 sm:h-13 px-6 bg-[#FDBF2D] hover:bg-[#fab416] active:scale-[0.99] text-[#000C3C] font-extrabold rounded-xl transition-all shadow-xs hover:shadow-md disabled:opacity-50 flex items-center justify-center text-sm sm:text-base cursor-pointer"
              >
                {downloadingKey === `photo-${currentPhotoIndex}`
                  ? 'Downloading Slide...'
                  : `Download This Slide (${currentPhotoIndex + 1} of ${photos.length})`}
              </button>
            )}

            {/* Download All Slides */}
            {hasPhotos && (
              <button
                id="btn-download-all"
                onClick={handleDownloadAllPhotos}
                disabled={downloadingAll || downloadingKey !== null}
                className="w-full h-11 sm:h-12 px-6 bg-[#000C3C] hover:bg-zinc-800 active:scale-[0.99] text-white font-extrabold rounded-xl transition-all shadow-xs hover:shadow-md disabled:opacity-50 flex items-center justify-center text-xs sm:text-sm cursor-pointer"
              >
                {downloadingAll
                  ? 'Downloading Slides...'
                  : `Download All Slides (${photos.length})`}
              </button>
            )}

            {/* Download Another Video */}
            <button
              id="btn-download-another-slideshow"
              onClick={onReset}
              className="w-full h-11 sm:h-12 px-6 border-2 border-zinc-200 hover:border-[#000C3C] bg-white hover:bg-zinc-50 text-[#000C3C] font-bold rounded-xl transition-colors flex items-center justify-center text-xs sm:text-sm cursor-pointer"
            >
              Download Another Video
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
