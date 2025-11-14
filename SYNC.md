# 🔄 Gallery & Extension Synchronization

This document describes how the authentication synchronization works between the Chrome Extension and the Web Gallery.

## 🎯 Overview

The extension and gallery share authentication state in real-time:
- When you log in to the **extension**, the **gallery** automatically logs in
- When you log in to the **gallery**, the **extension** automatically logs in
- When you log out from **either one**, both log out automatically

## 🔧 How It Works

### Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Extension     │         │   Background    │         │   Web Gallery   │
│    Popup        │◄───────►│    Service      │◄───────►│    (Browser)    │
│                 │         │    Worker       │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
        │                           │                           │
        │  chrome.storage.sync      │   chrome.tabs.          │  localStorage
        │  (apiToken, userEmail)    │   sendMessage           │  (token, email)
        │                           │                           │
```

### Components

1. **`background.js`** - Centrální hub pro synchronizaci
   - Poslouchá zprávy z galerie (`syncLogin`, `syncLogout`)
   - Sleduje změny v `chrome.storage.sync`
   - Notifikuje otevřené galerie taby o změnách

2. **`Gallery/gallery-sync.js`** - Content script pro galerii
   - Běží na všech `/gallery*` stránkách
   - Přeposílá zprávy mezi background scriptem a gallery JS

3. **`Gallery/script.js`** - Galerie logika
   - Poslouchá na zprávy přes `window.postMessage`
   - Notifikuje extension při login/logout

4. **`popup.js`** - Extension popup
   - Ukládá credentials do `chrome.storage.sync`
   - Notifikuje galerie taby při logout

## 📋 Flow Diagrams

### Login in Extension → Gallery Sync

```
1. User logs in to Extension Popup
   ↓
2. popup.js saves to chrome.storage.sync
   - apiToken: "..."
   - userEmail: "user@example.com"
   ↓
3. background.js detects storage change (onChanged listener)
   ↓
4. background.js finds all gallery tabs
   ↓
5. Sends message to gallery-sync.js (extensionLogin)
   ↓
6. gallery-sync.js posts message to window
   ↓
7. Gallery/script.js receives message
   ↓
8. Saves to localStorage and reloads/redirects
   ✓ Gallery is now logged in!
```

### Login in Gallery → Extension Sync

```
1. User logs in to Web Gallery
   ↓
2. Gallery/script.js receives auth token
   ↓
3. Saves to localStorage
   ↓
4. Sends chrome.runtime.sendMessage (syncLogin)
   ↓
5. background.js receives message
   ↓
6. Saves to chrome.storage.sync
   - apiToken: "..."
   - userEmail: "user@example.com"
   ✓ Extension is now logged in!
```

### Logout from Extension → Gallery Sync

```
1. User clicks Logout in Extension Popup
   ↓
2. popup.js removes from chrome.storage.sync
   ↓
3. popup.js sends message to all gallery tabs (extensionLogout)
   ↓
4. gallery-sync.js receives and forwards to window
   ↓
5. Gallery/script.js removes from localStorage
   ↓
6. Redirects to /gallery/login
   ✓ Both logged out!
```

### Logout from Gallery → Extension Sync

```
1. User clicks Logout in Web Gallery
   ↓
2. Gallery/script.js removes from localStorage
   ↓
3. Sends chrome.runtime.sendMessage (syncLogout)
   ↓
4. background.js receives message
   ↓
5. Removes from chrome.storage.sync
   ✓ Both logged out!
```

## 🔐 Security

- **Extension → Gallery**: Uses Chrome's messaging API (secure)
- **Gallery → Extension**: Uses Chrome Extension API (requires extension to be installed)
- **Storage**:
  - Extension: `chrome.storage.sync` (synced across devices)
  - Gallery: `localStorage` (per-browser, per-domain)
- Tokens are JWT tokens with expiration
- No sensitive data stored in plain text

## 🌐 Supported URLs

The sync content script runs on:
- `http://localhost:3000/gallery*` (development)
- `https://*/gallery*` (production - any HTTPS domain)

**Important**: Update `manifest.json` with your production URL!

## 🐛 Debugging

### Check if sync is working:

1. **In Extension**:
   - Open Extension Popup
   - Open Developer Tools (right-click → Inspect)
   - Look for console logs: `🔄 Extension login detected`

2. **In Gallery**:
   - Open Gallery in browser
   - Open Developer Tools (F12)
   - Look for console logs: `📡 Gallery sync content script loaded`

3. **In Background**:
   - Go to `chrome://extensions/`
   - Find "svag"
   - Click "Service worker" link
   - Look for logs: `🔄 Syncing login from gallery`

### Common Issues

**Gallery doesn't receive login:**
- Check if content script is loaded: Look for `📡 Gallery sync content script loaded`
- Check URL matches in `manifest.json`
- Reload extension: `chrome://extensions/` → Reload

**Extension doesn't receive login:**
- Check if gallery is using HTTPS or localhost
- Open background service worker console
- Look for error messages

**Logout doesn't sync:**
- Check if both tabs are open
- Verify chrome.runtime.sendMessage is not throwing errors
- Check background service worker logs

## 📝 Notes

- Sync only works when extension is **installed and enabled**
- Gallery works independently without extension (no sync)
- Multiple gallery tabs will all sync simultaneously
- First login requires reload (expected behavior)
- Storage is synced across devices (Chrome Sync)

## 🔄 Future Improvements

- [ ] Add visual indicator when sync happens
- [ ] Add retry logic for failed syncs
- [ ] Add sync status in settings
- [ ] Support for multiple accounts
- [ ] Offline sync queue

