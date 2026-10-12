// ==========================================================================
// MUSIFY — Main Application & Player Controller
// ==========================================================================

import { CONFIG, saveConfig, toggleDevPreview } from './config.js';
import * as Library from './library.js';
import * as Drive from './drive.js';

// Application State
const state = {
  currentTrack: null,
  isPlaying: false,
  queue: [],
  queueIndex: -1,
  shuffle: false,
  repeatMode: 'off', // 'off' | 'all' | 'one'
  currentView: 'home',
  activePlaylist: null,
  volume: 0.8,
  isMuted: false,
  favorites: new Set(),
};

// Track active ephemeral direct stream blob URL to revoke on track change
let currentBlobUrl = null;

// DOM Element Cache
const dom = {
  audio: document.getElementById('audioPlayer'),
  greeting: document.getElementById('greetingHeading'),
  dynamicGradient: document.getElementById('dynamicGradient'),
  
  // Navigation
  navHome: document.getElementById('navHome'),
  navSearch: document.getElementById('navSearch'),
  navLibrary: document.getElementById('navLibrary'),
  btnLikedShortcut: document.getElementById('btnLikedSongsShortcut'),
  mobileNavItems: document.querySelectorAll('.mobile-nav-item'),
  
  // View Panels
  viewHome: document.getElementById('viewHome'),
  viewSearch: document.getElementById('viewSearch'),
  viewLibrary: document.getElementById('viewLibrary'),
  viewPlaylistDetail: document.getElementById('viewPlaylistDetail'),
  viewLikedSongs: document.getElementById('viewLikedSongs'),
  
  // DEV Toggle
  btnDevToggle: document.getElementById('btnDevToggle'),
  devToggleText: document.getElementById('devToggleText'),

  // Containers
  quickPicksGrid: document.getElementById('quickPicksGrid'),
  homeRecentsCards: document.getElementById('homeRecentsCards'),
  homePlaylistsCards: document.getElementById('homePlaylistsCards'),
  sidebarPlaylistList: document.getElementById('sidebarPlaylistList'),
  libraryContentArea: document.getElementById('libraryContentArea'),
  libraryFilterInput: document.getElementById('libraryFilterInput'),
  librarySortSelect: document.getElementById('librarySortSelect'),
  globalSearchInput: document.getElementById('globalSearchInput'),
  btnClearSearch: document.getElementById('btnClearSearch'),
  searchResultsList: document.getElementById('searchResultsList'),
  searchResultsRows: document.getElementById('searchResultsRows'),
  searchEmptyPrompt: document.getElementById('searchEmptyPrompt'),
  
  // Player Bar (Desktop)
  playerCoverBox: document.getElementById('playerCoverBox'),
  playerCoverImg: document.getElementById('playerCoverImg'),
  playerCoverFallback: document.getElementById('playerCoverFallback'),
  playerTrackTitle: document.getElementById('playerTrackTitle'),
  playerTrackArtist: document.getElementById('playerTrackArtist'),
  playerBtnLike: document.getElementById('playerBtnLike'),
  btnPlayPause: document.getElementById('btnPlayPause'),
  btnPrev: document.getElementById('btnPrev'),
  btnNext: document.getElementById('btnNext'),
  btnShuffle: document.getElementById('btnShuffle'),
  btnRepeat: document.getElementById('btnRepeat'),
  repeatBadge: document.getElementById('repeatBadge'),
  seekBar: document.getElementById('seekBar'),
  seekFill: document.getElementById('seekFill'),
  timeCurrent: document.getElementById('timeCurrent'),
  timeTotal: document.getElementById('timeTotal'),
  volumeSlider: document.getElementById('volumeSlider'),
  volumeFill: document.getElementById('volumeFill'),
  btnMute: document.getElementById('btnMute'),
  btnToggleQueue: document.getElementById('btnToggleQueue'),
  playerEqualizer: document.getElementById('playerEqualizer'),

  // Mobile Mini Player & Modal
  mobileMiniPlayer: document.getElementById('mobileMiniPlayer'),
  miniPlayerClickArea: document.getElementById('miniPlayerClickArea'),
  miniPlayerProgressLine: document.getElementById('miniPlayerProgressLine'),
  miniTrackTitle: document.getElementById('miniTrackTitle'),
  miniTrackArtist: document.getElementById('miniTrackArtist'),
  miniPlayerImg: document.getElementById('miniPlayerImg'),
  miniBtnPlayPause: document.getElementById('miniBtnPlayPause'),
  miniBtnLike: document.getElementById('miniBtnLike'),
  mobileNowPlayingModal: document.getElementById('mobileNowPlayingModal'),
  btnCollapseMobileModal: document.getElementById('btnCollapseMobileModal'),
  mobileModalTitle: document.getElementById('mobileModalTitle'),
  mobileModalArtist: document.getElementById('mobileModalArtist'),
  mobileHeroImg: document.getElementById('mobileHeroImg'),
  mobileModalBtnLike: document.getElementById('mobileModalBtnLike'),
  mobileSeekBar: document.getElementById('mobileSeekBar'),
  mobileSeekFill: document.getElementById('mobileSeekFill'),
  mobileTimeCurrent: document.getElementById('mobileTimeCurrent'),
  mobileTimeTotal: document.getElementById('mobileTimeTotal'),
  mobileBtnPlayPause: document.getElementById('mobileBtnPlayPause'),
  mobileBtnPrev: document.getElementById('mobileBtnPrev'),
  mobileBtnNext: document.getElementById('mobileBtnNext'),
  mobileBtnShuffle: document.getElementById('mobileBtnShuffle'),
  mobileBtnRepeat: document.getElementById('mobileBtnRepeat'),
  btnMobileQueueToggle: document.getElementById('btnMobileQueueToggle'),

  // Queue Drawer
  queueDrawer: document.getElementById('queueDrawer'),
  btnCloseQueue: document.getElementById('btnCloseQueue'),
  btnClearQueue: document.getElementById('btnClearQueue'),
  queueNowPlayingItem: document.getElementById('queueNowPlayingItem'),
  queueItemsList: document.getElementById('queueItemsList'),

  // Settings & Modals
  settingsModal: document.getElementById('settingsModal'),
  btnSettings: document.getElementById('btnSettings'),
  btnCloseSettings: document.getElementById('btnCloseSettings'),
  btnSaveSettings: document.getElementById('btnSaveSettings'),
  inputFolderLink: document.getElementById('inputFolderLink'),
  inputClientId: document.getElementById('inputClientId'),
  driveStatusDot: document.getElementById('driveStatusDot'),
  driveStatusLabel: document.getElementById('driveStatusLabel'),
  btnConnectDrive: document.getElementById('btnConnectDrive'),
  btnConnectDriveText: document.getElementById('btnConnectDriveText'),
  toastContainer: document.getElementById('toastContainer'),

  // Context Menu
  trackContextMenu: document.getElementById('trackContextMenu'),
  ctxPlayNext: document.getElementById('ctxPlayNext'),
  ctxAddToQueue: document.getElementById('ctxAddToQueue'),
  ctxAddToPlaylist: document.getElementById('ctxAddToPlaylist'),
  ctxRemoveFromPlaylist: document.getElementById('ctxRemoveFromPlaylist'),
  ctxToggleLike: document.getElementById('ctxToggleLike'),
  ctxLikeLabel: document.getElementById('ctxLikeLabel'),

  // Add to Playlist Modal
  addToPlaylistModal: document.getElementById('addToPlaylistModal'),
  btnCloseAddToPlaylist: document.getElementById('btnCloseAddToPlaylist'),
  playlistPickerList: document.getElementById('playlistPickerList'),
  btnPickerNewPlaylist: document.getElementById('btnPickerNewPlaylist'),

  // Playlist Create/Rename Modal
  playlistModal: document.getElementById('playlistModal'),
  playlistModalTitle: document.getElementById('playlistModalTitle'),
  btnClosePlaylistModal: document.getElementById('btnClosePlaylistModal'),
  inputPlaylistName: document.getElementById('inputPlaylistName'),
  btnCancelPlaylist: document.getElementById('btnCancelPlaylist'),
  btnConfirmPlaylist: document.getElementById('btnConfirmPlaylist'),
  btnPlaylistRename: document.getElementById('btnPlaylistRename'),
  btnPlaylistDelete: document.getElementById('btnPlaylistDelete'),

  // Sync info in Settings Modal
  btnSyncNow: document.getElementById('btnSyncNow'),
  syncStatusText: document.getElementById('syncStatusText'),
  syncTracksCount: document.getElementById('syncTracksCount'),
};

