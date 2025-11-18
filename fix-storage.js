// Quick fix script - spusťte v popup console

// 1. Vymazat všechno ze storage
chrome.storage.sync.clear(() => {
  console.log('✅ Storage cleared');
  
  // 2. Nastavit správnou API URL
  chrome.storage.sync.set({ 
    apiUrl: 'https://svag.pro' 
  }, () => {
    console.log('✅ API URL set to https://svag.pro (bez www)');
    console.log('👉 Nyní se odhlaste a znovu přihlaste v popup');
  });
});

