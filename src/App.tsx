import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import {
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import type { DownloadResult, ApiDownloadResponse } from './types';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { ContactPage } from './pages/ContactPage';

// Code-split ResultView for initial bundle speed
const ResultView = lazy(() =>
  import('./components/ResultView').then((m) => ({ default: m.ResultView }))
);

interface FaqItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'download-video',
    question: 'How do I download a TikTok video?',
    answer: (
      <div className="space-y-2">
        <p>Saving a video with SnapFree takes only a few quick steps:</p>
        <ol className="list-decimal list-inside space-y-1 pl-1 text-zinc-600">
          <li>Open TikTok and find the video you want.</li>
          <li>Tap <strong>Share</strong> and copy the TikTok link.</li>
          <li>Paste the link into SnapFree.</li>
          <li>Click <strong>Download</strong> and save the available video.</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'download-photos',
    question: 'How do I download TikTok photos?',
    answer: (
      <div className="space-y-2">
        <p>
          Paste the TikTok photo/slideshow link into SnapFree and click <strong>Download</strong>. SnapFree will process the link and display the available photos. You can then download individual photos or use the <strong>Download All</strong> option to save all available photos.
        </p>
      </div>
    ),
  },
  {
    id: 'where-saved',
    question: 'Where are my downloaded files saved?',
    answer: (
      <div className="space-y-2">
        <p>Downloaded files are stored in your device&apos;s standard download directory:</p>
        <ul className="list-disc list-inside space-y-1 pl-1 text-zinc-600">
          <li><strong>iPhone / iPad:</strong> Saved in the &quot;Downloads&quot; folder in Apple&apos;s Files app (or Safari downloads), which you can easily save to your Photos app.</li>
          <li><strong>Android phones &amp; tablets:</strong> Saved in your device&apos;s &quot;Download&quot; folder, accessible through your Files or Gallery app.</li>
          <li><strong>Computers (PC &amp; Mac):</strong> Saved in your web browser&apos;s designated &quot;Downloads&quot; folder.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'mobile-phones',
    question: 'Does SnapFree work on mobile phones?',
    answer: (
      <div className="space-y-2">
        <p>
          <strong>Yes.</strong> SnapFree is fully responsive and optimized for mobile devices, including iPhones, iPads, and Android smartphones and tablets. It runs directly inside standard web browsers like Safari and Chrome without installing anything.
        </p>
      </div>
    ),
  },
  {
    id: 'desktop-computers',
    question: 'Does SnapFree work on desktop computers?',
    answer: (
      <div className="space-y-2">
        <p>
          <strong>Yes.</strong> SnapFree works smoothly on desktop and laptop computers running Windows, macOS, ChromeOS, or Linux using any modern web browser like Chrome, Safari, Edge, Firefox, or Brave.
        </p>
      </div>
    ),
  },
  {
    id: 'install-application',
    question: 'Do I need to install an application?',
    answer: (
      <div className="space-y-2">
        <p>
          <strong>No.</strong> SnapFree is an entirely web-based online tool. You do not need to install any mobile apps, desktop software, or browser extensions to download videos or photos.
        </p>
      </div>
    ),
  },
  {
    id: 'is-free',
    question: 'Is SnapFree free?',
    answer: (
      <div className="space-y-2">
        <p>
          <strong>Yes.</strong> SnapFree is 100% free to use. There are no registration forms, no user accounts, and no paid subscriptions.
        </p>
      </div>
    ),
  },
  {
    id: 'link-not-working',
    question: 'Why isn\'t my TikTok link working?',
    answer: (
      <div className="space-y-2">
        <p>If your link fails to download, please check the following:</p>
        <ul className="list-disc list-inside space-y-1 pl-1 text-zinc-600">
          <li>Ensure you copied a full, valid public link directly from TikTok (e.g. <code className="bg-zinc-100 px-1 py-0.5 rounded text-xs">https://www.tiktok.com/@user/video/...</code> or <code className="bg-zinc-100 px-1 py-0.5 rounded text-xs">https://vt.tiktok.com/...</code>).</li>
          <li>Make sure no extra text or spaces were copied with the URL.</li>
          <li>Check that your internet connection is active.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'cannot-download-post',
    question: 'Why can\'t I download a particular TikTok post?',
    answer: (
      <div className="space-y-2">
        <p>
          SnapFree only supports publicly accessible TikTok content. You may not be able to download a post if:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-1 text-zinc-600">
          <li>The post is set to <strong>Private</strong> or &quot;Friends Only&quot; by the creator.</li>
          <li>The post has been deleted or removed from TikTok.</li>
          <li>The post is restricted by regional boundaries or age-verification requirements.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'store-media',
    question: 'Does SnapFree store my downloaded videos or photos?',
    answer: (
      <div className="space-y-2">
        <p>
          <strong>No.</strong> SnapFree does not host, mirror, or permanently store downloaded videos or photos on its servers. All media is retrieved in real-time from public content streams and transferred directly to your device. We do not keep copies or track your download history.
        </p>
      </div>
    ),
  },
  {
    id: 'music-mp3',
    question: 'Does SnapFree support TikTok MP3/music downloads?',
    answer: (
      <div className="space-y-2">
        <p>
          <strong>No.</strong> SnapFree currently focuses exclusively on downloading TikTok videos and photos, and does not provide a separate MP3 or music downloading feature.
        </p>
      </div>
    ),
  },
];

// Rigorous TikTok link validation
function isValidTikTokUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('demo:')) return true;

  try {
    let urlToTest = trimmed;
    if (!urlToTest.startsWith('http://') && !urlToTest.startsWith('https://')) {
      urlToTest = 'https://' + urlToTest;
    }
    const parsed = new URL(urlToTest);
    const host = parsed.hostname.toLowerCase();
    const isTikTokDomain = host === 'tiktok.com' || host.endsWith('.tiktok.com');

    return isTikTokDomain && parsed.pathname.length > 1;
  } catch {
    return false;
  }
}

export default function App() {
  // Client-side routing state: '/' | '/privacy' | '/terms' | '/contact'
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase();
      if (p === '/privacy' || p === '/terms' || p === '/contact') {
        return p;
      }
      return '/';
    }
    return '/';
  });

  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DownloadResult | null>(null);
  const [pasted, setPasted] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync document title and canonical URL based on route
  useEffect(() => {
    if (currentPath === '/privacy') {
      document.title = 'Privacy Policy — SnapFree';
    } else if (currentPath === '/terms') {
      document.title = 'Terms of Service — SnapFree';
    } else if (currentPath === '/contact') {
      document.title = 'Contact — SnapFree';
    } else {
      document.title = 'SnapFree — Download TikTok Videos & Photos';
    }

    // Dynamic canonical URL resolution for SPA
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.origin + currentPath;

    // Dynamic OpenGraph URL
    let ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.content = window.location.origin + currentPath;
  }, [currentPath]);

  // Handle browser back and forward history buttons
  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname.toLowerCase();
      if (p === '/privacy' || p === '/terms' || p === '/contact') {
        setCurrentPath(p);
      } else {
        setCurrentPath('/');
      }

      if (window.location.hash) {
        const anchor = window.location.hash.replace('#', '');
        setTimeout(() => {
          const el = document.getElementById(anchor);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check initial hash on mount if on home
  useEffect(() => {
    if (currentPath === '/' && window.location.hash) {
      const anchor = window.location.hash.replace('#', '');
      setTimeout(() => {
        const el = document.getElementById(anchor);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [currentPath]);

  // Client-side router navigation handler
  const navigate = (to: string) => {
    setIsMenuOpen(false);

    if (to.startsWith('/#')) {
      const anchor = to.replace('/#', '');
      if (currentPath !== '/') {
        window.history.pushState(null, '', `/#${anchor}`);
        setCurrentPath('/');
        setTimeout(() => {
          const el = document.getElementById(anchor);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      } else {
        window.history.pushState(null, '', `#${anchor}`);
        const el = document.getElementById(anchor);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    if (to === '/' || to === '/home') {
      window.history.pushState(null, '', '/');
      setCurrentPath('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (currentPath === '/') {
        inputRef.current?.focus();
      }
      return;
    }

    // Dedicated routes: /privacy, /terms, /contact
    window.history.pushState(null, '', to);
    setCurrentPath(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  // Close mobile dropdown on outside click or Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleDownload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const targetUrl = url.trim();

    if (!targetUrl) {
      setError('Please paste a TikTok link to get started.');
      inputRef.current?.focus();
      return;
    }

    if (!isValidTikTokUrl(targetUrl)) {
      setError(
        'Invalid TikTok link format. Please make sure the link is from tiktok.com (e.g. https://www.tiktok.com/@user/video/... or https://vt.tiktok.com/...)'
      );
      inputRef.current?.focus();
      return;
    }

    setError(null);
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data: ApiDownloadResponse = await response.json();

      if (!response.ok || !data.success) {
        let msg =
          data.error ||
          "We couldn't process this link. Please check the TikTok link and try again.";
        if (
          response.status === 404 ||
          msg.toLowerCase().includes('private') ||
          msg.toLowerCase().includes('unavailable')
        ) {
          msg =
            'This TikTok post appears to be private, removed, or region-restricted. Please make sure the video or photo post is public.';
        } else if (response.status === 429) {
          msg = 'Too many requests. Please wait a moment before downloading another item.';
        }
        setError(msg);
        return;
      }

      if (data.data) {
        setResult(data.data);
      } else {
        setError(
          'This post could not be retrieved. Please verify the link is public and accessible.'
        );
      }
    } catch (err) {
      console.error('Download error:', err);
      setError("We couldn't process this link. Please check your network connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      window.focus();
      inputRef.current?.focus();

      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setUrl(text.trim());
          setPasted(true);
          setError(null);
          setPasteNotice(null);
          setTimeout(() => setPasted(false), 1800);
          return;
        }
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }

    try {
      inputRef.current?.focus();
      inputRef.current?.select();
      const success = document.execCommand('paste');
      if (success && inputRef.current?.value) {
        setUrl(inputRef.current.value.trim());
        setPasted(true);
        setError(null);
        setPasteNotice(null);
        setTimeout(() => setPasted(false), 1800);
        return;
      }
    } catch {
      // execCommand fallback not permitted
    }

    inputRef.current?.focus();
    setPasteNotice('Press Ctrl+V (or Cmd+V) to paste');
    setTimeout(() => setPasteNotice(null), 3500);
  };

  const handleReset = () => {
    setUrl('');
    setError(null);
    setResult(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#000C3C] flex flex-col items-center justify-between font-sans selection:bg-[#000C3C] selection:text-[#FDBF2D]">
      {/* Header: Navy Background with Brand "SnapFree" */}
      <header className="w-full bg-[#000C3C] text-white border-b border-[#000C3C] sticky top-0 z-40 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between relative">
          {/* Logo: Snap (white) + Free (yellow matching Download button) */}
          <button
            onClick={() => navigate('/')}
            id="nav-logo"
            className="text-xl font-black tracking-tight text-white flex items-center gap-1 group cursor-pointer focus:outline-none"
            aria-label="SnapFree Home"
          >
            <span>Snap</span>
            <span className="text-[#FDBF2D]">Free</span>
          </button>

          {/* Desktop Navigation Links */}
          <div className="flex items-center gap-4" ref={menuRef}>
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-zinc-300">
              <button
                onClick={() => navigate('/')}
                className={`transition-colors cursor-pointer py-1 ${
                  currentPath === '/' ? 'text-white font-bold' : 'hover:text-white'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => navigate('/#how-to-use')}
                className="hover:text-white transition-colors cursor-pointer py-1"
              >
                How to Use
              </button>
              <button
                onClick={() => navigate('/#faq')}
                className="hover:text-white transition-colors cursor-pointer py-1"
              >
                FAQ
              </button>
              <button
                onClick={() => navigate('/privacy')}
                className={`transition-colors cursor-pointer py-1 ${
                  currentPath === '/privacy' ? 'text-white font-bold' : 'hover:text-white'
                }`}
              >
                Privacy Policy
              </button>
              <button
                onClick={() => navigate('/terms')}
                className={`transition-colors cursor-pointer py-1 ${
                  currentPath === '/terms' ? 'text-white font-bold' : 'hover:text-white'
                }`}
              >
                Terms of Service
              </button>
              <button
                onClick={() => navigate('/contact')}
                className={`transition-colors cursor-pointer py-1 ${
                  currentPath === '/contact' ? 'text-white font-bold' : 'hover:text-white'
                }`}
              >
                Contact
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              id="hamburger-menu-button"
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-white hover:text-[#FDBF2D] hover:bg-white/10 active:scale-95 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FDBF2D]"
              aria-label={isMenuOpen ? 'Close menu' : 'Open navigation menu'}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 stroke-[2.5]" />
              ) : (
                <Menu className="w-6 h-6 stroke-[2.5]" />
              )}
            </button>

            {/* Mobile Dropdown Menu (Clean, no decorative icons) */}
            {isMenuOpen && (
              <div
                id="header-dropdown-menu"
                className="md:hidden absolute right-4 top-full mt-2 w-52 bg-[#000C3C] border border-white/15 rounded-2xl shadow-2xl py-2 z-50 animate-fade-in backdrop-blur-md"
              >
                <div className="px-4 py-2 border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Navigation
                </div>

                <button
                  onClick={() => navigate('/')}
                  className="w-full text-left px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:text-[#FDBF2D] hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Home
                </button>

                <button
                  onClick={() => navigate('/#how-to-use')}
                  className="w-full text-left px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:text-[#FDBF2D] hover:bg-white/5 transition-colors cursor-pointer"
                >
                  How to Use
                </button>

                <button
                  onClick={() => navigate('/#faq')}
                  className="w-full text-left px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:text-[#FDBF2D] hover:bg-white/5 transition-colors cursor-pointer"
                >
                  FAQ
                </button>

                <div className="my-1 border-t border-white/10"></div>

                <button
                  onClick={() => navigate('/privacy')}
                  className="w-full text-left px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:text-[#FDBF2D] hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>

                <button
                  onClick={() => navigate('/terms')}
                  className="w-full text-left px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:text-[#FDBF2D] hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Terms of Service
                </button>

                <button
                  onClick={() => navigate('/contact')}
                  className="w-full text-left px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:text-[#FDBF2D] hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Contact
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 flex justify-center items-start flex-1">
        {/* Dynamic Route View */}
        {currentPath === '/privacy' ? (
          <PrivacyPage onNavigateHome={() => navigate('/')} onNavigate={navigate} />
        ) : currentPath === '/terms' ? (
          <TermsPage onNavigateHome={() => navigate('/')} onNavigate={navigate} />
        ) : currentPath === '/contact' ? (
          <ContactPage onNavigateHome={() => navigate('/')} onNavigate={navigate} />
        ) : (
          /* ================================================================ */
          /* HOME PAGE: Downloader + How to Use + FAQ                         */
          /* ================================================================ */
          <main className="w-full max-w-3xl pt-3.5 sm:pt-5 pb-14 sm:pb-20 flex flex-col items-center flex-1">
            {/* SECTION 1: DOWNLOADER (Hero) */}
            <section id="downloader" className="w-full flex flex-col items-center">
              <div className="w-full max-w-2xl text-center mb-3 sm:mb-4">
                {/* Brand: Snap (Navy) + Free (Yellow matching Download button) */}
                <h1 id="brand-title" className="text-3xl sm:text-4xl font-black tracking-tight text-[#000C3C] mb-1">
                  Snap<span className="text-[#FDBF2D]">Free</span>
                </h1>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#000C3C] mb-1.5">
                  Download TikTok Videos &amp; Photos
                </h2>
                <p id="brand-cta-subtitle" className="text-zinc-600 text-xs sm:text-sm font-medium leading-relaxed max-w-lg mx-auto">
                  SnapFree is a fast, free TikTok video downloader that lets you save TikTok videos and photos in HD with no watermark.
                </p>
              </div>

              {/* URL Input & Action Form */}
              {!result && (
                <div className="w-full max-w-2xl mt-1 sm:mt-2">
                  <form onSubmit={handleDownload} className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
                    <div className="relative flex-1 w-full">
                      <input
                        ref={inputRef}
                        id="input-tiktok-url"
                        type="text"
                        value={url}
                        onChange={(e) => {
                          setUrl(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="Paste TikTok link here (e.g. https://www.tiktok.com/...)"
                        disabled={isLoading}
                        className="w-full h-13 sm:h-14 pl-4 pr-20 bg-white border-2 border-zinc-200 rounded-xl focus:outline-none focus:border-[#FDBF2D] focus:ring-4 focus:ring-[#FDBF2D]/25 text-[#000C3C] font-medium text-sm sm:text-base placeholder:text-zinc-400 placeholder:font-normal shadow-2xs transition-all"
                      />

                      {/* Paste / Clear button */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                        {url ? (
                          <button
                            type="button"
                            onClick={() => {
                              setUrl('');
                              setError(null);
                              inputRef.current?.focus();
                            }}
                            title="Clear input"
                            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-400 hover:text-[#000C3C] rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer text-sm font-bold"
                          >
                            ✕
                          </button>
                        ) : (
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={handlePaste}
                            title="Paste from clipboard"
                            className="min-h-[40px] inline-flex items-center text-xs font-bold py-1.5 px-2.5 text-[#000C3C] hover:bg-[#FDBF2D]/20 rounded-lg transition-colors cursor-pointer"
                          >
                            {pasted ? 'Pasted' : 'Paste'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Primary Download Button (Yellow #FDBF2D) */}
                    <button
                      id="btn-download-submit"
                      type="submit"
                      disabled={isLoading}
                      className="w-full sm:w-auto h-13 sm:h-14 px-8 bg-[#FDBF2D] hover:bg-[#fab416] active:scale-[0.99] text-[#000C3C] font-extrabold rounded-xl transition-all shadow-xs hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                    >
                      {isLoading ? (
                        <span>Processing...</span>
                      ) : (
                        <span>Download</span>
                      )}
                    </button>
                  </form>

                  {pasteNotice && (
                    <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-lg mt-2 text-center animate-fade-in font-medium">
                      {pasteNotice}
                    </p>
                  )}
                </div>
              )}

              {/* Processing / Loading State */}
              {isLoading && (
                <div
                  id="loading-indicator"
                  className="w-full max-w-2xl py-6 sm:py-8 flex flex-col items-center justify-center space-y-2 text-zinc-600 mt-2"
                >
                  <div className="w-8 h-8 border-3 border-zinc-200 border-t-[#FDBF2D] rounded-full animate-spin"></div>
                  <p className="text-base font-bold text-[#000C3C]">
                    Processing...
                  </p>
                  <p className="text-xs text-zinc-500">
                    Retrieving TikTok content
                  </p>
                </div>
              )}

              {/* Error Banner */}
              {error && !isLoading && (
                <div
                  id="error-message-box"
                  className="w-full max-w-2xl bg-red-50/90 border border-red-200 rounded-xl p-3.5 text-sm text-red-900 my-3 flex items-start justify-between gap-3 shadow-2xs"
                >
                  <div className="flex-1">
                    <p className="font-bold text-red-950">Unable to download</p>
                    <p className="mt-0.5 text-red-800 leading-relaxed text-xs sm:text-sm">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="min-w-[32px] min-h-[32px] flex items-center justify-center text-red-500 hover:text-red-700 font-bold text-sm cursor-pointer"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Results View: Video or Photo Carousel */}
              {result && !isLoading && (
                <div className="w-full max-w-2xl mt-1 sm:mt-2">
                  <Suspense
                    fallback={
                      <div className="py-8 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-zinc-200 border-t-[#FDBF2D] rounded-full animate-spin"></div>
                      </div>
                    }
                  >
                    <ResultView result={result} onReset={handleReset} />
                  </Suspense>
                </div>
              )}
            </section>

            {/* DIVIDER */}
            <div className="w-full max-w-2xl my-10 sm:my-12 border-t border-zinc-200/80"></div>

            {/* SECTION 2: HOW TO USE (Plain, typography-driven, no AI icons) */}
            <section id="how-to-use" className="w-full scroll-mt-20 space-y-6">
              <div className="text-center space-y-1.5">
                <h2 className="text-2xl sm:text-3xl font-black text-[#000C3C] tracking-tight">
                  How to Use Snap<span className="text-[#FDBF2D]">Free</span>
                </h2>
                <p className="text-xs sm:text-sm text-zinc-600 max-w-md mx-auto">
                  Follow these simple steps to save TikTok videos and photos to your device.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* How to download a TikTok video */}
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
                  <div className="border-b border-zinc-100 pb-3">
                    <h3 className="font-bold text-base text-[#000C3C]">
                      Download a TikTok video
                    </h3>
                  </div>

                  <ol className="space-y-3 text-xs sm:text-sm text-zinc-700">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#000C3C] text-[#FDBF2D] text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <span>Open TikTok and find the video you want.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#000C3C] text-[#FDBF2D] text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <span>Tap <strong>Share</strong> and copy the TikTok link.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#000C3C] text-[#FDBF2D] text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <span>Paste the link into SnapFree.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#000C3C] text-[#FDBF2D] text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        4
                      </span>
                      <span>Click <strong>Download</strong> and save the available video.</span>
                    </li>
                  </ol>
                </div>

                {/* How to download TikTok photos */}
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
                  <div className="border-b border-zinc-100 pb-3">
                    <h3 className="font-bold text-base text-[#000C3C]">
                      Download TikTok photos
                    </h3>
                  </div>

                  <ol className="space-y-3 text-xs sm:text-sm text-zinc-700">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#000C3C] text-[#FDBF2D] text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <span>Open TikTok and find the photo/slideshow post.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#000C3C] text-[#FDBF2D] text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <span>Tap <strong>Share</strong> and copy the TikTok link.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#000C3C] text-[#FDBF2D] text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <span>Paste the link into SnapFree.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#000C3C] text-[#FDBF2D] text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        4
                      </span>
                      <span>When supported, SnapFree will display the available photos.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#000C3C] text-[#FDBF2D] text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        5
                      </span>
                      <span>Download the photos you want.</span>
                    </li>
                  </ol>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    inputRef.current?.focus();
                  }}
                  className="inline-flex items-center text-xs font-bold text-[#000C3C] hover:text-black py-2.5 px-5 rounded-xl bg-zinc-200/80 hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  Jump to Downloader
                </button>
              </div>
            </section>

            {/* DIVIDER */}
            <div className="w-full max-w-2xl my-10 sm:my-12 border-t border-zinc-200/80"></div>

            {/* SECTION 3: FAQ (Clean accordion, no decorative pill icons) */}
            <section id="faq" className="w-full scroll-mt-20 space-y-6">
              <div className="text-center space-y-1.5">
                <h2 className="text-2xl sm:text-3xl font-black text-[#000C3C] tracking-tight">
                  Frequently Asked Questions
                </h2>
                <p className="text-xs sm:text-sm text-zinc-600 max-w-md mx-auto">
                  Find answers to common questions about using SnapFree to download TikTok videos and photos.
                </p>
              </div>

              {/* Accordion Cards Container */}
              <div className="w-full space-y-3 pt-2">
                {FAQ_ITEMS.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div
                      key={item.id}
                      id={`faq-card-${item.id}`}
                      className={`bg-white border rounded-2xl overflow-hidden transition-all shadow-2xs ${
                        isOpen
                          ? 'border-zinc-300 ring-2 ring-[#000C3C]/5'
                          : 'border-zinc-200/80 hover:border-zinc-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleFaq(idx)}
                        id={`faq-btn-${item.id}`}
                        aria-expanded={isOpen}
                        aria-controls={`faq-panel-${item.id}`}
                        className="w-full px-5 sm:px-6 py-4 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none focus:bg-zinc-50/80 hover:bg-zinc-50/50 min-h-[52px] select-none"
                      >
                        <span className="font-bold text-sm sm:text-base text-[#000C3C] flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 transition-colors ${
                              isOpen
                                ? 'bg-[#000C3C] text-[#FDBF2D]'
                                : 'bg-zinc-100 text-[#000C3C]'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span>{item.question}</span>
                        </span>
                        <ChevronDown
                          className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-[#000C3C]' : 'text-zinc-400'
                          }`}
                          aria-hidden="true"
                        />
                      </button>

                      {isOpen && (
                        <div
                          id={`faq-panel-${item.id}`}
                          role="region"
                          aria-labelledby={`faq-btn-${item.id}`}
                          className="px-5 sm:px-6 pb-5 pt-3 border-t border-zinc-100 text-xs sm:text-sm text-zinc-600 leading-relaxed bg-[#F8F9FB]/50 animate-fade-in"
                        >
                          {item.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    inputRef.current?.focus();
                  }}
                  className="inline-flex items-center text-xs font-bold text-[#000C3C] hover:text-black py-2.5 px-6 rounded-xl bg-[#FDBF2D] hover:bg-[#fab416] transition-colors cursor-pointer shadow-2xs"
                >
                  Jump to Downloader
                </button>
              </div>
            </section>
          </main>
        )}
      </div>

      {/* Footer */}
      <footer className="w-full bg-[#000C3C] text-zinc-300 border-t border-[#000C3C] z-20">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 pb-8 border-b border-white/10 text-xs">
            {/* Column 1: Brand & Description */}
            <div className="space-y-2 sm:col-span-2 md:col-span-1">
              <button
                onClick={() => navigate('/')}
                className="font-black text-lg text-white flex items-center gap-1 hover:text-[#FDBF2D] transition-colors cursor-pointer"
              >
                <span>Snap</span>
                <span className="text-[#FDBF2D]">Free</span>
              </button>
              <p className="text-zinc-400 leading-relaxed">
                Simple TikTok video and photo downloader.
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div className="space-y-3">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                Quick Links
              </h3>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => navigate('/')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Home
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/#how-to-use')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    How to Use
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/#faq')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    FAQ
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Legal */}
            <div className="space-y-3">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                Legal
              </h3>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => navigate('/privacy')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate('/terms')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Terms of Service
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact */}
            <div className="space-y-3">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                Contact
              </h3>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => navigate('/contact')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Contact
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-zinc-500 text-[11px]">
            <p>&copy; 2026 SnapFree. All rights reserved.</p>
            <p>Independent TikTok downloader utility.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
