// Quick fix: Oprava API URL v chrome.storage
// Spustit v popup console (Inspect popup)

console.log('🔧 Fixing API URL...');

// Načíst současnou konfiguraci
chrome.storage.sync.get(['apiUrl', 'apiToken', 'userEmail'], (result) => {
  console.log('📋 Current storage:', result);
  
  // Opravit API URL
  const correctUrl = 'https://svag.pro';
  
  if (result.apiUrl !== correctUrl) {
    console.log('⚠️  Wrong API URL:', result.apiUrl);
    console.log('✅ Fixing to:', correctUrl);
    
    chrome.storage.sync.set({ apiUrl: correctUrl }, () => {
      console.log('✅ API URL fixed!');
      console.log('🔄 Please reload the popup');
    });
  } else {
    console.log('✅ API URL is already correct');
  }
});

