// ==========================================================================
// MUSIFY — Google Drive & Identity Services Integration
// ==========================================================================
// Handles:
// 1. Google Identity Services (GIS) OAuth 2.0 Token Client (read-only)
// 2. Memory-only token management & silent background refresh
// 3. Recursive folder traversal & pagination (Drive API v3)
// 4. Automatic library sync (detects newly added AND deleted tracks)
// 5. In-memory temporary audio streaming fallback (cloud-only, zero storage)
// ==========================================================================

import { CONFIG, extractDriveFolderId } from './config.js';
import * as Library from './library.js';

let accessToken = null;
let tokenClient = null;
let tokenExpirationTimer = null;
let autoSyncTimer = null;
let isSyncingNow = false;

/**
 * Checks if a Google Drive token is currently active in memory
 */
export function isDriveConnected() {
  return !!accessToken;
}

/**
 * Retrieve current token
 */
export function getAccessToken() {
  return accessToken;
}

/**
 * Sends active OAuth access token to the Service Worker and IndexedDB
 */
export async function syncTokenToServiceWorker(token) {
  if (!token) return;

  // 1. Save token into IndexedDB app_state so Service Worker can read it anytime
  try {
    await Library.saveAppState('drive_access_token', token);
  } catch (err) {
    console.warn('[Musify] Could not cache token to IndexedDB:', err);
  }

  // 2. Post message to active Service Worker controller
  if ('serviceWorker' in navigator) {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_TOKEN',
        token: token,
      });
    } else {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.active) {
          reg.active.postMessage({
            type: 'SET_TOKEN',
            token: token,
          });
        }
      }).catch(() => {});
    }
  }
}

/**
 * Set the token in memory & sync with Service Worker
 */
export function setAccessToken(token, expiresInSeconds = 3599) {
  accessToken = token;
  syncTokenToServiceWorker(token);

  if (tokenExpirationTimer) clearTimeout(tokenExpirationTimer);

  // Auto-refresh token silently 90 seconds before expiration
  const refreshDelay = Math.max(10, expiresInSeconds - 90) * 1000;
  tokenExpirationTimer = setTimeout(() => {
    console.log('[Drive Auth] Token expiring soon, refreshing silently...');
    refreshAccessTokenSilently();
  }, refreshDelay);
}

/**
 * Refresh access token silently without user interaction
 */
export function refreshAccessTokenSilently() {
  return new Promise((resolve) => {
    if (!tokenClient && CONFIG.CLIENT_ID && window.google?.accounts?.oauth2) {
      initTokenClient();
    }

    if (tokenClient) {
      try {
        // prompt: '' tries to refresh token without showing a popup dialog
        tokenClient.requestAccessToken({ prompt: '' });
        resolve(true);
      } catch (e) {
        console.warn('[Drive Auth] Silent refresh failed:', e);
        resolve(false);
      }
    } else {
      resolve(false);
    }
  });
}

/**
 * Initialize Google Identity Services token client
 */
function initTokenClient(onSuccess = null, onError = null) {
  if (!window.google?.accounts?.oauth2 || !CONFIG.CLIENT_ID) return null;

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.CLIENT_ID.trim(),
    scope: CONFIG.DRIVE_SCOPE,
    callback: (response) => {
      if (response.error) {
        console.error('[Drive Auth] GIS error callback:', response);
        if (onError) onError(new Error(response.error_description || response.error));
        return;
      }
      setAccessToken(response.access_token, response.expires_in || 3599);
      if (onSuccess) onSuccess(response.access_token);
    },
  });

  return tokenClient;
}

/**
 * Attempt silent auto-reconnect on application boot if client ID is saved
 */
export async function tryAutoConnect() {
  if (!CONFIG.CLIENT_ID || !CONFIG.FOLDER_ID) return false;

  return new Promise((resolve) => {
    // Wait for Google Identity Services script to be available
    const checkGsi = () => {
      if (window.google?.accounts?.oauth2) {
        initTokenClient(
          (token) => {
            console.log('[Drive Auth] Silent auto-connect succeeded');
            resolve(token);
          },
          () => {
            // User needs to click connect explicitly
            resolve(null);
          }
        );

        try {
          tokenClient.requestAccessToken({ prompt: '' });
        } catch {
          resolve(null);
        }
      } else {
        setTimeout(checkGsi, 200);
      }
    };

    checkGsi();

    // Timeout after 3 seconds so app doesn't hang
    setTimeout(() => resolve(null), 3000);
  });
}

