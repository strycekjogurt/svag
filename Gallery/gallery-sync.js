// Content script pro synchronizaci mezi extension a galerií
console.log('📡 Gallery sync content script loaded');

// Sledovat localStorage pro automatickou synchronizaci
let lastToken = localStorage.getItem('token');
let lastEmail = localStorage.getItem('userEmail');

// Kontrolovat localStorage každých 100ms
setInterval(() => {
  const currentToken = localStorage.getItem('token');
  const currentEmail = localStorage.getItem('userEmail');
  
  // Pokud se token změnil a je nový
  if (currentToken && currentEmail && currentToken !== lastToken) {
    console.log('🔍 Detected new token in localStorage, syncing to extension');
    lastToken = currentToken;
    lastEmail = currentEmail;
    
    // Synchronizovat do extension
    chrome.runtime.sendMessage({
      action: 'syncLogin',
      token: currentToken,
      email: currentEmail,
      apiUrl: window.location.origin
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Error syncing from localStorage:', chrome.runtime.lastError.message);
        return;
      }
      if (response && response.success) {
        console.log('✅ Auto-synced login from localStorage to extension');
      }
    });
  }
  
  // Pokud token zmizel (logout)
  if (!currentToken && lastToken) {
    console.log('🔍 Detected token removal, syncing logout to extension');
    lastToken = null;
    lastEmail = null;
    
    chrome.runtime.sendMessage({
      action: 'syncLogout'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Error syncing logout:', chrome.runtime.lastError.message);
        return;
      }
      if (response && response.success) {
        console.log('✅ Auto-synced logout to extension');
      }
    });
  }
}, 100);

// Poslouchat na zprávy z background scriptu (extension -> gallery)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Gallery received message from extension:', request.action);
  
  if (request.action === 'extensionLogin' || request.action === 'extensionLogout') {
    // Předat zprávu do window (aby ji viděl gallery script.js)
    window.postMessage({
      source: 'svag-extension',
      action: request.action,
      token: request.token,
      email: request.email
    }, '*');
    
    sendResponse({ success: true });
  }
  
  return true;
});

// Poslouchat na zprávy Z window (gallery -> extension)
window.addEventListener('message', (event) => {
  // Kontrola, že zpráva je od galerie
  if (event.data && event.data.source === 'svag-gallery') {
    console.log('📤 Gallery sync forwarding to extension:', event.data.action);
    
    if (event.data.action === 'galleryLogout') {
      // Přeposlat do background scriptu
      chrome.runtime.sendMessage({
        action: 'syncLogout'
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Error syncing logout:', chrome.runtime.lastError.message);
          return;
        }
        if (response && response.success) {
          console.log('✅ Logout synced to extension');
        }
      });
    }
    
    // Když se galerie přihlásí, synchronizovat do extension
    if (event.data.action === 'galleryLogin') {
      console.log('🔄 Syncing login to extension:', {
        email: event.data.email,
        hasToken: !!event.data.token
      });
      
      chrome.runtime.sendMessage({
        action: 'syncLogin',
        token: event.data.token,
        email: event.data.email,
        apiUrl: event.data.apiUrl
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Error syncing login:', chrome.runtime.lastError.message);
          return;
        }
        if (response && response.success) {
          console.log('✅ Login synced to extension successfully');
        } else {
          console.warn('⚠️ Login sync response:', response);
        }
      });
    }
  }
});

