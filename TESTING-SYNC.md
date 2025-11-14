# 🧪 Testing Gallery & Extension Sync

Quick guide to test the authentication synchronization.

## 📋 Prerequisites

1. Extension is loaded in Chrome (`chrome://extensions/`)
2. Backend server is running (`node server.js`)
3. You have a test account or can register

## 🧪 Test Scenarios

### ✅ Test 1: Login in Extension → Gallery Syncs

**Steps:**
1. Open Extension Popup (click extension icon)
2. If not logged in, enter your email and verify code
3. Once logged in, open new tab
4. Go to `http://localhost:3000/gallery`
5. **Expected**: Gallery should show you as logged in automatically

**Debug:**
- Open Console in Gallery (F12)
- Should see: `📡 Gallery sync content script loaded`
- Should see: `🔄 Extension logged in, syncing to gallery`

---

### ✅ Test 2: Login in Gallery → Extension Syncs

**Steps:**
1. Make sure you're logged out from extension
2. Open `http://localhost:3000/gallery/login`
3. Enter email and verify code
4. Once logged in, open Extension Popup
5. **Expected**: Extension should show you as logged in

**Debug:**
- Open Background Service Worker console:
  - Go to `chrome://extensions/`
  - Find "svag"
  - Click "Service worker"
- Should see: `🔄 Syncing login from gallery: your@email.com`
- Should see: `✅ Login synced to extension`

---

### ✅ Test 3: Logout from Extension → Gallery Syncs

**Steps:**
1. Make sure you're logged in both places
2. Keep Gallery tab open (`http://localhost:3000/gallery`)
3. Open Extension Popup
4. Click "Logout"
5. Switch to Gallery tab
6. **Expected**: Gallery should redirect to login page

**Debug:**
- Gallery console should show: `🔄 Extension logged out, syncing to gallery`

---

### ✅ Test 4: Logout from Gallery → Extension Syncs

**Steps:**
1. Make sure you're logged in both places
2. In Gallery, click "Logout" button (top right)
3. Open Extension Popup
4. **Expected**: Extension should show login form

**Debug:**
- Background Service Worker console should show:
  - `🔄 Syncing logout from gallery`
  - `✅ Logout synced to extension`

---

## 🔍 Troubleshooting

### Issue: Gallery sync not working

**Check:**
```javascript
// In Gallery console (F12)
typeof chrome !== 'undefined' && chrome.runtime
// Should return: true
```

If `false`, the content script is not loaded:
- Reload extension at `chrome://extensions/`
- Check manifest.json has correct URL patterns
- Make sure gallery URL matches patterns

---

### Issue: Extension sync not working

**Check:**
```javascript
// In Extension Popup console (right-click popup → Inspect)
chrome.storage.sync.get(['apiToken', 'userEmail'], (data) => {
  console.log('Storage:', data);
});
```

Should show your token and email.

---

### Issue: Background script errors

**Steps:**
1. Go to `chrome://extensions/`
2. Find "svag"
3. Click "Errors" button (if red)
4. Check what errors appear

---

## 📊 Expected Console Logs

### Extension Popup Console:
```
🚀 Popup initialized
📦 Loaded from storage: {apiToken: "...", userEmail: "..."}
✅ API URL from storage: http://localhost:3000
✅ User profile already exists
✅ Login synced to extension (when logging in from gallery)
```

### Gallery Console:
```
📡 Gallery sync content script loaded
🔄 Extension logged in, syncing to gallery (when logging in from extension)
🔄 Extension logged out, syncing to gallery (when logging out from extension)
✅ Login synced to extension (when logging in from gallery)
✅ Logout synced to extension (when logging out from gallery)
```

### Background Service Worker Console:
```
svag background service worker loaded
🔄 Extension login detected, notifying gallery
🔄 Syncing login from gallery: user@example.com
✅ Login synced to extension
🔄 Extension logout detected, notifying gallery
🔄 Syncing logout from gallery
✅ Logout synced to extension
```

---

## ✨ Success Criteria

All tests pass if:
- ✅ Login in one place immediately reflects in the other
- ✅ Logout in one place immediately logs out the other
- ✅ No errors in any console
- ✅ User experience is seamless

---

## 🚀 Advanced Testing

### Test Multiple Tabs:
1. Open 3 Gallery tabs
2. Login in Extension
3. **Expected**: All 3 gallery tabs should sync

### Test Cross-Window:
1. Open Gallery in one Chrome window
2. Open Extension popup in another Chrome window
3. Test login/logout sync
4. **Expected**: Works across windows

### Test After Extension Reload:
1. Login to both
2. Reload extension at `chrome://extensions/`
3. **Expected**: Still logged in (storage persists)

---

## 📝 Notes

- First sync may take 100-500ms
- Gallery page may reload after sync (expected)
- Extension popup won't auto-refresh (close and reopen)
- Background worker may sleep and wake up (normal)

