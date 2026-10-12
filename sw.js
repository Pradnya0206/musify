// ==========================================================================
// MUSIFY — Service Worker Audio Streaming Proxy
// ==========================================================================
// Intercepts /stream/<fileId> requests from the HTML5 audio engine, injects
// the user's Google Drive OAuth Bearer token, preserves HTTP Range headers for
// seamless scrub/seeking, and pipes audio directly without saving to disk.
// ==========================================================================

const SW_VERSION = 'musify-v2';
let memoryToken = null;

// Audio MIME types by file extension fallback
const MIME_MAP = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
  webm: 'audio/webm',
};

// ==========================================================================
// LIFECYCLE EVENTS
// ==========================================================================
self.addEventListener('install', (event) => {
  // Activate immediately without waiting for old workers to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all active client tabs immediately so streaming works on first visit
  event.waitUntil(self.clients.claim());
});

// ==========================================================================
// COMMUNICATION (RECEIVE ACCESS TOKEN FROM MAIN THREAD)
// ==========================================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_TOKEN') {
    memoryToken = event.data.token || null;
  }
});

/**
 * Retrieve token from memory or fallback to IndexedDB app_state store
 */
async function getAccessToken() {
  if (memoryToken) return memoryToken;

  return new Promise((resolve) => {
    try {
      const openReq = indexedDB.open('musify_library_db', 1);
      openReq.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('app_state')) {
          resolve(null);
          return;
        }
        const tx = db.transaction('app_state', 'readonly');
        const store = tx.objectStore('app_state');
        const getReq = store.get('drive_access_token');
        getReq.onsuccess = () => {
          if (getReq.result && getReq.result.value) {
            memoryToken = getReq.result.value;
            resolve(memoryToken);
          } else {
            resolve(null);
          }
        };
        getReq.onerror = () => resolve(null);
      };
      openReq.onerror = () => resolve(null);
    } catch (err) {
      resolve(null);
    }
  });
}

// ==========================================================================
// FETCH INTERCEPTION FOR AUDIO STREAMING
// ==========================================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Match requests destined for /stream/<fileId>
  const streamMatch = url.pathname.match(/\/stream\/([a-zA-Z0-9_-]+)/);
  if (!streamMatch) {
    // Normal asset fetch, leave untouched
    return;
  }

  const fileId = streamMatch[1];
  event.respondWith(handleAudioStream(event.request, fileId));
});

/**
 * Proxies the Google Drive audio stream with authorization and Range headers
 */
async function handleAudioStream(request, fileId) {
  const token = await getAccessToken();

  if (!token) {
    return new Response(JSON.stringify({ error: 'Google Drive token not available' }), {
      status: 401,
      statusText: 'Unauthorized',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Construct upstream Google Drive API v3 download URL
  const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  // Forward Range header if audio element is seeking
  const upstreamHeaders = new Headers();
  upstreamHeaders.set('Authorization', `Bearer ${token}`);

  const rangeHeader = request.headers.get('range') || request.headers.get('Range');
  if (rangeHeader) {
    upstreamHeaders.set('Range', rangeHeader);
  }

  try {
    const driveResponse = await fetch(driveUrl, {
      method: 'GET',
      headers: upstreamHeaders,
      mode: 'cors',
      credentials: 'omit',
    });

    if (!driveResponse.ok && driveResponse.status !== 206) {
      if (driveResponse.status === 401) {
        // Notify open tabs that token expired
        const allClients = await self.clients.matchAll();
        allClients.forEach((client) => {
          client.postMessage({ type: 'AUTH_EXPIRED' });
        });
      }

      return new Response(driveResponse.body, {
        status: driveResponse.status,
        statusText: driveResponse.statusText,
        headers: driveResponse.headers,
      });
    }

    // Build headers to pass back to the HTML5 audio element
    const responseHeaders = new Headers();

    // Preserve Content-Range and Content-Length for seeking
    if (driveResponse.headers.has('content-range')) {
      responseHeaders.set('Content-Range', driveResponse.headers.get('content-range'));
    }
    if (driveResponse.headers.has('content-length')) {
      responseHeaders.set('Content-Length', driveResponse.headers.get('content-length'));
    }

    // Ensure audio MIME type is explicitly valid so mobile browsers play without error
    let contentType = driveResponse.headers.get('content-type') || 'audio/mpeg';
    if (!contentType.startsWith('audio/') && contentType !== 'video/mp4') {
      contentType = 'audio/mpeg';
    }
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Cache-Control', 'no-cache, no-store');

    return new Response(driveResponse.body, {
      status: driveResponse.status,
      statusText: driveResponse.statusText,
      headers: responseHeaders,
    });

  } catch (networkErr) {
    console.error('[SW Stream Proxy Error]', networkErr);
    return new Response(JSON.stringify({ error: networkErr.message }), {
      status: 502,
      statusText: 'Bad Gateway',
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