/**
 * Trigger OAuth login flow via Google Identity Services (GIS)
 */
export async function authenticateGoogleDrive() {
  return new Promise((resolve, reject) => {
    if (!CONFIG.CLIENT_ID || !CONFIG.CLIENT_ID.trim()) {
      reject(new Error('Google OAuth Client ID is required. Please paste your Client ID in Settings.'));
      return;
    }

    if (typeof window.google === 'undefined' || !window.google.accounts) {
      reject(new Error('Google Identity Services is still loading or blocked. Please check your internet connection.'));
      return;
    }

    try {
      initTokenClient(
        (token) => resolve(token),
        (err) => reject(err)
      );

      // Launch popup consent dialog
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Recursively find all subfolders inside a given folder ID
 */
async function getAllFolderIds(rootFolderId) {
  const allFolderIds = [rootFolderId];
  const foldersToScan = [rootFolderId];

  while (foldersToScan.length > 0) {
    const currentFolderId = foldersToScan.shift();
    let pageToken = null;

    do {
      const q = `'${currentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const url = new URL('https://www.googleapis.com/drive/v3/files');
      url.searchParams.set('q', q);
      url.searchParams.set('fields', 'nextPageToken, files(id, name)');
      url.searchParams.set('pageSize', '100');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Google Drive folder not found. Please double-check your Folder ID or sharing settings.');
        }
        if (res.status === 401) {
          throw new Error('Google Drive authorization expired. Please reconnect.');
        }
        throw new Error(`Drive folder query error: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.files && data.files.length > 0) {
        data.files.forEach((folder) => {
          allFolderIds.push(folder.id);
          foldersToScan.push(folder.id);
        });
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
  }

  return allFolderIds;
}

/**
 * Scan configured Google Drive folder and its subfolders for audio files.
 * Automatically synchronizes additions AND deletions in IndexedDB!
 */
export async function scanDriveMusicFolder(onProgress = null) {
  if (!accessToken) {
    throw new Error('Please connect your Google Drive first.');
  }

  const folderInput = CONFIG.FOLDER_ID;
  const folderId = extractDriveFolderId(folderInput);

  if (!folderId) {
    throw new Error('Drive Folder ID is not set. Please paste your Google Drive folder link in Settings.');
  }

  if (onProgress) onProgress({ step: 'folders', message: 'Scanning folder and subfolders...' });

  // 1. Get root and all nested subfolders
  const folderIds = await getAllFolderIds(folderId);

  if (onProgress) onProgress({ step: 'audio', message: `Found ${folderIds.length} folder(s). Scanning audio files...` });

  const audioFiles = [];

  // 2. Query audio files in each folder
  for (let i = 0; i < folderIds.length; i++) {
    const fId = folderIds[i];
    let pageToken = null;

    do {
      // Support all common audio extensions & MIME types
      const q = `'${fId}' in parents and (mimeType contains 'audio/' or name contains '.mp3' or name contains '.m4a' or name contains '.flac' or name contains '.wav' or name contains '.ogg' or name contains '.aac' or name contains '.opus' or name contains '.webm') and trashed = false`;
      const url = new URL('https://www.googleapis.com/drive/v3/files');
      url.searchParams.set('q', q);
      url.searchParams.set('fields', 'nextPageToken, files(id, name, mimeType, size, modifiedTime)');
      url.searchParams.set('pageSize', '500');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        throw new Error(`Error listing audio files: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.files) {
        audioFiles.push(...data.files);
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    if (onProgress) {
      onProgress({
        step: 'progress',
        message: `Found ${audioFiles.length} song(s) so far...`,
        count: audioFiles.length,
      });
    }
  }

  // 3. Format tracks and merge with existing local cache
  const existingTracks = await Library.getAllTracks();
  const existingMap = new Map(existingTracks.map((t) => [t.id, t]));

  const colorPalette = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#6366f1'];

  const processedTracks = audioFiles.map((file, idx) => {
    const existing = existingMap.get(file.id);

    // If already scanned and not modified, keep existing parsed metadata/art
    if (existing && existing.modifiedTime === file.modifiedTime) {
      return existing;
    }

    // Parse clean title and artist from filename
    const cleanInfo = parseTrackName(file.name);

    return {
      id: file.id,
      name: file.name,
      title: cleanInfo.title,
      artist: cleanInfo.artist || 'Google Drive',
      album: 'Drive Library',
      size: file.size,
      mimeType: file.mimeType || getMimeTypeFromFilename(file.name),
      modifiedTime: file.modifiedTime,
      streamUrl: `/stream/${file.id}`,
      artwork: existing ? existing.artwork : null,
      color: colorPalette[idx % colorPalette.length],
      duration: existing ? existing.duration : 0,
      durationFormatted: existing ? existing.durationFormatted : '--:--',
    };
  });

  // 4. Synchronize with IndexedDB (automatically adds new AND deletes removed songs!)
  const stats = await Library.syncTracksWithDrive(processedTracks);

  return { tracks: processedTracks, stats };
}

/**
 * Helper: extract clean title and artist from audio filename
 */
function parseTrackName(filename) {
  // Strip audio extension (.mp3, .m4a, .flac, .wav, .ogg, .aac, .opus, .webm, .wma)
  const base = filename.replace(/\.(mp3|m4a|flac|wav|ogg|aac|opus|webm|wma)$/i, '').trim();

  // Check if filename is in "Artist - Title" format
  if (base.includes(' - ')) {
    const parts = base.split(' - ');
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(' - ').trim(),
    };
  }

  return {
    artist: 'Google Drive',
    title: base,
  };
}

/**
 * Helper: infer MIME type from filename extension
 */
function getMimeTypeFromFilename(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    flac: 'audio/flac',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    opus: 'audio/opus',
    webm: 'audio/webm',
  };
  return map[ext] || 'audio/mpeg';
}

/**
 * Direct authenticated fetch fallback:
 * Used if the Service Worker proxy is temporarily inactive or encounters an error.
 * Creates an in-memory ephemeral Blob URL that is revoked after playback,
 * ensuring zero permanent storage on the device!
 */
export async function createDirectStreamUrl(fileId) {
  if (!accessToken) {
    throw new Error('Google Drive authorization required.');
  }

  const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(driveUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    if (response.status === 401) {
      await refreshAccessTokenSilently();
      // Retry once with refreshed token
      const retryRes = await fetch(driveUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!retryRes.ok) throw new Error(`Drive audio stream error: ${retryRes.statusText}`);
      const blob = await retryRes.blob();
      return URL.createObjectURL(blob);
    }
    throw new Error(`Drive audio stream error: ${response.statusText}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

/**
 * Background Auto-sync:
 * Polls Google Drive every 30 seconds and checks whenever tab regains focus.
 * If songs were added or deleted, invokes onSyncComplete with diff stats.
 */
export function startAutoSync(onSyncComplete) {
  if (autoSyncTimer) clearInterval(autoSyncTimer);

  const checkSync = async () => {
    if (!accessToken || !CONFIG.FOLDER_ID || isSyncingNow) return;

    try {
      isSyncingNow = true;
      const { tracks, stats } = await scanDriveMusicFolder();
      if (stats.added > 0 || stats.deleted > 0) {
        console.log(`[Drive Auto-Sync] Detected changes: +${stats.added} added, -${stats.deleted} deleted.`);
        if (onSyncComplete) onSyncComplete(tracks, stats);
      }
    } catch (e) {
      console.warn('[Drive Auto-Sync] Background check notice:', e.message);
    } finally {
      isSyncingNow = false;
    }
  };

  // Run initial poll cycle
  autoSyncTimer = setInterval(checkSync, CONFIG.SYNC_INTERVAL_MS);

  // Sync immediately when browser tab regains focus or becomes visible
  window.addEventListener('focus', checkSync);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkSync();
    }
  });
}