let contextTrack = null;
let editingPlaylist = null; // null for new playlist, or playlist object for rename

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  setGreeting();
  updateDevBadge();
  setupEventListeners();
  setupAudioListeners();
  setupKeyboardShortcuts();

  // Register streaming Service Worker proxy
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      console.log('[Musify] Service Worker registered:', reg.scope);

      // Listen for auth-expired alerts from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'AUTH_EXPIRED') {
          console.warn('[Musify] Service worker reported auth expiration, refreshing silently...');
          Drive.refreshAccessTokenSilently();
        }
      });
    } catch (swErr) {
      console.warn('[Musify] Service Worker registration failed:', swErr);
    }
  }

  // Load favorites
  const favs = await Library.getFavorites();
  state.favorites = new Set(favs);

  // Initial render
  await renderSidebarPlaylists();
  await renderCurrentView();

  // Load initial settings into modal inputs
  if (dom.inputFolderLink) dom.inputFolderLink.value = CONFIG.FOLDER_ID || '';
  if (dom.inputClientId) dom.inputClientId.value = CONFIG.CLIENT_ID || '';

  // Update cached songs count in settings
  const cachedTracks = await Library.getAllTracks();
  if (dom.syncTracksCount) {
    dom.syncTracksCount.textContent = `${cachedTracks.length} song${cachedTracks.length === 1 ? '' : 's'}`;
  }

  // Attempt silent reconnect if credentials exist
  if (CONFIG.CLIENT_ID && CONFIG.FOLDER_ID && !CONFIG.DEV_PREVIEW_MODE) {
    Drive.tryAutoConnect().then(async (token) => {
      if (token) {
        updateDriveStatus('connected', 'Google Drive Connected');
        Drive.startAutoSync(async (updatedTracks, stats) => {
          console.log('[Musify] Auto-sync updated tracks:', updatedTracks.length);
          await renderSidebarPlaylists();
          await renderCurrentView();
          if (stats && (stats.added > 0 || stats.deleted > 0)) {
            let msg = 'Google Drive updated:';
            if (stats.added > 0) msg += ` +${stats.added} added`;
            if (stats.deleted > 0) msg += ` -${stats.deleted} deleted`;
            showToast(msg, 'info');
          }
        });
      }
    });
  }
});

// ==========================================================================
// GREETING & AMBIENT COLOR
// ==========================================================================
function setGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 18) greeting = 'Good afternoon';
  if (dom.greeting) dom.greeting.textContent = greeting;
}

function setHeroColor(colorHex) {
  if (!colorHex) colorHex = '#1a4d2e'; // default Spotify emerald dark
  document.documentElement.style.setProperty('--hero-color', colorHex);
}

// ==========================================================================
// NAVIGATION & VIEW SWITCHING
// ==========================================================================
export function switchView(viewName, meta = null) {
  state.currentView = viewName;

  // Deactivate all panels
  [dom.viewHome, dom.viewSearch, dom.viewLibrary, dom.viewPlaylistDetail, dom.viewLikedSongs].forEach((el) => {
    if (el) el.classList.remove('active');
  });

  // Update navigation button active states
  [dom.navHome, dom.navSearch, dom.navLibrary, dom.btnLikedShortcut].forEach((el) => {
    if (el) el.classList.remove('active');
  });
  dom.mobileNavItems.forEach((btn) => btn.classList.remove('active'));

  if (viewName === 'home') {
    dom.viewHome.classList.add('active');
    dom.navHome.classList.add('active');
    setHeroColor('#1a4d2e');
    renderHomeView();
  } else if (viewName === 'search') {
    dom.viewSearch.classList.add('active');
    dom.navSearch.classList.add('active');
    setHeroColor('#1e3a5f');
    dom.globalSearchInput.focus();
  } else if (viewName === 'library') {
    dom.viewLibrary.classList.add('active');
    dom.navLibrary.classList.add('active');
    setHeroColor('#2e1c4d');
    renderLibraryView(meta && meta.tab ? meta.tab : 'all');
  } else if (viewName === 'liked') {
    dom.viewLikedSongs.classList.add('active');
    dom.btnLikedShortcut.classList.add('active');
    setHeroColor('#450af5');
    renderLikedSongsView();
  } else if (viewName === 'playlist') {
    dom.viewPlaylistDetail.classList.add('active');
    renderPlaylistDetailView(meta);
  }

  // Update mobile nav highlight
  dom.mobileNavItems.forEach((btn) => {
    if (btn.dataset.view === viewName) {
      btn.classList.add('active');
    }
  });

  // Scroll to top
  const mainContent = document.getElementById('mainContent');
  if (mainContent) mainContent.scrollTop = 0;
}

// ==========================================================================
// RENDERERS
// ==========================================================================
async function renderCurrentView() {
  switchView(state.currentView, state.activePlaylist);
}

/**
 * Render Home: Quick Picks + Recents + Playlists
 */
async function renderHomeView() {
  const tracks = await Library.getAllTracks();
  const playlists = await Library.getPlaylists();

  // 1. Quick picks (first 6 items)
  if (dom.quickPicksGrid) {
    if (tracks.length === 0) {
      dom.quickPicksGrid.innerHTML = `
        <div class="quick-pick-card" id="btnConnectQuickPick">
          <div class="quick-pick-art" style="background:#1db954; color:#000; font-size:1.5rem; font-weight:bold;">+</div>
          <div class="quick-pick-title">Connect your Google Drive Folder</div>
        </div>
      `;
      document.getElementById('btnConnectQuickPick')?.addEventListener('click', () => {
        dom.settingsModal.classList.remove('hidden');
      });
    } else {
      const picks = tracks.slice(0, 6);
      dom.quickPicksGrid.innerHTML = picks
        .map((t) => `
          <div class="quick-pick-card" data-track-id="${t.id}">
            <div class="quick-pick-art" style="background:${t.color || '#333'};">
              ${t.artwork ? `<img src="${t.artwork}" alt="">` : '🎵'}
            </div>
            <div class="quick-pick-title">${escapeHtml(t.title || t.name)}</div>
            <button class="quick-pick-play-btn" data-play-id="${t.id}" aria-label="Play">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#000"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </div>
        `)
        .join('');

      dom.quickPicksGrid.querySelectorAll('.quick-pick-card').forEach((card) => {
        card.addEventListener('click', () => {
          const trackId = card.dataset.trackId;
          const track = tracks.find((item) => item.id === trackId);
          if (track) playTrack(track, tracks);
        });
      });
    }
  }

  // 2. Recently Played Carousel
  if (dom.homeRecentsCards) {
    if (tracks.length === 0) {
      dom.homeRecentsCards.innerHTML = `<p class="queue-empty-text">No tracks found. Connect a Google Drive folder to begin.</p>`;
    } else {
      dom.homeRecentsCards.innerHTML = tracks
        .slice(0, 6)
        .map((t) => createMusicCardHtml(t.id, t.title || t.name, t.artist || 'Unknown Artist', t.artwork, t.color))
        .join('');

      attachMusicCardListeners(dom.homeRecentsCards, tracks);
    }
  }

  // 3. Playlists Carousel
  if (dom.homePlaylistsCards) {
    if (playlists.length === 0) {
      dom.homePlaylistsCards.innerHTML = `<p class="queue-empty-text">Create your first playlist using the sidebar button.</p>`;
    } else {
      dom.homePlaylistsCards.innerHTML = playlists
        .map((pl) => createMusicCardHtml(pl.id, pl.name, `${(pl.trackIds || []).length} songs`, null, pl.color, true))
        .join('');

      dom.homePlaylistsCards.querySelectorAll('.music-card').forEach((card) => {
        card.addEventListener('click', () => {
          const plId = card.dataset.cardId;
          const playlist = playlists.find((p) => p.id === plId);
          if (playlist) switchView('playlist', playlist);
        });
      });
    }
  }
}

