// Service worker pro Chrome Extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'download') {
    chrome.downloads.download({
      url: request.url,
      filename: request.filename,
      saveAs: false,  // Automatické stahování bez dialogu
      conflictAction: 'uniquify'  // Automaticky přejmenovat při konfliktu
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Download error:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError });
      } else {
        console.log('Download started with ID:', downloadId);
        sendResponse({ success: true, downloadId: downloadId });
      }
    });
    return true;  // Důležité pro async response
  }
  
  if (request.action === 'openPopup') {
    // Otevřít popup extension
    chrome.action.openPopup((result) => {
      if (chrome.runtime.lastError) {
        // Pokud se nepodařilo otevřít (např. už je otevřený), zkusit aktivovat tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.action.setBadgeText({ text: '!', tabId: tabs[0].id });
            setTimeout(() => {
              chrome.action.setBadgeText({ text: '', tabId: tabs[0].id });
            }, 3000);
          }
        });
      }
    });
  }
  
  // ===== SYNCHRONIZACE PŘIHLÁŠENÍ S GALERIÍ =====
  if (request.action === 'syncLogin') {
    // Galerie se přihlásila - synchronizovat do extension
    console.log('🔄 Syncing login from gallery:', request.email);
    chrome.storage.sync.set({ 
      apiToken: request.token,
      refreshToken: request.refreshToken,
      userEmail: request.email,
      apiUrl: request.apiUrl || 'https://svag.pro'
    }, () => {
      // Vymazat pendingEmail (pokud uživatel čekal na OTP)
      chrome.storage.sync.remove(['pendingEmail'], () => {
        console.log('✅ Login synced to extension');
        sendResponse({ success: true });
      });
    });
    return true;
  }
  
  if (request.action === 'syncLogout') {
    // Galerie se odhlásila - synchronizovat do extension
    console.log('🔄 Syncing logout from gallery');
    chrome.storage.sync.remove(['apiToken', 'refreshToken', 'userEmail'], () => {
      console.log('✅ Logout synced to extension');
      sendResponse({ success: true });
    });
    return true;
  }
});

// Poslouchat na změny v chrome.storage a notifikovat galerii a popup
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    // Když se změní apiToken nebo userEmail v extension
    if (changes.apiToken || changes.userEmail) {
      const isLogin = changes.apiToken && changes.apiToken.newValue;
      const isLogout = changes.apiToken && !changes.apiToken.newValue;
      
      if (isLogin || isLogout) {
        console.log(isLogin ? '🔄 Extension login detected, notifying gallery' : '🔄 Extension logout detected, notifying gallery');
        
        // 1. Najít všechny taby s galerií a poslat jim zprávu
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            if (tab.url && tab.url.includes('/gallery')) {
              chrome.tabs.sendMessage(tab.id, {
                action: isLogin ? 'extensionLogin' : 'extensionLogout',
                token: changes.apiToken?.newValue,
                email: changes.userEmail?.newValue
              }).catch(() => {
                // Tab možná nemá content script, ignorovat
              });
            }
          });
        });
        
        // 2. Notifikovat popup (pokud je otevřený) pomocí runtime message
        chrome.runtime.sendMessage({
          action: 'storageChanged',
          changes: changes
        }).catch(() => {
          // Popup není otevřený, ignorovat
          console.log('⚠️ Popup is not open');
        });
        
        // 3. Nastavit badge na extension ikonu jako vizuální indikátor
        if (isLogin) {
          chrome.action.setBadgeText({ text: '✓' });
          chrome.action.setBadgeBackgroundColor({ color: '#22f43e' });
          
          // Odstranit badge po 3 sekundách
          setTimeout(() => {
            chrome.action.setBadgeText({ text: '' });
          }, 3000);
        }
      }
    }
  }
});

console.log('svag background service worker loaded');

