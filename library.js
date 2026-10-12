// ==========================================================================
// MUSIFY — Library & Local Storage Management (IndexedDB)
// ==========================================================================
// Manages audio tracks metadata, playlists, favorites, and recently played
// using browser IndexedDB. Keyed by Google Drive file ID.
// ==========================================================================

import { CONFIG } from './config.js';

const DB_NAME = 'musify_library_db';
const DB_VERSION = 1;

let dbInstance = null;

// DEV-ONLY Sample Tracks (Active ONLY when DEV-PREVIEW is ON for visual testing)
export const DEV_SAMPLE_TRACKS = [
  {
    id: 'dev_track_1',
    name: 'Midnight Groove.mp3',
    title: 'Midnight Groove',
    artist: 'Luna Eclipse',
    album: 'Neon City Lights',
    duration: 184, // seconds
    durationFormatted: '3:04',
    mimeType: 'audio/mp3',
    streamUrl: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg',
    color: '#8b5cf6', // Indigo
    year: '2024'
  },
  {
    id: 'dev_track_2',
    name: 'Solar Flare.mp3',
    title: 'Solar Flare',
    artist: 'Cosmic Beats',
    album: 'Starlight Odyssey',
    duration: 215,
    durationFormatted: '3:35',
    mimeType: 'audio/mp3',
    streamUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    color: '#ec4899', // Pink
    year: '2024'
  },
  {
    id: 'dev_track_3',
    name: 'Emerald Cascade.mp3',
    title: 'Emerald Cascade',
    artist: 'Aura Sound',
    album: 'Forest Echoes',
    duration: 168,
    durationFormatted: '2:48',
    mimeType: 'audio/mp3',
    streamUrl: 'https://actions.google.com/sounds/v1/weather/thunderstorm.ogg',
    color: '#10b981', // Emerald
    year: '2023'
  },
  {
    id: 'dev_track_4',
    name: 'Tokyo Cyberwave.mp3',
    title: 'Tokyo Cyberwave',
    artist: 'Synthwave 84',
    album: 'Retro Future',
    duration: 242,
    durationFormatted: '4:02',
    mimeType: 'audio/mp3',
    streamUrl: 'https://actions.google.com/sounds/v1/water/lapping_water.ogg',
    color: '#3b82f6', // Blue
    year: '2024'
  },
  {
    id: 'dev_track_5',
    name: 'Deep Focus Ambient.mp3',
    title: 'Deep Focus Ambient',
    artist: 'Zenith',
    album: 'Study Sessions Vol. 1',
    duration: 195,
    durationFormatted: '3:15',
    mimeType: 'audio/mp3',
    streamUrl: 'https://actions.google.com/sounds/v1/weather/light_rain.ogg',
    color: '#f59e0b', // Amber
    year: '2023'
  }
];

export const DEV_SAMPLE_PLAYLISTS = [
  {
    id: 'dev_pl_1',
    name: 'Lo-Fi Chill & Focus',
    description: 'Relaxing sounds from your drive',
    trackIds: ['dev_track_1', 'dev_track_3', 'dev_track_5'],
    color: '#10b981'
  },
  {
    id: 'dev_pl_2',
    name: 'Late Night Synth',
    description: 'Energetic electronic rhythms',
    trackIds: ['dev_track_2', 'dev_track_4'],
    color: '#8b5cf6'
  }
];

/**
 * Initialize IndexedDB database for persistent local storage
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Audio Tracks Store (Keyed by Google Drive file ID)
      if (!db.objectStoreNames.contains('tracks')) {
        const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
        trackStore.createIndex('title', 'title', { unique: false });
        trackStore.createIndex('artist', 'artist', { unique: false });
        trackStore.createIndex('album', 'album', { unique: false });
      }

      // Playlists Store
      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'id' });
      }

      // App State Store (favorites, recents, sync tokens)
      if (!db.objectStoreNames.contains('app_state')) {
        db.createObjectStore('app_state', { keyPath: 'key' });
      }
    };

    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };

    request.onerror = (e) => {
      console.error('IndexedDB initialization failed:', e.target.error);
      reject(e.target.error);
    };
  });
}

/**
 * Save an arbitrary key/value in app_state
 */
export async function saveAppState(key, value) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('app_state', 'readwrite');
    const store = tx.objectStore('app_state');
    store.put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieve an arbitrary key from app_state
 */
export async function getAppState(key) {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction('app_state', 'readonly');
    const store = tx.objectStore('app_state');
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = () => resolve(null);
  });
}

/**
 * Get all audio tracks currently known to the library
 */
export async function getAllTracks() {
  if (CONFIG.DEV_PREVIEW_MODE) {
    return DEV_SAMPLE_TRACKS;
  }

  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction('tracks', 'readonly');
    const store = tx.objectStore('tracks');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
}

/**
 * Save / Update a batch of tracks in IndexedDB
 */
