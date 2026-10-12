// ==========================================================================
// MUSIFY — Application Configuration
// ==========================================================================
// NOTE: Only public identifiers belong here. Never commit client secrets,
// passwords, or private API keys to this file or repository.
// ==========================================================================

export const CONFIG = {
  // Google Cloud OAuth 2.0 Client ID (Type: Web Application)
  CLIENT_ID: localStorage.getItem('musify_client_id') || '',

  // Your Google Drive Music Folder ID or link
  // e.g., "1a2b3c4d5e6f7g8h9i0..."
  FOLDER_ID: localStorage.getItem('musify_folder_id') || '',

  // DEV-ONLY Preview Mode:
  // Defaults to false if client_id or folder_id is already configured,
  // otherwise true to show demo tracks on initial preview.
  DEV_PREVIEW_MODE: localStorage.getItem('musify_dev_preview') !== null
    ? localStorage.getItem('musify_dev_preview') === 'true'
    : !(localStorage.getItem('musify_client_id') && localStorage.getItem('musify_folder_id')),

  // Google OAuth Read-Only Scope
  DRIVE_SCOPE: 'https://www.googleapis.com/auth/drive.readonly',

  // Auto-sync interval in milliseconds (30 seconds)
  SYNC_INTERVAL_MS: 30000,
};

/**
 * Save configuration overrides to localStorage
 */
export function saveConfig(newClientId, newFolderId) {
  if (newClientId !== undefined) {
    CONFIG.CLIENT_ID = newClientId.trim();
    localStorage.setItem('musify_client_id', CONFIG.CLIENT_ID);
  }
  if (newFolderId !== undefined) {
    // Extract folder ID if the user pasted a full Google Drive link
    const cleanedFolderId = extractDriveFolderId(newFolderId);
    CONFIG.FOLDER_ID = cleanedFolderId;
    localStorage.setItem('musify_folder_id', CONFIG.FOLDER_ID);
  }
}

/**
 * Helper: extracts Google Drive folder ID from a URL or raw ID string
 */
export function extractDriveFolderId(input) {
  if (!input) return '';
  const trimmed = input.trim();
  // Check if it's a URL like https://drive.google.com/drive/folders/1ABC...
  const match = trimmed.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Check if it's a URL like https://drive.google.com/open?id=1ABC...
  const idMatch = trimmed.match(/id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }
  // Otherwise assume it's already a raw ID
  return trimmed;
}

/**
 * Toggle DEV preview mode on or off
 */
export function toggleDevPreview(enabled) {
  CONFIG.DEV_PREVIEW_MODE = enabled;
  localStorage.setItem('musify_dev_preview', enabled ? 'true' : 'false');
}