function createMusicCardHtml(id, title, subtitle, artwork, color = '#282828', isPlaylist = false) {
  return `
    <div class="music-card" data-card-id="${id}" data-is-playlist="${isPlaylist}">
      <div class="card-art-box" style="background:${color};">
        ${artwork ? `<img src="${artwork}" alt="">` : `<div class="art-placeholder">${isPlaylist ? '📁' : '🎵'}</div>`}
        <button class="card-play-hover-btn" aria-label="Play">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="#000"><path d="M8 5v14l11-7z"/></svg>
        </button>
      </div>
      <div class="card-title">${escapeHtml(title)}</div>
      <div class="card-subtitle">${escapeHtml(subtitle)}</div>
    </div>
  `;
}

function attachMusicCardListeners(container, tracks) {
  container.querySelectorAll('.music-card').forEach((card) => {
    card.addEventListener('click', () => {
      const trackId = card.dataset.cardId;
      const track = tracks.find((t) => t.id === trackId);
      if (track) playTrack(track, tracks);
    });
  });
}

/**
 * Render Sidebar Playlists List
 */
async function renderSidebarPlaylists() {
  const playlists = await Library.getPlaylists();
  if (!dom.sidebarPlaylistList) return;

  if (playlists.length === 0) {
    dom.sidebarPlaylistList.innerHTML = `<li class="sidebar-playlist-item" style="color:var(--text-muted); font-size:0.8rem;">No playlists yet</li>`;
    return;
  }

  dom.sidebarPlaylistList.innerHTML = playlists
    .map((pl) => `<li class="sidebar-playlist-item" data-pl-id="${pl.id}">${escapeHtml(pl.name)}</li>`)
    .join('');

  dom.sidebarPlaylistList.querySelectorAll('.sidebar-playlist-item').forEach((li) => {
    li.addEventListener('click', () => {
      const plId = li.dataset.plId;
      const playlist = playlists.find((p) => p.id === plId);
      if (playlist) switchView('playlist', playlist);
    });
  });
}

/**
 * Render Library View (All Songs / Playlists / Liked / Recents)
 */
async function renderLibraryView(activeTab = 'all') {
  if (!dom.libraryContentArea) return;

  // Update tab buttons
  document.querySelectorAll('.library-tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === activeTab);
  });

  const allTracks = await Library.getAllTracks();

  if (activeTab === 'all') {
    renderTrackTable(dom.libraryContentArea, allTracks);
  } else if (activeTab === 'playlists') {
    const playlists = await Library.getPlaylists();
    dom.libraryContentArea.innerHTML = `
      <div class="cards-carousel">
        ${playlists.map((pl) => createMusicCardHtml(pl.id, pl.name, `${(pl.trackIds || []).length} songs`, null, pl.color, true)).join('')}
      </div>
    `;
    dom.libraryContentArea.querySelectorAll('.music-card').forEach((card) => {
      card.addEventListener('click', () => {
        const pl = playlists.find((p) => p.id === card.dataset.cardId);
        if (pl) switchView('playlist', pl);
      });
    });
  } else if (activeTab === 'liked') {
    const favs = await Library.getFavorites();
    const likedTracks = allTracks.filter((t) => favs.includes(t.id));
    renderTrackTable(dom.libraryContentArea, likedTracks);
  } else if (activeTab === 'recents') {
    const recents = await Library.getRecentlyPlayed();
    const recentTracks = recents.map((id) => allTracks.find((t) => t.id === id)).filter(Boolean);
    renderTrackTable(dom.libraryContentArea, recentTracks);
  }
}

/**
 * Render Liked Songs View
 */
async function renderLikedSongsView() {
  const allTracks = await Library.getAllTracks();
  const favs = await Library.getFavorites();
  const likedTracks = allTracks.filter((t) => favs.includes(t.id));

  const countLabel = document.getElementById('likedSongsCount');
  if (countLabel) countLabel.textContent = `${likedTracks.length} song${likedTracks.length === 1 ? '' : 's'}`;

  const container = document.getElementById('likedTracksRows');
  if (container) {
    container.innerHTML = generateTrackRowsHtml(likedTracks);
    attachTrackRowListeners(container, likedTracks);
  }

  const btnPlay = document.getElementById('btnLikedPlayAll');
  if (btnPlay) {
    btnPlay.onclick = () => {
      if (likedTracks.length > 0) playTrack(likedTracks[0], likedTracks);
    };
  }
}

/**
 * Render Playlist Detail View
 */
async function renderPlaylistDetailView(playlist) {
  if (!playlist) return;
  state.activePlaylist = playlist;

  const titleEl = document.getElementById('playlistDetailTitle');
  const countEl = document.getElementById('playlistDetailSongCount');
  if (titleEl) titleEl.textContent = playlist.name;

  if (playlist.color) setHeroColor(playlist.color);

  const allTracks = await Library.getAllTracks();
  const playlistTracks = (playlist.trackIds || []).map((id) => allTracks.find((t) => t.id === id)).filter(Boolean);

  if (countEl) countEl.textContent = `${playlistTracks.length} song${playlistTracks.length === 1 ? '' : 's'}`;

  const container = document.getElementById('playlistTracksRows');
  if (container) {
    container.innerHTML = generateTrackRowsHtml(playlistTracks);
    attachTrackRowListeners(container, playlistTracks);
  }

  const btnPlayAll = document.getElementById('btnPlaylistPlayAll');
  if (btnPlayAll) {
    btnPlayAll.onclick = () => {
      if (playlistTracks.length > 0) playTrack(playlistTracks[0], playlistTracks);
    };
  }

  const btnShuffleAll = document.getElementById('btnPlaylistShuffleAll');
  if (btnShuffleAll) {
    btnShuffleAll.onclick = () => {
      if (playlistTracks.length > 0) {
        state.shuffle = true;
        updateShuffleRepeatUi();
        const randIndex = Math.floor(Math.random() * playlistTracks.length);
        playTrack(playlistTracks[randIndex], playlistTracks);
      }
    };
  }
}

/**
 * Helper: Render track table inside container
 */