export async function saveTracks(tracks) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    const store = tx.objectStore('tracks');

    tracks.forEach((track) => store.put(track));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Synchronize full track list from Google Drive:
 * - Inserts new tracks
 * - Updates existing tracks (preserving any parsed ID3 metadata/artwork)
 * - Automatically deletes songs that were removed from Google Drive!
 * Returns diff statistics { added, deleted, updated, total }
 */
export async function syncTracksWithDrive(incomingTracks) {
  const db = await initDB();
  const existingTracks = await getAllTracks();
  const existingIds = new Set(existingTracks.map((t) => t.id));
  const incomingIds = new Set(incomingTracks.map((t) => t.id));

  // Determine additions and deletions
  const addedIds = [];
  const deletedIds = [];

  incomingTracks.forEach((t) => {
    if (!existingIds.has(t.id)) addedIds.push(t.id);
  });

  existingTracks.forEach((t) => {
    if (!incomingIds.has(t.id)) deletedIds.push(t.id);
  });

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['tracks', 'playlists'], 'readwrite');
    const trackStore = tx.objectStore('tracks');
    const playlistStore = tx.objectStore('playlists');

    // 1. Delete removed tracks from tracks store
    deletedIds.forEach((id) => {
      trackStore.delete(id);
    });

    // 2. Put all incoming tracks
    incomingTracks.forEach((track) => {
      trackStore.put(track);
    });

    // 3. Remove deleted tracks from playlists
    if (deletedIds.length > 0) {
      const plReq = playlistStore.getAll();
      plReq.onsuccess = () => {
        const playlists = plReq.result || [];
        const deletedSet = new Set(deletedIds);
        playlists.forEach((pl) => {
          if (pl.trackIds && pl.trackIds.some((id) => deletedSet.has(id))) {
            pl.trackIds = pl.trackIds.filter((id) => !deletedSet.has(id));
            playlistStore.put(pl);
          }
        });
      };
    }

    tx.oncomplete = () => {
      resolve({
        added: addedIds.length,
        deleted: deletedIds.length,
        updated: incomingTracks.length - addedIds.length,
        total: incomingTracks.length,
      });
    };

    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Remove a track by ID (used during Drive auto-sync when a song is deleted)
 */
