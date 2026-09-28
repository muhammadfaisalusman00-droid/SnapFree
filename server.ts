import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { Readable } from 'stream';
import { createServer as createViteServer } from 'vite';

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = 3000;

// Trust reverse proxy (Cloud Run, nginx, Cloudflare, etc.)
app.set('trust proxy', true);

// ----------------------------------------------------------------------------
// 1. HTTPS REDIRECT & SECURITY HEADERS
// ----------------------------------------------------------------------------
app.use((req, res, next) => {
  // Enforce HTTPS behind reverse proxy in production
  const proto = req.headers['x-forwarded-proto'];
  if (process.env.NODE_ENV === 'production' && proto && proto !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
});

// JSON body parser with size limit to prevent payload flooding
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

// ----------------------------------------------------------------------------
// 2. RATE LIMITING & ABUSE PROTECTION (In-memory token bucket)
// ----------------------------------------------------------------------------
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateLimitRecord>();

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(
  ip: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  // Periodic cleanup if store grows large
  if (rateLimitStore.size > 5000) {
    for (const [key, val] of rateLimitStore.entries()) {
      if (val.resetAt <= now) rateLimitStore.delete(key);
    }
  }

  if (!record || record.resetAt <= now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, retryAfterSeconds: 0 };
  }

  if (record.count >= maxRequests) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds: retryAfter };
  }

  record.count += 1;
  return { allowed: true, remaining: maxRequests - record.count, retryAfterSeconds: 0 };
}

// ----------------------------------------------------------------------------
// 3. TIKTOK URL VALIDATION
// ----------------------------------------------------------------------------
function isValidTikTokUrl(rawUrl: string): boolean {
  if (rawUrl.startsWith('demo:')) return true;
  try {
    let urlToTest = rawUrl;
    if (!urlToTest.startsWith('http://') && !urlToTest.startsWith('https://')) {
      urlToTest = 'https://' + urlToTest;
    }
    const parsed = new URL(urlToTest);
    const host = parsed.hostname.toLowerCase();
    const isTikTokDomain =
      host === 'tiktok.com' ||
      host.endsWith('.tiktok.com');

    return isTikTokDomain && parsed.pathname.length > 1;
  } catch {
    return false;
  }
}

// ============================================================================
// 1. API KEY / ENVIRONMENT VARIABLE
// ============================================================================
// Put your API key in an environment variable named FASTSAVER_API_KEY
// ============================================================================
const API_KEY = process.env.FASTSAVER_API_KEY || process.env.TIKTOK_API_KEY || '';

// ============================================================================
// 2. API ENDPOINT RESOLVER
// ============================================================================
// Resolves the FastSaverAPI endpoint to download TikTok media.
// FastSaver fetch endpoint: https://api.fastsaver.io/v1/fetch
// Automatically resolves variations like https://api.fastsaver.io/v1 or trailing slashes.
// ============================================================================
function getResolvedEndpoint(): string {
  let endpoint = (process.env.FASTSAVER_API_ENDPOINT || '').trim();
  if (!endpoint) {
    return 'https://api.fastsaver.io/v1/fetch';
  }
  // Strip trailing slashes
  endpoint = endpoint.replace(/\/+$/, '');
  // If user entered base host or /v1 without /fetch
  if (endpoint === 'https://api.fastsaver.io' || endpoint === 'http://api.fastsaver.io') {
    return `${endpoint}/v1/fetch`;
  }
  if (endpoint.endsWith('/v1')) {
    return `${endpoint}/fetch`;
  }
  return endpoint;
}

// ============================================================================
// 3. REQUIRED API HEADERS
// ============================================================================
// Customize headers sent to your TikTok downloader API here.
// For api.fastsaver.io: 'X-Api-Key'
// For RapidAPI: 'x-rapidapi-key' and 'x-rapidapi-host'
// ============================================================================
function getApiHeaders(apiKey: string, endpoint: string): Record<string, string> {
  const trimmedKey = apiKey.trim();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'Snap Free/1.0',
  };

  if (trimmedKey) {
    headers['X-Api-Key'] = trimmedKey;
  }

  // Support RapidAPI endpoints if configured
  if (endpoint.includes('rapidapi.com')) {
    headers['x-rapidapi-key'] = trimmedKey;
    try {
      const urlObj = new URL(endpoint);
      headers['x-rapidapi-host'] = urlObj.host;
    } catch {
      // ignore
    }
  }

  return headers;
}

