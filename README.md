# 🎵 Musify — Your Personal Music Cloud

> A premium, Spotify-inspired, completely ad-free web player that streams your songs directly from your personal Google Drive folder without downloading them to your machine.

---

## ✨ Features

- **Direct Google Drive Streaming:** Intercepts audio stream requests with Range headers using a background Service Worker. Listen and scrub through your tracks without downloading files.
- **100% Ad-Free & Tracker-Free:** Zero ads, zero third-party trackers, zero analytics.
- **Spotify Dark Aesthetic:** Deep dark theme (`#121212`), smooth transitions, responsive mobile layout, animated equalizer bars, and dynamic header gradients matching your album art.
- **ID3 Album Artwork Extraction:** Reads embedded artwork and song metadata directly from files via `jsmediatags` without downloading the full file.
- **Mobile PWA Ready:** Mini-player, fullscreen now-playing sheet, bottom tab bar, and installable on iOS/Android via "Add to Home Screen".
- **Playlists & Favourites:** Create, rename, delete playlists, like songs, and track your last 50 recently played tracks (stored in local IndexedDB keyed by Google Drive file ID).
- **Auto-Sync:** Periodically checks your Drive folder for added, deleted, or renamed songs and updates the library automatically.
- **Keyboard Shortcuts:**
  - <kbd>Space</kbd> : Play / Pause
  - <kbd>←</kbd> / <kbd>→</kbd> : Seek backward / forward 5s
  - <kbd>↑</kbd> / <kbd>↓</kbd> : Volume up / down 10%

---

## 🚀 Beginner Setup Guide (Google Drive Integration)

To connect Musify to your Google Drive, you only need **one thing**: a public Google OAuth **Client ID** (never a password or secret key!). Follow these simple steps:

### Step 1: Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Log in with your Google account.
3. Click the project dropdown at the top left and click **"New Project"**.
4. Name it **"Musify"** and click **Create**.

---

### Step 2: Enable the Google Drive API
1. In your new project, search for **"Google Drive API"** in the top search bar.
2. Click on **Google Drive API** and click the blue **"Enable"** button.

---

### Step 3: Configure the OAuth Consent Screen
1. In the left sidebar, click **APIs & Services ➔ OAuth consent screen**.
2. Select **External** and click **Create**.
3. Fill in the required fields:
   - **App name:** `Musify`
   - **User support email:** (select your Gmail)
   - **Developer contact email:** (enter your Gmail)
4. Click **Save and Continue**.
5. On the **Scopes** page, click **Add or Remove Scopes**:
   - Filter or find `https://www.googleapis.com/auth/drive.readonly` (read-only access to your Drive files).
   - Select it and click **Update**, then **Save and Continue**.
6. On the **Test users** page, click **+ Add Users**:
   - **IMPORTANT:** Enter your own Google email address (the one where your music is stored!).
   - Click **Save and Continue**.

---

### Step 4: Create an OAuth Client ID
1. In the left sidebar, click **Credentials**.
2. Click **+ Create Credentials ➔ OAuth client ID**.
3. Under **Application type**, choose **Web application**.
4. Set the **Name** to `Musify Web Client`.
5. Under **Authorized JavaScript origins**, click **+ Add URI** and add:
   - `http://localhost:8080`
   - *(If deploying online, also add your Netlify/Vercel/GitHub Pages URL here, e.g. `https://my-musify.vercel.app`)*
6. Click **Create**.
7. Copy the generated **Client ID** (it looks like `123456789-abcdefg.apps.googleusercontent.com`).
   > ⚠️ **Note:** You do NOT need the Client Secret. Musify operates purely client-side with public tokens!

---

### Step 5: Connect Your Drive Folder in Musify
1. Go to your [Google Drive](https://drive.google.com/) and find the folder containing your music.
2. Copy the folder URL from your browser address bar:
   - e.g. `https://drive.google.com/drive/folders/1ABCxyz...`
3. In Musify, click the **Settings (gear) icon** in the top-right (or click **"Connect Drive"** in the sidebar).
4. Paste your **Drive Folder Link or ID**.
5. Paste your **OAuth Client ID**.
6. Click **"Save & Connect"**.
7. Google will show a standard one-click permission popup. Choose your account and click **Allow**.
8. Musify will automatically scan your folder and subfolders, pull all audio tracks, and display them in your library!

---

## 💻 Running Locally

Because Musify uses browser ES Modules and Service Workers, it must be served over `http://localhost`:

### Option A: Using Python (Recommended)
```bash
cd c:\Users\pradn\OneDrive\Desktop\musify
python -m http.server 8080
```
Then open `http://localhost:8080` in Chrome, Edge, or Brave.

### Option B: Using VS Code Live Server
Right-click `index.html` in VS Code and select **"Open with Live Server"**.

---

## 🌐 Free Cloud Deployment (Access from Anywhere)

You can host Musify 100% free with HTTPS so you can listen on your smartphone:

1. **Vercel or Netlify:**
   - Drag and drop this folder into [Netlify Drop](https://app.netlify.com/drop) or import from GitHub on Vercel.
2. **GitHub Pages:**
   - Push this repo to GitHub and enable GitHub Pages under **Repository Settings ➔ Pages**.
3. **Update Google Cloud Origins:**
   - Copy your new live HTTPS URL (e.g., `https://my-musify.netlify.app`).
   - Go back to [Google Cloud Console ➔ Credentials](https://console.cloud.google.com/apis/credentials).
   - Edit your OAuth Client ID and add your new URL to **Authorized JavaScript origins**.

---

## 📱 Install as a Mobile App (PWA)

Once hosted over HTTPS:
- **iPhone (Safari):** Tap the **Share** button ➔ tap **"Add to Home Screen"**.
- **Android (Chrome):** Tap the **3-dots menu** ➔ tap **"Install app"** or **"Add to Home Screen"**.

Musify will open full-screen without browser address bars just like a native music app!