export async function removeTrack(trackId) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    const store = tx.objectStore('tracks');
    store.delete(trackId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all playlists
 */
export async function getPlaylists() {
  if (CONFIG.DEV_PREVIEW_MODE) {
    const stored = localStorage.getItem('musify_dev_playlists');
    return stored ? JSON.parse(stored) : DEV_SAMPLE_PLAYLISTS;
  }

  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction('playlists', 'readonly');
    const store = tx.objectStore('playlists');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
}

/**
 * Get single playlist by ID
 */
export async function getPlaylist(playlistId) {
  const playlists = await getPlaylists();
  return playlists.find((p) => p.id === playlistId) || null;
}

/**
 * Save or create a playlist
 */
export async function savePlaylist(playlist) {
  if (CONFIG.DEV_PREVIEW_MODE) {
    const playlists = await getPlaylists();
    const idx = playlists.findIndex((p) => p.id === playlist.id);
    if (idx >= 0) {
      playlists[idx] = playlist;
    } else {
      playlists.push(playlist);
    }
    localStorage.setItem('musify_dev_playlists', JSON.stringify(playlists));
    return;
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('playlists', 'readwrite');
    const store = tx.objectStore('playlists');
    store.put(playlist);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Create a new playlist
 */
export async function createPlaylist(name, description = '') {
  const newPl = {
    id: 'pl_' + Date.now(),
    name: name.trim(),
    description: description.trim() || 'Curated from your Google Drive library',
    trackIds: [],
    color: '#1db954',
    createdAt: Date.now(),
  };
  await savePlaylist(newPl);
  return newPl;
}

/**
 * Rename an existing playlist
 */
export async function renamePlaylist(playlistId, newName) {
  const playlist = await getPlaylist(playlistId);
  if (!playlist) return null;
  playlist.name = newName.trim();
  await savePlaylist(playlist);
  return playlist;
}

/**
 * Add track to a playlist
 */
export async function addTrackToPlaylist(playlistId, trackId) {
  const playlist = await getPlaylist(playlistId);
  if (!playlist) return false;
  if (!playlist.trackIds) playlist.trackIds = [];
  if (!playlist.trackIds.includes(trackId)) {
    playlist.trackIds.push(trackId);
    await savePlaylist(playlist);
    return true;
  }
  return false;
}

/**
 * Remove track from a playlist
 */
export async function removeTrackFromPlaylist(playlistId, trackId) {
  const playlist = await getPlaylist(playlistId);
  if (!playlist || !playlist.trackIds) return false;
  playlist.trackIds = playlist.trackIds.filter((id) => id !== trackId);
  await savePlaylist(playlist);
  return true;
}

/**
 * Delete a playlist
 */
export async function deletePlaylist(playlistId) {
  if (CONFIG.DEV_PREVIEW_MODE) {
    const playlists = await getPlaylists();
    const filtered = playlists.filter((p) => p.id !== playlistId);
    localStorage.setItem('musify_dev_playlists', JSON.stringify(filtered));
    return;
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('playlists', 'readwrite');
    const store = tx.objectStore('playlists');
    store.delete(playlistId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get Liked Songs (Favorites) IDs
 */
export async function getFavorites() {
  if (CONFIG.DEV_PREVIEW_MODE) {
    const stored = localStorage.getItem('musify_dev_favorites');
    return stored ? JSON.parse(stored) : ['dev_track_1', 'dev_track_2'];
  }

  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction('app_state', 'readonly');
    const store = tx.objectStore('app_state');
    const req = store.get('favorites');
    req.onsuccess = () => resolve(req.result ? req.result.value : []);
    req.onerror = () => resolve([]);
  });
}

/**
 * Toggle track favorite status
 */
export async function toggleFavorite(trackId) {
  const favorites = await getFavorites();
  const index = favorites.indexOf(trackId);
  let isLiked = false;

  if (index === -1) {
    favorites.push(trackId);
    isLiked = true;
  } else {
    favorites.splice(index, 1);
    isLiked = false;
  }

  if (CONFIG.DEV_PREVIEW_MODE) {
    localStorage.setItem('musify_dev_favorites', JSON.stringify(favorites));
    return isLiked;
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('app_state', 'readwrite');
    const store = tx.objectStore('app_state');
    store.put({ key: 'favorites', value: favorites });
    tx.oncomplete = () => resolve(isLiked);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get Recently Played tracks (last 50)
 */
export async function getRecentlyPlayed() {
  if (CONFIG.DEV_PREVIEW_MODE) {
    const stored = localStorage.getItem('musify_dev_recents');
    return stored ? JSON.parse(stored) : ['dev_track_1', 'dev_track_2', 'dev_track_3'];
  }

  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction('app_state', 'readonly');
    const store = tx.objectStore('app_state');
    const req = store.get('recently_played');
    req.onsuccess = () => resolve(req.result ? req.result.value : []);
    req.onerror = () => resolve([]);
  });
}

/**
 * Add a track to Recently Played (keeps up to 50 items)
 */
export async function recordRecentlyPlayed(trackId) {
  const recents = await getRecentlyPlayed();
  const filtered = recents.filter((id) => id !== trackId);
  filtered.unshift(trackId);
  if (filtered.length > 50) filtered.pop();

  if (CONFIG.DEV_PREVIEW_MODE) {
    localStorage.setItem('musify_dev_recents', JSON.stringify(filtered));
    return;
  }

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('app_state', 'readwrite');
    const store = tx.objectStore('app_state');
    store.put({ key: 'recently_played', value: filtered });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Instant fuzzy search across title, artist, and album
 */
export async function searchTracks(query) {
  const allTracks = await getAllTracks();
  if (!query || !query.trim()) return allTracks;

  const q = query.trim().toLowerCase();
  return allTracks.filter((track) => {
    const title = (track.title || track.name || '').toLowerCase();
    const artist = (track.artist || '').toLowerCase();
    const album = (track.album || '').toLowerCase();
    return title.includes(q) || artist.includes(q) || album.includes(q);
  });
}

/**
 * Format seconds into m:ss format
 */
export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Sort a list of tracks by selected criterion
 */
export function sortTracks(tracks, sortBy = 'recent') {
  const list = [...tracks];
  if (sortBy === 'title') {
    list.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
  } else if (sortBy === 'artist') {
    list.sort((a, b) => (a.artist || 'Unknown').localeCompare(b.artist || 'Unknown'));
  } else if (sortBy === 'duration') {
    list.sort((a, b) => (a.duration || 0) - (b.duration || 0));
  }
  return list;
}

/**
 * Read embedded ID3 metadata & album artwork from an audio file Blob or URL using jsmediatags
 * Reads only the first chunk of the file without downloading the entire song.
 */
export function readAudioTags(fileOrBlob) {
  return new Promise((resolve) => {
    if (typeof window.jsmediatags === 'undefined') {
      console.warn('jsmediatags CDN not loaded');
      resolve(null);
      return;
    }

    try {
      window.jsmediatags.read(fileOrBlob, {
        onSuccess: (tag) => {
          const tags = tag.tags || {};
          let artwork = null;

          if (tags.picture) {
            try {
              let base64String = '';
              const bytes = tags.picture.data;
              const len = bytes.length;
              for (let i = 0; i < len; i++) {
                base64String += String.fromCharCode(bytes[i]);
              }
              artwork = `data:${tags.picture.format};base64,${btoa(base64String)}`;
            } catch (imgErr) {
              console.warn('Could not encode album artwork:', imgErr);
            }
          }

          resolve({
            title: tags.title ? tags.title.trim() : null,
            artist: tags.artist ? tags.artist.trim() : null,
            album: tags.album ? tags.album.trim() : null,
            year: tags.year ? String(tags.year).trim() : null,
            artwork: artwork,
          });
        },
        onError: () => {
          resolve(null);
        },
      });
    } catch (e) {
      resolve(null);
    }
  });
}