function renderTrackTable(container, tracks) {
  if (tracks.length === 0) {
    container.innerHTML = `<div class="search-empty-state"><p>No songs found.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="tracklist-container">
      <div class="tracklist-table-header">
        <span class="col-index">#</span>
        <span class="col-title">Title</span>
        <span class="col-album">Album</span>
        <span class="col-duration">Duration</span>
        <span class="col-actions"></span>
      </div>
      <div class="tracklist-rows">
        ${generateTrackRowsHtml(tracks)}
      </div>
    </div>
  `;

  attachTrackRowListeners(container.querySelector('.tracklist-rows'), tracks);
}

function generateTrackRowsHtml(tracks) {
  return tracks
    .map((track, i) => {
      const isCurrent = state.currentTrack && state.currentTrack.id === track.id;
      const isLiked = state.favorites.has(track.id);
      return `
        <div class="track-row ${isCurrent ? 'active' : ''}" data-track-id="${track.id}">
          <div class="track-col-index">
            <span class="index-num">${i + 1}</span>
            <button class="row-play-btn" aria-label="Play">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <div class="equalizer-mini ${isCurrent && state.isPlaying ? '' : 'hidden'}">
              <span class="bar bar1"></span>
              <span class="bar bar2"></span>
              <span class="bar bar3"></span>
            </div>
          </div>
          <div class="track-col-title">
            <div class="track-mini-art" style="background:${track.color || '#333'};">
              ${track.artwork ? `<img src="${track.artwork}" alt="">` : '🎵'}
            </div>
            <div class="track-title-text">
              <span class="track-name">${escapeHtml(track.title || track.name)}</span>
              <span class="track-artist">${escapeHtml(track.artist || 'Unknown Artist')}</span>
            </div>
          </div>
          <div class="track-col-album">${escapeHtml(track.album || '—')}</div>
          <div class="track-col-duration">${track.durationFormatted || Library.formatTime(track.duration)}</div>
          <div class="track-col-actions">
            <button class="row-heart-btn ${isLiked ? 'liked' : ''}" data-like-id="${track.id}" aria-label="Like" title="Save to Liked Songs">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
            <button class="row-menu-btn" data-menu-id="${track.id}" aria-label="More options" title="More options">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

function attachTrackRowListeners(container, tracks) {
  if (!container) return;

  container.querySelectorAll('.track-row').forEach((row) => {
    // Normal row click -> play track
    row.addEventListener('click', (e) => {
      if (e.target.closest('.row-heart-btn') || e.target.closest('.row-menu-btn')) return;
      const trackId = row.dataset.trackId;
      const track = tracks.find((t) => t.id === trackId);
      if (track) playTrack(track, tracks);
    });

    // Right click -> open context menu
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const trackId = row.dataset.trackId;
      const track = tracks.find((t) => t.id === trackId);
      if (track) showTrackContextMenu(e.clientX, e.clientY, track);
    });
  });

  // 3-dots button click
  container.querySelectorAll('.row-menu-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const trackId = btn.dataset.menuId;
      const track = tracks.find((t) => t.id === trackId);
      if (track) {
        const rect = btn.getBoundingClientRect();
        showTrackContextMenu(rect.left - 160, rect.bottom + 4, track);
      }
    });
  });

  // Heart like button click
  container.querySelectorAll('.row-heart-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const trackId = btn.dataset.likeId;
      const isLiked = await Library.toggleFavorite(trackId);
      if (isLiked) {
        state.favorites.add(trackId);
        btn.classList.add('liked');
        showToast('Saved to your Liked Songs', 'success');
      } else {
        state.favorites.delete(trackId);
        btn.classList.remove('liked');
        showToast('Removed from Liked Songs');
      }
      updatePlayerLikeState();
    });
  });
}

function showTrackContextMenu(x, y, track) {
  contextTrack = track;
  const menu = dom.trackContextMenu;
  if (!menu) return;

  // Position within viewport
  const menuWidth = 200;
  const menuHeight = 220;
  const posX = Math.min(x, window.innerWidth - menuWidth - 10);
  const posY = Math.min(y, window.innerHeight - menuHeight - 10);

  menu.style.left = `${Math.max(10, posX)}px`;
  menu.style.top = `${Math.max(10, posY)}px`;

  // Show/hide remove from playlist option
  if (state.currentView === 'playlist' && state.activePlaylist) {
    dom.ctxRemoveFromPlaylist.classList.remove('hidden');
  } else {
    dom.ctxRemoveFromPlaylist.classList.add('hidden');
  }

  // Update like label
  const isLiked = state.favorites.has(track.id);
  dom.ctxLikeLabel.textContent = isLiked ? 'Remove from Liked Songs' : 'Save to your Liked Songs';

  menu.classList.remove('hidden');
}

function hideTrackContextMenu() {
  if (dom.trackContextMenu) dom.trackContextMenu.classList.add('hidden');
}

// ==========================================================================
// AUDIO PLAYER ENGINE (WITH 2-TIER CLOUD-ONLY STREAMING & AUTO-RECOVERY)
// ==========================================================================
export async function playTrack(track, queue = null) {
  if (!track) return;

  state.currentTrack = track;
  if (queue && queue.length > 0) {
    state.queue = [...queue];
    state.queueIndex = state.queue.findIndex((t) => t.id === track.id);
  }

  // Record to recently played
  Library.recordRecentlyPlayed(track.id);

  // Update track info UI immediately
  updateTrackDisplay(track);

  // Revoke previous in-memory Object URL if one existed
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }

  // Tier 1: Service Worker streaming proxy (/stream/<fileId>) or direct streamUrl in dev mode
  const streamUrl = track.streamUrl || `/stream/${track.id}`;

  // Error fallback handler: If Service Worker streaming fails or is blocked,
  // seamlessly fetch an in-memory ephemeral Blob URL so playback NEVER stops!
  dom.audio.onerror = async () => {
    console.warn(`[Musify Audio] Primary stream error on ${dom.audio.src}. Launching direct streaming fallback...`);
    dom.audio.onerror = null; // Prevent recursion

    if (Drive.isDriveConnected() && !CONFIG.DEV_PREVIEW_MODE) {
      try {
        const directUrl = await Drive.createDirectStreamUrl(track.id);
        currentBlobUrl = directUrl;
        dom.audio.src = directUrl;
        await dom.audio.play();
        state.isPlaying = true;
        updatePlayPauseUi();
        updateMediaSession(track);
      } catch (directErr) {
        console.error('[Musify Audio] Direct streaming fallback failed:', directErr);
        showToast('Playback failed. Please reconnect Google Drive in Settings.', 'error');
        state.isPlaying = false;
        updatePlayPauseUi();
      }
    }
  };

  // Set source and attempt playback
  if (dom.audio.src !== streamUrl) {
    dom.audio.src = streamUrl;
  }

  dom.audio
    .play()
    .then(() => {
      state.isPlaying = true;
      updatePlayPauseUi();
      updateMediaSession(track);

      // Asynchronously extract embedded ID3 tags/artwork if missing
      if (!track.artwork && streamUrl) {
        Library.readAudioTags(streamUrl)
          .then((tags) => {
            if (tags && (tags.artwork || tags.title)) {
              if (tags.artwork) track.artwork = tags.artwork;
              if (tags.title && tags.title !== track.title) track.title = tags.title;
              if (tags.artist && tags.artist !== track.artist) track.artist = tags.artist;
              if (tags.album) track.album = tags.album;
              updateTrackDisplay(track);
              Library.saveTracks([track]);
            }
          })
          .catch(() => {});
      }
    })
    .catch((err) => {
      console.warn('[Musify Audio] Playback pending or gesture required:', err.message);
      state.isPlaying = false;
      updatePlayPauseUi();
    });

  updateQueueDrawer();
  updateActiveTrackRows();
}

export function togglePlayPause() {
  if (!state.currentTrack) {
    // If no track selected, pick first track from library
    Library.getAllTracks().then((tracks) => {
      if (tracks.length > 0) playTrack(tracks[0], tracks);
    });
    return;
  }

  if (dom.audio.paused) {
    dom.audio.play().then(() => {
      state.isPlaying = true;
      updatePlayPauseUi();
    }).catch((err) => {
      console.warn('[Musify] Play toggle error:', err);
    });
  } else {
    dom.audio.pause();
    state.isPlaying = false;
    updatePlayPauseUi();
  }
}

export function playNext() {
  if (state.queue.length === 0) return;

  if (state.repeatMode === 'one') {
    dom.audio.currentTime = 0;
    dom.audio.play();
    return;
  }

  let nextIndex = state.queueIndex + 1;

  if (state.shuffle) {
    nextIndex = Math.floor(Math.random() * state.queue.length);
  } else if (nextIndex >= state.queue.length) {
    if (state.repeatMode === 'all') {
      nextIndex = 0;
    } else {
      // End of queue
      return;
    }
  }

  state.queueIndex = nextIndex;
  playTrack(state.queue[nextIndex], state.queue);
}

export function playPrevious() {
  if (state.queue.length === 0) return;

  // If track has been playing for more than 3 seconds, restart it first
  if (dom.audio.currentTime > 3) {
    dom.audio.currentTime = 0;
    return;
  }

  let prevIndex = state.queueIndex - 1;
  if (prevIndex < 0) {
    prevIndex = state.repeatMode === 'all' ? state.queue.length - 1 : 0;
  }

  state.queueIndex = prevIndex;
  playTrack(state.queue[prevIndex], state.queue);
}

// ==========================================================================
// UI UPDATE HELPERS
// ==========================================================================
function updateTrackDisplay(track) {
  const title = track.title || track.name || 'Unknown Track';
  const artist = track.artist || 'Unknown Artist';

  // Desktop player
  if (dom.playerTrackTitle) dom.playerTrackTitle.textContent = title;
  if (dom.playerTrackArtist) dom.playerTrackArtist.textContent = artist;

  // Mobile Mini Player
  if (dom.miniTrackTitle) dom.miniTrackTitle.textContent = title;
  if (dom.miniTrackArtist) dom.miniTrackArtist.textContent = artist;
  if (dom.mobileMiniPlayer) dom.mobileMiniPlayer.classList.remove('hidden');

  // Mobile Fullscreen Modal
  if (dom.mobileModalTitle) dom.mobileModalTitle.textContent = title;
  if (dom.mobileModalArtist) dom.mobileModalArtist.textContent = artist;

  // Artwork
  if (track.artwork) {
    if (dom.playerCoverImg) {
      dom.playerCoverImg.src = track.artwork;
      dom.playerCoverImg.classList.remove('hidden');
      dom.playerCoverFallback.classList.add('hidden');
    }
    if (dom.miniPlayerImg) {
      dom.miniPlayerImg.src = track.artwork;
      dom.miniPlayerImg.classList.remove('hidden');
    }
    if (dom.mobileHeroImg) {
      dom.mobileHeroImg.src = track.artwork;
      dom.mobileHeroImg.classList.remove('hidden');
    }
  } else {
    if (dom.playerCoverImg) dom.playerCoverImg.classList.add('hidden');
    if (dom.playerCoverFallback) dom.playerCoverFallback.classList.remove('hidden');
    if (dom.miniPlayerImg) dom.miniPlayerImg.classList.add('hidden');
    if (dom.mobileHeroImg) dom.mobileHeroImg.classList.add('hidden');
  }

  // Dynamic ambient hero glow
  if (track.color) {
    setHeroColor(track.color);
  }

  updatePlayerLikeState();
}

function updatePlayPauseUi() {
  const isPlaying = !dom.audio.paused;

  // Desktop button
  if (dom.btnPlayPause) {
    const playIcon = dom.btnPlayPause.querySelector('.icon-play');
    const pauseIcon = dom.btnPlayPause.querySelector('.icon-pause');
    if (playIcon && pauseIcon) {
      playIcon.classList.toggle('hidden', isPlaying);
      pauseIcon.classList.toggle('hidden', !isPlaying);
    }
  }

  // Equalizer visualizer
  if (dom.playerEqualizer) {
    dom.playerEqualizer.classList.toggle('hidden', !isPlaying);
  }

  // Mobile mini player button
  if (dom.miniBtnPlayPause) {
    const miniPlay = dom.miniBtnPlayPause.querySelector('.mini-icon-play');
    const miniPause = dom.miniBtnPlayPause.querySelector('.mini-icon-pause');
    if (miniPlay && miniPause) {
      miniPlay.classList.toggle('hidden', isPlaying);
      miniPause.classList.toggle('hidden', !isPlaying);
    }
  }

  // Mobile modal button
  if (dom.mobileBtnPlayPause) {
    const mPlay = dom.mobileBtnPlayPause.querySelector('.icon-play');
    const mPause = dom.mobileBtnPlayPause.querySelector('.icon-pause');
    if (mPlay && mPause) {
      mPlay.classList.toggle('hidden', isPlaying);
      mPause.classList.toggle('hidden', !isPlaying);
    }
  }

  updateActiveTrackRows();
}

function updatePlayerLikeState() {
  if (!state.currentTrack) return;
  const isLiked = state.favorites.has(state.currentTrack.id);

  [dom.playerBtnLike, dom.miniBtnLike, dom.mobileModalBtnLike].forEach((btn) => {
    if (!btn) return;
    btn.classList.toggle('liked', isLiked);
    const svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('fill', isLiked ? 'currentColor' : 'none');
  });
}

function updateActiveTrackRows() {
  document.querySelectorAll('.track-row').forEach((row) => {
    const isThisTrack = state.currentTrack && row.dataset.trackId === state.currentTrack.id;
    row.classList.toggle('active', isThisTrack);
    const miniEq = row.querySelector('.equalizer-mini');
    if (miniEq) {
      miniEq.classList.toggle('hidden', !(isThisTrack && !dom.audio.paused));
    }
  });
}

function updateShuffleRepeatUi() {
  if (dom.btnShuffle) dom.btnShuffle.classList.toggle('active', state.shuffle);
  if (dom.mobileBtnShuffle) dom.mobileBtnShuffle.classList.toggle('active', state.shuffle);

  const isRepeatActive = state.repeatMode !== 'off';
  if (dom.btnRepeat) dom.btnRepeat.classList.toggle('active', isRepeatActive);
  if (dom.mobileBtnRepeat) dom.mobileBtnRepeat.classList.toggle('active', isRepeatActive);

  if (dom.repeatBadge) {
    dom.repeatBadge.classList.toggle('hidden', state.repeatMode !== 'one');
  }
}

function updateQueueDrawer() {
  if (!dom.queueNowPlayingItem || !dom.queueItemsList) return;

  if (state.currentTrack) {
    dom.queueNowPlayingItem.innerHTML = `
      <div class="queue-item">
        <div class="queue-item-art" style="background:${state.currentTrack.color || '#333'};">
          ${state.currentTrack.artwork ? `<img src="${state.currentTrack.artwork}">` : '🎵'}
        </div>
        <div class="queue-item-meta">
          <div class="queue-item-title">${escapeHtml(state.currentTrack.title || state.currentTrack.name)}</div>
          <div class="queue-item-artist">${escapeHtml(state.currentTrack.artist || 'Unknown')}</div>
        </div>
      </div>
    `;
  } else {
    dom.queueNowPlayingItem.innerHTML = `<span class="queue-empty-text">No track playing</span>`;
  }

  const upcoming = state.queue.slice(state.queueIndex + 1);
  if (upcoming.length === 0) {
    dom.queueItemsList.innerHTML = `<span class="queue-empty-text">Queue is empty</span>`;
  } else {
    dom.queueItemsList.innerHTML = upcoming
      .map(
        (t, i) => {
          const absoluteIndex = state.queueIndex + 1 + i;
          return `
          <div class="queue-item" data-queue-index="${absoluteIndex}">
            <div class="queue-item-art" style="background:${t.color || '#333'};">
              ${t.artwork ? `<img src="${t.artwork}">` : '🎵'}
            </div>
            <div class="queue-item-meta">
              <div class="queue-item-title">${escapeHtml(t.title || t.name)}</div>
              <div class="queue-item-artist">${escapeHtml(t.artist || 'Unknown')}</div>
            </div>
            <div class="queue-item-actions">
              ${i > 0 ? `<button class="btn-queue-order" data-move-up="${absoluteIndex}" title="Move up">▲</button>` : ''}
              ${i < upcoming.length - 1 ? `<button class="btn-queue-order" data-move-down="${absoluteIndex}" title="Move down">▼</button>` : ''}
              <button class="btn-remove-queue" data-remove-index="${absoluteIndex}" title="Remove from queue">✕</button>
            </div>
          </div>
        `;
        }
      )
      .join('');

    // Clicking an upcoming song plays it immediately
    dom.queueItemsList.querySelectorAll('.queue-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const targetIdx = parseInt(item.dataset.queueIndex, 10);
        state.queueIndex = targetIdx;
        playTrack(state.queue[targetIdx], state.queue);
      });
    });

    // Move up
    dom.queueItemsList.querySelectorAll('[data-move-up]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.moveUp, 10);
        if (idx > state.queueIndex + 1) {
          const temp = state.queue[idx];
          state.queue[idx] = state.queue[idx - 1];
          state.queue[idx - 1] = temp;
          updateQueueDrawer();
        }
      });
    });

    // Move down
    dom.queueItemsList.querySelectorAll('[data-move-down]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.moveDown, 10);
        if (idx < state.queue.length - 1) {
          const temp = state.queue[idx];
          state.queue[idx] = state.queue[idx + 1];
          state.queue[idx + 1] = temp;
          updateQueueDrawer();
        }
      });
    });

    // Remove
    dom.queueItemsList.querySelectorAll('.btn-remove-queue').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const removeIdx = parseInt(btn.dataset.removeIndex, 10);
        state.queue.splice(removeIdx, 1);
        updateQueueDrawer();
      });
    });
  }
}

// ==========================================================================
// MEDIA SESSION API (LOCK SCREEN & HEADPHONES)
// ==========================================================================
function updateMediaSession(track) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || track.name,
      artist: track.artist || 'Google Drive',
      album: track.album || 'Musify',
      artwork: track.artwork
        ? [{ src: track.artwork, sizes: '512x512', type: 'image/png' }]
        : [],
    });

    navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
    navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime && dom.audio.duration) {
        dom.audio.currentTime = details.seekTime;
      }
    });
  }
}

// ==========================================================================
// AUDIO ELEMENT LISTENERS
// ==========================================================================
function setupAudioListeners() {
  // Time update -> update scrubbers
  dom.audio.addEventListener('timeupdate', () => {
    const cur = dom.audio.currentTime;
    const dur = dom.audio.duration;

    if (dur && !isNaN(dur)) {
      const pct = (cur / dur) * 100;
      if (dom.seekBar) {
        dom.seekBar.value = pct;
        dom.seekFill.style.width = `${pct}%`;
      }
      if (dom.mobileSeekBar) {
        dom.mobileSeekBar.value = pct;
        dom.mobileSeekFill.style.width = `${pct}%`;
      }
      if (dom.miniPlayerProgressLine) {
        dom.miniPlayerProgressLine.style.width = `${pct}%`;
      }
      if (dom.timeCurrent) dom.timeCurrent.textContent = Library.formatTime(cur);
      if (dom.timeTotal) dom.timeTotal.textContent = Library.formatTime(dur);
      if (dom.mobileTimeCurrent) dom.mobileTimeCurrent.textContent = Library.formatTime(cur);
      if (dom.mobileTimeTotal) dom.mobileTimeTotal.textContent = Library.formatTime(dur);
    }
  });

  // Track finished -> auto play next
  dom.audio.addEventListener('ended', () => {
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = null;
    }
    playNext();
  });

  // Play/pause events
  dom.audio.addEventListener('play', () => updatePlayPauseUi());
  dom.audio.addEventListener('pause', () => updatePlayPauseUi());
}

// ==========================================================================
// EVENT LISTENERS SETUP
// ==========================================================================
function setupEventListeners() {
  // Navigation
  dom.navHome?.addEventListener('click', () => switchView('home'));
  dom.navSearch?.addEventListener('click', () => switchView('search'));
  dom.navLibrary?.addEventListener('click', () => switchView('library'));
  dom.btnLikedShortcut?.addEventListener('click', () => switchView('liked'));

  dom.mobileNavItems.forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // History buttons
  document.getElementById('btnHistoryBack')?.addEventListener('click', () => switchView('home'));
  document.getElementById('btnHistoryForward')?.addEventListener('click', () => switchView('library'));

  // Player controls
  dom.btnPlayPause?.addEventListener('click', togglePlayPause);
  dom.miniBtnPlayPause?.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlayPause();
  });
  dom.mobileBtnPlayPause?.addEventListener('click', togglePlayPause);

  dom.btnNext?.addEventListener('click', playNext);
  dom.mobileBtnNext?.addEventListener('click', playNext);

  dom.btnPrev?.addEventListener('click', playPrevious);
  dom.mobileBtnPrev?.addEventListener('click', playPrevious);

  // Shuffle toggle
  const toggleShuffle = () => {
    state.shuffle = !state.shuffle;
    updateShuffleRepeatUi();
    showToast(state.shuffle ? 'Shuffle on' : 'Shuffle off');
  };
  dom.btnShuffle?.addEventListener('click', toggleShuffle);
  dom.mobileBtnShuffle?.addEventListener('click', toggleShuffle);

  // Repeat toggle (off -> all -> one -> off)
  const toggleRepeat = () => {
    if (state.repeatMode === 'off') state.repeatMode = 'all';
    else if (state.repeatMode === 'all') state.repeatMode = 'one';
    else state.repeatMode = 'off';

    updateShuffleRepeatUi();
    const msgs = { off: 'Repeat off', all: 'Repeat all', one: 'Repeat track' };
    showToast(msgs[state.repeatMode]);
  };
  dom.btnRepeat?.addEventListener('click', toggleRepeat);
  dom.mobileBtnRepeat?.addEventListener('click', toggleRepeat);

  // Like current song from player
  const toggleCurrentLike = async () => {
    if (!state.currentTrack) return;
    const isLiked = await Library.toggleFavorite(state.currentTrack.id);
    if (isLiked) {
      state.favorites.add(state.currentTrack.id);
      showToast('Saved to Liked Songs', 'success');
    } else {
      state.favorites.delete(state.currentTrack.id);
      showToast('Removed from Liked Songs');
    }
    updatePlayerLikeState();
    updateActiveTrackRows();
  };
  dom.playerBtnLike?.addEventListener('click', toggleCurrentLike);
  dom.miniBtnLike?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCurrentLike();
  });
  dom.mobileModalBtnLike?.addEventListener('click', toggleCurrentLike);

  // Scrubber seeking
  const handleSeek = (slider) => {
    if (dom.audio.duration) {
      const targetTime = (slider.value / 100) * dom.audio.duration;
      dom.audio.currentTime = targetTime;
    }
  };
  dom.seekBar?.addEventListener('input', () => handleSeek(dom.seekBar));
  dom.mobileSeekBar?.addEventListener('input', () => handleSeek(dom.mobileSeekBar));

  // Volume slider
  dom.volumeSlider?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    state.volume = val;
    dom.audio.volume = val;
    dom.volumeFill.style.width = `${val * 100}%`;
    state.isMuted = val === 0;
  });

  // Mute button
  dom.btnMute?.addEventListener('click', () => {
    state.isMuted = !state.isMuted;
    if (state.isMuted) {
      dom.audio.volume = 0;
      dom.volumeFill.style.width = '0%';
    } else {
      dom.audio.volume = state.volume;
      dom.volumeFill.style.width = `${state.volume * 100}%`;
    }
  });

  // Queue toggle
  dom.btnToggleQueue?.addEventListener('click', () => {
    dom.queueDrawer.classList.toggle('open');
  });
  dom.btnMobileQueueToggle?.addEventListener('click', () => {
    dom.queueDrawer.classList.toggle('open');
  });
  dom.btnCloseQueue?.addEventListener('click', () => {
    dom.queueDrawer.classList.remove('open');
  });
  dom.btnClearQueue?.addEventListener('click', () => {
    state.queue = state.currentTrack ? [state.currentTrack] : [];
    state.queueIndex = 0;
    updateQueueDrawer();
    showToast('Queue cleared');
  });

  // Mobile Fullscreen Modal open/collapse
  dom.miniPlayerClickArea?.addEventListener('click', () => {
    dom.mobileNowPlayingModal.classList.add('open');
  });
  dom.btnCollapseMobileModal?.addEventListener('click', () => {
    dom.mobileNowPlayingModal.classList.remove('open');
  });

  // DEV-ONLY Preview Toggle Button
  dom.btnDevToggle?.addEventListener('click', async () => {
    const newState = !CONFIG.DEV_PREVIEW_MODE;
    toggleDevPreview(newState);
    updateDevBadge();
    showToast(newState ? 'DEV Preview ON (Sample songs)' : 'DEV Preview OFF (Google Drive Library)', 'success');
    await renderSidebarPlaylists();
    await renderCurrentView();
  });

  // Global Search input
  dom.globalSearchInput?.addEventListener('input', async (e) => {
    const query = e.target.value;
    dom.btnClearSearch.classList.toggle('hidden', !query);
    if (state.currentView !== 'search') {
      switchView('search');
    }
    handleSearch(query);
  });
  dom.btnClearSearch?.addEventListener('click', () => {
    dom.globalSearchInput.value = '';
    dom.btnClearSearch.classList.add('hidden');
    handleSearch('');
  });

  // Library inline search & sort
  dom.libraryFilterInput?.addEventListener('input', async (e) => {
    const q = e.target.value.toLowerCase();
    const tracks = await Library.getAllTracks();
    const filtered = tracks.filter((t) => (t.title || t.name).toLowerCase().includes(q));
    renderTrackTable(dom.libraryContentArea, filtered);
  });

  // Settings Modal open/close & Sync
  dom.btnSettings?.addEventListener('click', () => dom.settingsModal.classList.remove('hidden'));
  dom.btnCloseSettings?.addEventListener('click', () => dom.settingsModal.classList.add('hidden'));
  dom.btnSaveSettings?.addEventListener('click', () => handleDriveConnectAndSync());
  dom.btnSyncNow?.addEventListener('click', () => handleDriveConnectAndSync());

  // Dismiss context menu on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#trackContextMenu') && !e.target.closest('.row-menu-btn')) {
      hideTrackContextMenu();
    }
  });

  // Context Menu Action: Play Next
  dom.ctxPlayNext?.addEventListener('click', () => {
    if (!contextTrack) return;
    hideTrackContextMenu();
    if (state.queue.length === 0) {
      state.queue = [contextTrack];
      state.queueIndex = 0;
    } else {
      state.queue.splice(state.queueIndex + 1, 0, contextTrack);
    }
    updateQueueDrawer();
    showToast(`"${contextTrack.title || contextTrack.name}" will play next`, 'success');
  });

  // Context Menu Action: Add to Queue
  dom.ctxAddToQueue?.addEventListener('click', () => {
    if (!contextTrack) return;
    hideTrackContextMenu();
    state.queue.push(contextTrack);
    updateQueueDrawer();
    showToast(`Added to queue`, 'success');
  });

  // Context Menu Action: Add to Playlist...
  dom.ctxAddToPlaylist?.addEventListener('click', async () => {
    if (!contextTrack) return;
    hideTrackContextMenu();
    openAddToPlaylistPicker(contextTrack);
  });

  // Context Menu Action: Remove from current Playlist
  dom.ctxRemoveFromPlaylist?.addEventListener('click', async () => {
    if (!contextTrack || !state.activePlaylist) return;
    hideTrackContextMenu();
    await Library.removeTrackFromPlaylist(state.activePlaylist.id, contextTrack.id);
    showToast(`Removed from "${state.activePlaylist.name}"`);
    const updatedPl = await Library.getPlaylist(state.activePlaylist.id);
    renderPlaylistDetailView(updatedPl);
  });

  // Context Menu Action: Toggle Like
  dom.ctxToggleLike?.addEventListener('click', async () => {
    if (!contextTrack) return;
    hideTrackContextMenu();
    const isLiked = await Library.toggleFavorite(contextTrack.id);
    if (isLiked) {
      state.favorites.add(contextTrack.id);
      showToast('Saved to Liked Songs', 'success');
    } else {
      state.favorites.delete(contextTrack.id);
      showToast('Removed from Liked Songs');
    }
    updatePlayerLikeState();
    updateActiveTrackRows();
    if (state.currentView === 'liked') renderLikedSongsView();
  });

  // Add to Playlist Picker Modal Close
  dom.btnCloseAddToPlaylist?.addEventListener('click', () => {
    dom.addToPlaylistModal.classList.add('hidden');
  });
  dom.btnPickerNewPlaylist?.addEventListener('click', () => {
    dom.addToPlaylistModal.classList.add('hidden');
    openPlaylistModal(null);
  });

  // Create Playlist shortcut in sidebar
  document.getElementById('btnCreatePlaylist')?.addEventListener('click', () => {
    openPlaylistModal(null);
  });

  // Rename Playlist in detail view
  dom.btnPlaylistRename?.addEventListener('click', () => {
    if (state.activePlaylist) openPlaylistModal(state.activePlaylist);
  });

  // Delete Playlist in detail view
  dom.btnPlaylistDelete?.addEventListener('click', async () => {
    if (!state.activePlaylist) return;
    const confirmDelete = confirm(`Are you sure you want to delete playlist "${state.activePlaylist.name}"?`);
    if (confirmDelete) {
      await Library.deletePlaylist(state.activePlaylist.id);
      showToast(`Deleted "${state.activePlaylist.name}"`);
      await renderSidebarPlaylists();
      switchView('library', { tab: 'playlists' });
    }
  });

  // Playlist Create/Rename Modal controls
  dom.btnClosePlaylistModal?.addEventListener('click', () => dom.playlistModal.classList.add('hidden'));
  dom.btnCancelPlaylist?.addEventListener('click', () => dom.playlistModal.classList.add('hidden'));
  dom.btnConfirmPlaylist?.addEventListener('click', async () => {
    const name = dom.inputPlaylistName.value.trim();
    if (!name) return;

    if (editingPlaylist) {
      // Renaming
      await Library.renamePlaylist(editingPlaylist.id, name);
      dom.playlistModal.classList.add('hidden');
      showToast(`Renamed to "${name}"`, 'success');
      await renderSidebarPlaylists();
      const updatedPl = await Library.getPlaylist(editingPlaylist.id);
      renderPlaylistDetailView(updatedPl);
    } else {
      // Creating
      const newPl = await Library.createPlaylist(name);
      dom.playlistModal.classList.add('hidden');
      showToast(`Created playlist "${name}"`, 'success');
      await renderSidebarPlaylists();
      switchView('playlist', newPl);
    }
  });

  // Search Filter Pills
  document.querySelectorAll('.filter-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      handleSearch(dom.globalSearchInput.value, pill.dataset.filter);
    });
  });

  // Library Sort Selector
  dom.librarySortSelect?.addEventListener('change', async (e) => {
    const sortBy = e.target.value;
    const allTracks = await Library.getAllTracks();
    const sorted = Library.sortTracks(allTracks, sortBy);
    renderTrackTable(dom.libraryContentArea, sorted);
  });

  // Connect Drive button in sidebar
  dom.btnConnectDrive?.addEventListener('click', () => {
    if (!Drive.isDriveConnected()) {
      handleDriveConnectAndSync();
    } else {
      dom.settingsModal.classList.remove('hidden');
    }
  });
}

/**
 * Main Google Drive connection & sync coordinator
 */
async function handleDriveConnectAndSync() {
  const clientId = dom.inputClientId.value.trim();
  const folderLink = dom.inputFolderLink.value.trim();

  if (!clientId) {
    dom.settingsModal.classList.remove('hidden');
    dom.inputClientId.focus();
    showToast('Please enter your Google OAuth Client ID in Settings first.', 'error');
    return;
  }

  if (!folderLink) {
    dom.settingsModal.classList.remove('hidden');
    dom.inputFolderLink.focus();
    showToast('Please enter your Google Drive Folder Link or Folder ID.', 'error');
    return;
  }

  saveConfig(clientId, folderLink);

  try {
    updateDriveStatus('syncing', 'Connecting...');
    if (dom.syncStatusText) dom.syncStatusText.textContent = 'Authenticating with Google...';

    // 1. Google OAuth popup (if not yet authenticated)
    if (!Drive.isDriveConnected()) {
      await Drive.authenticateGoogleDrive();
    }

    // 2. Disable DEV preview mode so real Google Drive songs take over
    toggleDevPreview(false);
    updateDevBadge();

    updateDriveStatus('syncing', 'Scanning folder...');
    if (dom.syncStatusText) dom.syncStatusText.textContent = 'Scanning audio files in folder & subfolders...';

    // 3. Scan Drive folder recursively and sync additions + deletions
    const { tracks, stats } = await Drive.scanDriveMusicFolder((progress) => {
      if (dom.syncStatusText) dom.syncStatusText.textContent = progress.message;
      if (dom.syncTracksCount) dom.syncTracksCount.textContent = `${progress.count || 0} songs`;
    });

    updateDriveStatus('connected', 'Google Drive Connected');
    if (dom.syncStatusText) dom.syncStatusText.textContent = 'Sync complete';
    if (dom.syncTracksCount) dom.syncTracksCount.textContent = `${tracks.length} songs`;

    dom.settingsModal.classList.add('hidden');

    if (tracks.length === 0) {
      showToast('Connected! No audio files found in that folder. Check folder contents.', 'info');
    } else {
      let toastMsg = `Synced ${tracks.length} song${tracks.length === 1 ? '' : 's'} from Google Drive!`;
      if (stats && stats.deleted > 0) {
        toastMsg += ` (${stats.deleted} deleted song(s) cleaned up)`;
      }
      showToast(toastMsg, 'success');
    }

    // 4. Re-render UI with real songs
    await renderSidebarPlaylists();
    await renderCurrentView();

    // 5. Start background auto-sync polling every 30s
    Drive.startAutoSync(async (updatedTracks, diff) => {
      console.log('[Musify] Auto-sync finished, tracks in library:', updatedTracks.length);
      await renderSidebarPlaylists();
      await renderCurrentView();
      if (diff && (diff.added > 0 || diff.deleted > 0)) {
        let msg = 'Google Drive library updated:';
        if (diff.added > 0) msg += ` +${diff.added} added`;
        if (diff.deleted > 0) msg += ` -${diff.deleted} deleted`;
        showToast(msg, 'info');
      }
    });

  } catch (err) {
    console.error('[Musify Sync Error]', err);
    updateDriveStatus('disconnected', 'Google Drive Offline');
    if (dom.syncStatusText) dom.syncStatusText.textContent = `Error: ${err.message}`;
    showToast(err.message || 'Sync failed. Please check credentials.', 'error');
  }
}

function updateDriveStatus(status, label) {
  if (dom.driveStatusDot) {
    dom.driveStatusDot.className = `status-dot ${status}`;
  }
  if (dom.driveStatusLabel) {
    dom.driveStatusLabel.textContent = label;
  }
  if (dom.btnConnectDriveText) {
    dom.btnConnectDriveText.textContent = status === 'connected' ? 'Drive Connected' : 'Connect Drive';
  }
}

function openPlaylistModal(playlist = null) {
  editingPlaylist = playlist;
  if (playlist) {
    dom.playlistModalTitle.textContent = 'Rename Playlist';
    dom.inputPlaylistName.value = playlist.name;
    dom.btnConfirmPlaylist.textContent = 'Save';
  } else {
    dom.playlistModalTitle.textContent = 'Create Playlist';
    dom.inputPlaylistName.value = '';
    dom.btnConfirmPlaylist.textContent = 'Create';
  }
  dom.playlistModal.classList.remove('hidden');
  dom.inputPlaylistName.focus();
}

async function openAddToPlaylistPicker(track) {
  const playlists = await Library.getPlaylists();
  const label = document.getElementById('addToPlaylistSongLabel');
  if (label) label.textContent = `Add "${track.title || track.name}" to:`;

  if (playlists.length === 0) {
    dom.playlistPickerList.innerHTML = `<p class="queue-empty-text">No playlists created yet.</p>`;
  } else {
    dom.playlistPickerList.innerHTML = playlists
      .map(
        (pl) => `
        <div class="playlist-picker-item" data-pl-id="${pl.id}">
          <div class="playlist-picker-art" style="background:${pl.color || '#1db954'};">📁</div>
          <div class="playlist-picker-name">${escapeHtml(pl.name)}</div>
        </div>
      `
      )
      .join('');

    dom.playlistPickerList.querySelectorAll('.playlist-picker-item').forEach((item) => {
      item.addEventListener('click', async () => {
        const plId = item.dataset.plId;
        const success = await Library.addTrackToPlaylist(plId, track.id);
        dom.addToPlaylistModal.classList.add('hidden');
        const targetPl = playlists.find((p) => p.id === plId);
        if (success) {
          showToast(`Added to "${targetPl.name}"`, 'success');
        } else {
          showToast(`Song already in "${targetPl.name}"`);
        }
        await renderSidebarPlaylists();
      });
    });
  }

  dom.addToPlaylistModal.classList.remove('hidden');
}

async function handleSearch(query, filter = 'all') {
  if (!query || !query.trim()) {
    dom.searchEmptyPrompt.classList.remove('hidden');
    dom.searchResultsList.classList.add('hidden');
    return;
  }

  const allResults = await Library.searchTracks(query);
  const q = query.trim().toLowerCase();

  let filteredResults = allResults;
  if (filter === 'tracks') {
    filteredResults = allResults.filter((t) => (t.title || t.name || '').toLowerCase().includes(q));
  } else if (filter === 'artists') {
    filteredResults = allResults.filter((t) => (t.artist || '').toLowerCase().includes(q));
  } else if (filter === 'albums') {
    filteredResults = allResults.filter((t) => (t.album || '').toLowerCase().includes(q));
  }

  dom.searchEmptyPrompt.classList.add('hidden');
  dom.searchResultsList.classList.remove('hidden');

  if (filteredResults.length === 0) {
    dom.searchResultsRows.innerHTML = `<div class="search-empty-state"><p>No results found for "${escapeHtml(query)}"</p></div>`;
  } else {
    dom.searchResultsRows.innerHTML = generateTrackRowsHtml(filteredResults);
    attachTrackRowListeners(dom.searchResultsRows, filteredResults);
  }
}

function updateDevBadge() {
  if (CONFIG.DEV_PREVIEW_MODE) {
    dom.btnDevToggle?.classList.remove('off');
    if (dom.devToggleText) dom.devToggleText.textContent = 'DEV-PREVIEW: ON';
  } else {
    dom.btnDevToggle?.classList.add('off');
    if (dom.devToggleText) dom.devToggleText.textContent = 'DEV-PREVIEW: OFF';
  }
}

// ==========================================================================
// KEYBOARD SHORTCUTS
// ==========================================================================
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ignore keyboard shortcuts when typing in an input field
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.code === 'ArrowRight') {
      // Seek forward 5s
      e.preventDefault();
      dom.audio.currentTime = Math.min(dom.audio.duration || 0, dom.audio.currentTime + 5);
    } else if (e.code === 'ArrowLeft') {
      // Seek backward 5s
      e.preventDefault();
      dom.audio.currentTime = Math.max(0, dom.audio.currentTime - 5);
    } else if (e.code === 'ArrowUp') {
      // Volume up 10%
      e.preventDefault();
      const newVol = Math.min(1, dom.audio.volume + 0.1);
      dom.volumeSlider.value = newVol;
      dom.volumeSlider.dispatchEvent(new Event('input'));
    } else if (e.code === 'ArrowDown') {
      // Volume down 10%
      e.preventDefault();
      const newVol = Math.max(0, dom.audio.volume - 0.1);
      dom.volumeSlider.value = newVol;
      dom.volumeSlider.dispatchEvent(new Event('input'));
    }
  });
}

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
export function showToast(message, type = 'info') {
  if (!dom.toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3000);
}

// Simple HTML escaping helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