// Expand shortened TikTok URLs (like vm.tiktok.com or vt.tiktok.com) to canonical URLs
async function resolveTikTokRedirect(inputUrl: string): Promise<string> {
  let clean = inputUrl.trim();
  try {
    if (/vt\.tiktok\.com|vm\.tiktok\.com/i.test(clean)) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const headRes = await fetch(clean, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      clearTimeout(timeoutId);
      if (headRes.url && headRes.url !== clean) {
        clean = headRes.url;
      }
    }
  } catch {
    // Ignore and fallback to original url
  }

  // Strip excessive tracking query parameters if path contains video or photo ID
  try {
    const parsed = new URL(clean);
    if (parsed.hostname.includes('tiktok.com') && (parsed.pathname.includes('/video/') || parsed.pathname.includes('/photo/'))) {
      clean = `${parsed.origin}${parsed.pathname}`;
    }
  } catch {
    // ignore
  }

  return clean;
}

// ============================================================================
// 4. TIKTOK URL PARAMETER / BODY & REQUEST DISPATCH
// Uses primary FastSaver API and automatically falls back to secondary resolver
// if primary encounters rate limits, timeouts, or link format issues.
// ============================================================================
async function callTikTokApi(tiktokUrl: string, apiKey: string) {
  const finalTikTokUrl = await resolveTikTokRedirect(tiktokUrl);
  let primaryError: string | null = null;

  // Strategy 1: FastSaver API (if API key is present)
  if (apiKey) {
    try {
      const resolvedEndpoint = getResolvedEndpoint();
      const targetUrl = new URL(resolvedEndpoint);
      targetUrl.searchParams.set('url', finalTikTokUrl);

      const headers = getApiHeaders(apiKey, resolvedEndpoint);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const responseText = await response.text();
      let json: any = null;
      try {
        json = JSON.parse(responseText);
      } catch {
        json = null;
      }

      if (response.ok && json && (json.download_url || json.ok || json.data)) {
        return json;
      } else if (json) {
        const detail = json.detail || json.message || json.error || json.msg || '';
        primaryError = typeof detail === 'string' ? detail : JSON.stringify(detail);
      }
    } catch (err: any) {
      primaryError = err.message || 'Primary API timeout';
    }
  }

  // Strategy 2: High-availability secondary resolver (TikWM)
  try {
    const fallbackUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(finalTikTokUrl)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const fallbackRes = await fetch(fallbackUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (fallbackRes.ok) {
      const fallbackJson = await fallbackRes.json();
      if (fallbackJson && fallbackJson.code === 0 && fallbackJson.data) {
        return fallbackJson;
      }
      if (fallbackJson && fallbackJson.msg) {
        primaryError = fallbackJson.msg;
      }
    }
  } catch {
    // Secondary resolver failed
  }

  // Strategy 3: Try oEmbed enrichment for metadata if still needed
  if (primaryError && (primaryError.includes('private') || primaryError.includes('not found') || primaryError.includes('deleted'))) {
    throw new Error('This TikTok post appears to be private, deleted, or unavailable. Please make sure the video or photo post is public.');
  }

  if (primaryError && (primaryError.includes('Rate limit') || primaryError.includes('429'))) {
    throw new Error('Service is temporarily busy. Please wait a moment before trying again.');
  }

  throw new Error("We couldn't process this link. Please check the TikTok link and try again.");
}

// ============================================================================
// FLEXIBLE RESPONSE NORMALIZER
// Parses both Videos and Photo posts from TikTok APIs
// ============================================================================
function normalizeApiResponse(raw: any, originalUrl: string = '') {
  // Handles root object or wrapped inside data/result/response
  const data = raw?.data || raw?.result || raw?.response || raw;

  // Detect photo / slideshow / carousel / album
  let photos: string[] = [];
  if (Array.isArray(data?.items)) {
    photos = data.items.map((it: any) =>
      typeof it === 'string'
        ? it
        : it?.download_url || it?.url || it?.thumbnail_url || it?.src || it?.display_image?.url_list?.[0] || ''
    );
  } else if (Array.isArray(data?.photos)) {
    photos = data.photos.map((p: any) =>
      typeof p === 'string' ? p : p?.url || p?.src || p?.download_url || ''
    );
  } else if (Array.isArray(data?.images)) {
    photos = data.images.map((p: any) =>
      typeof p === 'string' ? p : p?.url || p?.src || p?.download_url || p?.display_image?.url_list?.[0] || ''
    );
  } else if (Array.isArray(data?.media) && data.media.some((m: any) => m?.type === 'image' || m?.type === 'photo')) {
    photos = data.media.map((m: any) => (typeof m === 'string' ? m : m?.url || m?.src || ''));
  } else if (Array.isArray(data?.slides)) {
    photos = data.slides.map((s: any) => (typeof s === 'string' ? s : s?.url || s?.src || ''));
  } else if (Array.isArray(data?.image_post_info?.images)) {
    photos = data.image_post_info.images.map((img: any) => img?.display_image?.url_list?.[0] || img?.url_list?.[0] || '');
  }
  photos = photos.filter(Boolean);

  const isPhotos =
    photos.length > 0 ||
    data?.type === 'album' ||
    data?.type === 'photos' ||
    data?.type === 'photo' ||
    data?.media_type === 'photos' ||
    data?.media_type === 'photo';

  // Video download URL candidates
  const videoUrl =
    data?.download_url ||
    data?.downloadUrl ||
    data?.play_url ||
    data?.play ||
    data?.wmplay ||
    data?.hdplay ||
    data?.video_url ||
    data?.video ||
    data?.url ||
    data?.nowm ||
    data?.no_watermark ||
    data?.watermark_free_url ||
    data?.video?.play_addr?.url_list?.[0] ||
    data?.video?.download_addr?.url_list?.[0] ||
    '';

  // Video HD download URL candidates
  const videoHdUrl =
    data?.hd_download_url ||
    data?.download_url_hd ||
    data?.video_hd ||
    data?.hd_play_url ||
    data?.hd_url ||
    data?.hdplay ||
    data?.nwm_video_url_HQ ||
    videoUrl ||
    '';

  // Thumbnail candidates
  const thumbnailUrl =
    data?.thumbnail_url ||
    data?.thumbnail ||
    data?.cover ||
    data?.origin_cover ||
    data?.dynamic_cover ||
    data?.ai_dynamic_cover ||
    data?.poster ||
    data?.preview_url ||
    data?.video?.cover?.url_list?.[0] ||
    data?.video?.origin_cover?.url_list?.[0] ||
    (photos.length > 0 ? photos[0] : '') ||
    '';

  // Title / caption candidates - strictly use returned caption without inventing fake ones
  const rawTitle = data?.caption || data?.title || data?.desc || data?.description;
  const title = (typeof rawTitle === 'string' ? rawTitle.trim() : '') || undefined;

  // Extract author username / uniqueId from data or fallback to URL
  let authorUniqueId =
    data?.author?.unique_id ||
    data?.author?.username ||
    data?.author?.uniqueId ||
    data?.author_id ||
    (typeof data?.author === 'string' ? data.author : '') ||
    '';

  if (!authorUniqueId && originalUrl) {
    const match = originalUrl.match(/@([a-zA-Z0-9_.-]+)/);
    if (match) {
      authorUniqueId = match[1];
    }
  }

  const authorNickname =
    data?.author?.nickname ||
    data?.author?.name ||
    data?.author_name ||
    data?.nickname ||
    authorUniqueId ||
    '';

  const avatarThumb =
    data?.author?.avatar ||
    data?.author?.avatar_thumb ||
    data?.author_avatar ||
    '';

  const author = (authorNickname || authorUniqueId)
    ? {
        nickname: authorNickname,
        uniqueId: authorUniqueId,
        avatarThumb: avatarThumb || undefined,
      }
    : undefined;

  const duration = data?.duration || data?.video_duration || '';

  return {
    success: true,
    type: isPhotos ? ('photos' as const) : ('video' as const),
    id: data?.id || data?.aweme_id || undefined,
    title,
    thumbnailUrl,
    videoUrl: isPhotos ? undefined : videoUrl,
    videoHdUrl: isPhotos ? undefined : videoHdUrl,
    videoDuration: duration,
    photos: isPhotos ? photos : undefined,
    author,
  };
}

// Sample internal fallback data
const SAMPLE_VIDEO_RESULT = {
  success: true,
  type: 'video' as const,
  title: 'Sample TikTok Video',
  thumbnailUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=80',
  videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  videoHdUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  videoDuration: 15,
  author: {
    nickname: 'Creator',
    uniqueId: 'creator',
  },
};

const SAMPLE_PHOTOS_RESULT = {
  success: true,
  type: 'photos' as const,
  title: 'Sample TikTok Photo Post',
  thumbnailUrl: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800&auto=format&fit=crop&q=80',
  photos: [
    'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80',
  ],
  author: {
    nickname: 'Creator',
    uniqueId: 'photos',
  },
};

// ============================================================================
// API ROUTE: /api/download
// ============================================================================
app.post('/api/download', async (req, res) => {
  try {
    const clientIp = getClientIp(req);
    // Rate limiting: 20 download metadata requests per minute per IP
    const rateCheck = checkRateLimit(`download:${clientIp}`, 20, 60 * 1000);
    res.setHeader('X-RateLimit-Limit', '20');
    res.setHeader('X-RateLimit-Remaining', rateCheck.remaining.toString());

    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', rateCheck.retryAfterSeconds.toString());
      res.status(429).json({
        success: false,
        error: `Too many requests. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
      });
      return;
    }

    const { url } = req.body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      res.status(400).json({
        success: false,
        error: 'Please paste a TikTok link to get started.',
      });
      return;
    }

    const cleanUrl = url.trim();

    // Check for demo shortcuts
    if (cleanUrl === 'demo:video') {
      res.json({ success: true, data: SAMPLE_VIDEO_RESULT });
      return;
    }
    if (cleanUrl === 'demo:photos') {
      res.json({ success: true, data: SAMPLE_PHOTOS_RESULT });
      return;
    }

    // Comprehensive TikTok URL check
    if (!isValidTikTokUrl(cleanUrl)) {
      res.status(400).json({
        success: false,
        error: 'Invalid link format. Please enter a valid TikTok link (e.g., https://www.tiktok.com/@user/video/... or https://vt.tiktok.com/...).',
      });
      return;
    }

    if (!API_KEY) {
      res.status(200).json({
        success: false,
        error: "We couldn't process this link. Please make sure the video is public and accessible.",
      });
      return;
    }

    // Call external TikTok downloader API server-side
    const rawResult = await callTikTokApi(cleanUrl, API_KEY);

    // Normalize response
    const normalized = normalizeApiResponse(rawResult, cleanUrl);

    if (!normalized.videoUrl && (!normalized.photos || normalized.photos.length === 0)) {
      res.status(422).json({
        success: false,
        error: "This TikTok video appears to be private, deleted, or unavailable. Please check the link and try again.",
      });
      return;
    }

    res.json({
      success: true,
      data: normalized,
    });
  } catch (error: any) {
    const msg = error.message || '';
    let userMsg = "We couldn't process this link. Please check the TikTok link and try again.";
    let statusCode = 422;

    if (msg.includes('private') || msg.includes('deleted') || msg.includes('unavailable') || msg.includes('accessible')) {
      userMsg = "This TikTok post appears to be private, deleted, or unavailable. Please make sure the video or photo post is public.";
      statusCode = 404;
    } else if (msg.includes('busy') || msg.includes('429') || msg.includes('Rate limit')) {
      userMsg = "Service is temporarily busy. Please wait a moment before trying again.";
      statusCode = 429;
    } else if (msg) {
      userMsg = msg;
    }

    console.warn('[TikTok Download Notice]', userMsg);

    res.status(statusCode).json({
      success: false,
      error: userMsg,
    });
  }
});

// ============================================================================
// API ROUTE: /api/proxy-download
// Downloads the actual media binary from the upstream URL on the server side,
// verifies that it is valid media rather than HTML / redirect error page,
// logs required debugging details, and streams the binary to the browser.
// ============================================================================
app.get('/api/proxy-download', async (req, res) => {
  try {
    const clientIp = getClientIp(req);
    // Rate limiting: 40 file downloads per minute per IP
    const rateCheck = checkRateLimit(`proxy:${clientIp}`, 40, 60 * 1000);
    res.setHeader('X-RateLimit-Limit', '40');
    res.setHeader('X-RateLimit-Remaining', rateCheck.remaining.toString());

    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', rateCheck.retryAfterSeconds.toString());
      res.status(429).json({
        success: false,
        error: `Download rate limit reached. Please wait ${rateCheck.retryAfterSeconds} seconds before downloading again.`,
      });
      return;
    }

    const fileUrl = req.query.url as string;
    let filename = (req.query.filename as string) || 'tiktok-download.mp4';

    if (!fileUrl) {
      res.status(400).json({ success: false, error: 'Missing file URL parameter' });
      return;
    }

    if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
      res.status(400).json({ success: false, error: 'Invalid URL scheme. Must be HTTP or HTTPS.' });
      return;
    }

    // Follow redirects correctly when fetching the media URL
    const response = await fetch(fileUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'identity',
      },
    });

    const status = response.status;
    const contentType = response.headers.get('content-type') || '';
    const contentLength = response.headers.get('content-length') || '';
    const finalUrl = response.url || fileUrl;

    // Temporary debugging information to server console (no API key logged)
    console.log('[Proxy Download Debug] ---------------------------------');
    console.log(`[Proxy Download Debug] HTTP status: ${status}`);
    console.log(`[Proxy Download Debug] Content-Type: ${contentType || 'unknown'}`);
    console.log(`[Proxy Download Debug] Content-Length: ${contentLength || 'unknown'}`);
    console.log(`[Proxy Download Debug] Final URL after redirects: ${finalUrl}`);
    console.log('[Proxy Download Debug] ---------------------------------');

    // 1. Verify HTTP status
    if (!response.ok) {
      console.warn(`[Proxy Download Debug] Upstream server returned non-OK status: ${status}`);
      res.status(502).json({
        success: false,
        error: `Upstream media server returned error HTTP ${status}. The link may be expired, geo-restricted, or forbidden.`,
      });
      return;
    }

    // 2. Verify Content-Type
    const ctLower = contentType.toLowerCase();
    const isHtml =
      ctLower.includes('text/html') ||
      ctLower.includes('application/xhtml+xml') ||
      ctLower.includes('text/plain') ||
      ctLower.includes('application/json');

    if (isHtml) {
      console.warn(`[Proxy Download Debug] Rejected response: Expected media binary, received Content-Type: ${contentType}`);
      res.status(422).json({
        success: false,
        error: `The media URL returned an HTML/text webpage instead of video binary data (Content-Type: ${contentType}). The TikTok video may be private, restricted, or expired.`,
      });
      return;
    }

    // 3. Download the binary payload
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Inspect payload header for HTML markup
    const sample = buffer.subarray(0, 200).toString('utf-8').toLowerCase();
    if (
      sample.includes('<!doctype') ||
      sample.includes('<html') ||
      sample.includes('<head') ||
      sample.includes('<body') ||
      sample.includes('<?xml')
    ) {
      console.warn('[Proxy Download Debug] Rejected response: Payload content contains HTML document markup.');
      res.status(422).json({
        success: false,
        error: 'The downloaded file contains an HTML webpage instead of video binary data. The TikTok video may be protected or unavailable.',
      });
      return;
    }

    // 5. Preserve and sanitize filename / extension
    filename = filename.replace(/[/\\?%*:|"<>]/g, '_');
    let resolvedContentType = contentType;

    if (!resolvedContentType || resolvedContentType === 'application/octet-stream') {
      if (filename.toLowerCase().endsWith('.mp4')) {
        resolvedContentType = 'video/mp4';
      } else if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) {
        resolvedContentType = 'image/jpeg';
      } else if (filename.toLowerCase().endsWith('.webp')) {
        resolvedContentType = 'image/webp';
      } else if (filename.toLowerCase().endsWith('.mp3')) {
        resolvedContentType = 'audio/mpeg';
      } else {
        resolvedContentType = 'video/mp4';
      }
    }

    if (resolvedContentType.startsWith('video/') && !filename.toLowerCase().endsWith('.mp4')) {
      filename += '.mp4';
    } else if (
      resolvedContentType.startsWith('image/jpeg') &&
      !filename.toLowerCase().endsWith('.jpg') &&
      !filename.toLowerCase().endsWith('.jpeg')
    ) {
      filename += '.jpg';
    } else if (resolvedContentType.startsWith('audio/') && !filename.toLowerCase().endsWith('.mp3')) {
      filename += '.mp3';
    }

    // 6. Send verified binary to the browser
    res.status(200);
    res.setHeader('Content-Type', resolvedContentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  } catch (err: any) {
    console.error('[Proxy Download Debug] Proxy download error:', err.message);
    res.status(500).json({
      success: false,
      error: `Failed to download media file: ${err.message || 'Unknown network error'}`,
    });
  }
});

// ============================================================================
// API ROUTE: /api/proxy-media
// Streams media inline for HTML5 <video> previews and <img> rendering with
// proper CORS headers, Range streaming (HTTP 206), and cache controls.
// Prevents blank boxes caused by cross-origin blocking or hotlink protection.
// ============================================================================
app.get('/api/proxy-media', async (req, res) => {
  try {
    const fileUrl = req.query.url as string;
    if (!fileUrl || typeof fileUrl !== 'string') {
      res.status(400).send('Missing media URL parameter');
      return;
    }

    if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
      res.status(400).send('Invalid URL protocol. Must be HTTP or HTTPS.');
      return;
    }

    const fetchHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
    };

    if (req.headers.range) {
      fetchHeaders['Range'] = req.headers.range;
    }

    const upstream = await fetch(fileUrl, {
      method: 'GET',
      headers: fetchHeaders,
      redirect: 'follow',
    });

    if (!upstream.ok && upstream.status !== 206) {
      res.status(upstream.status).send(`Upstream server returned HTTP ${upstream.status}`);
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    const acceptRanges = upstream.headers.get('accept-ranges');

    res.status(upstream.status);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);
    if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);

    if (upstream.body) {
      try {
        // @ts-ignore
        const nodeStream = Readable.fromWeb(upstream.body);
        nodeStream.pipe(res);
      } catch {
        const arrayBuf = await upstream.arrayBuffer();
        res.send(Buffer.from(arrayBuf));
      }
    } else {
      res.end();
    }
  } catch (err: any) {
    console.error('[Proxy Media Debug] Error streaming media:', err.message);
    if (!res.headersSent) {
      res.status(502).send('Failed to stream media');
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    apiKeyConfigured: Boolean(API_KEY),
    endpoint: getResolvedEndpoint(),
  });
});

// Dynamic XML Sitemap for search engines
app.get('/sitemap.xml', (req, res) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const baseUrl = `${protocol}://${host}`;
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Home Page / Downloader -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>2026-09-28</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <!-- Privacy Policy -->
  <url>
    <loc>${baseUrl}/privacy</loc>
    <lastmod>2026-09-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <!-- Terms of Service -->
  <url>
    <loc>${baseUrl}/terms</loc>
    <lastmod>2026-09-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <!-- Contact Us -->
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>2026-09-28</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;
  res.header('Content-Type', 'application/xml');
  res.send(sitemap);
});

// ============================================================================
// Vite Middleware / Static File Serving
// ============================================================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const publicPath = path.join(process.cwd(), 'public');
    app.use(express.static(publicPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(publicPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;

if (process.env.VERCEL !== '1') {
  startServer();
}
