// DOM Elements
const previewEditor = document.getElementById('previewEditor');
const previewActions = document.getElementById('previewActions');
const switchBtn = document.getElementById('switchBtn');
const colorButtons = document.querySelectorAll('.color-btn');

const loginForm = document.getElementById('loginForm');
const loggedIn = document.getElementById('loggedIn');
const emailStep = document.getElementById('emailStep');
const codeStep = document.getElementById('codeStep');

const emailInput = document.getElementById('email');
const sendBtn = document.getElementById('sendBtn');
const verifyCodeBtn = document.getElementById('verifyCodeBtn');
const resendEmailLink = document.getElementById('resendEmailLink');

const codeDigits = Array.from(document.querySelectorAll('.code-digit'));

const openGalleryBtn = document.getElementById('openGalleryBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userEmail = document.getElementById('userEmail');
const iconsList = document.getElementById('iconsList');
const galleryLimit = document.getElementById('galleryLimit');
const limitText = document.getElementById('limitText');

// API URL - načte se z chrome.storage nebo použije default
let apiUrl = 'https://svag.vercel.app';

// State
let currentScheme = 'white-black';
let currentEmail = '';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Popup initialized');
  
  // Load saved settings
  const result = await chrome.storage.sync.get([
    'apiToken', 
    'userEmail', 
    'colorScheme', 
    'buttonOrder', 
    'apiUrl',
    'pendingEmail'   // Email čekající na OTP kód
  ]);
  console.log('📦 Loaded from storage:', result);
  
  // Nastavit API URL z storage nebo použít default
  if (result.apiUrl) {
    apiUrl = result.apiUrl;
    console.log('✅ API URL from storage:', apiUrl);
  } else {
    const apiUrlInput = document.getElementById('apiUrl');
    if (apiUrlInput && apiUrlInput.value) {
      apiUrl = apiUrlInput.value;
      await chrome.storage.sync.set({ apiUrl: apiUrl });
      console.log('✅ API URL from HTML input:', apiUrl);
    } else {
      console.log('⚠️ Using default API URL:', apiUrl);
    }
  }
  
  if (result.apiToken && result.userEmail) {
    // User is logged in
    console.log('✅ User is logged in:', result.userEmail);
    showLoggedIn(result.userEmail, result.apiToken);
  } else if (result.pendingEmail) {
    // Obnovit code step (čeká na OTP kód)
    console.log('🔄 Restoring code step for:', result.pendingEmail);
    currentEmail = result.pendingEmail;
    showCodeStep();
  } else {
    console.log('📝 Showing login form');
    showLoginForm();
  }
  
  // Load settings
  if (result.colorScheme) {
    currentScheme = result.colorScheme;
    previewEditor.dataset.scheme = currentScheme;
    colorButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.scheme === currentScheme);
    });
  }
  
  if (result.buttonOrder) {
    applyButtonOrder(result.buttonOrder);
  }
  
  // Attach event listeners
  attachPreviewListeners();
  attachAuthListeners();
  attachGalleryListeners();
});

// ===== Preview Editor Logic =====

function attachPreviewListeners() {
  // Color scheme buttons
  colorButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      colorButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const scheme = btn.dataset.scheme;
      currentScheme = scheme;
      previewEditor.dataset.scheme = scheme;
      
      // Save to storage
      chrome.storage.sync.set({ colorScheme: scheme });
      
      // Apply to all tabs
      applyToAllTabs('updateColorScheme', { scheme });
    });
  });
  
  // Switch order button
  switchBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Přidat třídu pro animaci
    previewActions.classList.add('switching');
    
    // Použít FLIP animaci
    const buttons = Array.from(previewActions.children);
    const firstRect = buttons[0].getBoundingClientRect();
    const lastRect = buttons[buttons.length - 1].getBoundingClientRect();
    
    // Prohodit pořadí
    buttons.reverse();
    previewActions.innerHTML = '';
    buttons.forEach(btn => previewActions.appendChild(btn));
    
    // Získat nové pozice
    requestAnimationFrame(() => {
      const newButtons = Array.from(previewActions.children);
      const newFirstRect = newButtons[0].getBoundingClientRect();
      const newLastRect = newButtons[newButtons.length - 1].getBoundingClientRect();
      
      // Vypočítat rozdíly
      const deltaX1 = firstRect.left - newFirstRect.left;
      const deltaY1 = firstRect.top - newFirstRect.top;
      const deltaX2 = lastRect.left - newLastRect.left;
      const deltaY2 = lastRect.top - newLastRect.top;
      
      // Aplikovat počáteční pozice
      newButtons[0].style.transform = `translate(${deltaX1}px, ${deltaY1}px)`;
      newButtons[1].style.transform = `translate(${deltaX2}px, ${deltaY2}px)`;
      
      // Spustit animaci
      requestAnimationFrame(() => {
        newButtons[0].style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        newButtons[1].style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        newButtons[0].style.transform = '';
        newButtons[1].style.transform = '';
        
        // Odstranit třídu po animaci
        setTimeout(() => {
          previewActions.classList.remove('switching');
          newButtons[0].style.transition = '';
          newButtons[1].style.transition = '';
        }, 300);
      });
    });
    
    const order = buttons.map(btn => btn.dataset.action);
    chrome.storage.sync.set({ buttonOrder: order });
    applyToAllTabs('updateButtonOrder', { order });
  });
}


function applyButtonOrder(order) {
  const buttons = Array.from(previewActions.children);
  previewActions.innerHTML = '';
  
  order.forEach(action => {
    const btn = buttons.find(b => b.dataset.action === action);
    if (btn) {
      previewActions.appendChild(btn);
    }
  });
}

function applyToAllTabs(action, data) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        chrome.tabs.sendMessage(tab.id, { action, ...data }).catch(() => {
          // Ignore errors for tabs that don't have content script
        });
      }
    });
  });
}

// ===== Auth Logic =====

function attachAuthListeners() {
  // Email input
  emailInput.addEventListener('focus', () => {
    sendBtn.style.display = 'block';
  });
  
  emailInput.addEventListener('input', () => {
    sendBtn.style.display = emailInput.value.trim() ? 'block' : 'none';
  });
  
  emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && emailInput.value.trim()) {
      sendBtn.click();
    }
  });
  
  // Send button (initiate auth)
  sendBtn.addEventListener('click', async () => {
    console.log('🖱️ Send button clicked!');
    console.log('📧 Email input value:', emailInput.value);
    console.log('🌐 Current API URL:', apiUrl);
    
    // Validace emailu před odesláním
    const email = emailInput.value.trim();
    
    if (!email) {
      console.log('❌ No email entered');
      alert('Please enter your email');
      return;
    }
    
    // Základní validace email formátu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format:', email);
      alert('Please enter a valid email address');
      return;
    }
    
    currentEmail = email;
    console.log('✅ Email validated:', currentEmail);
    
    // Debug: zobrazit API URL v konzoli
    console.log('🔗 Connecting to API:', apiUrl);
    
    try {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending...';
      
      const requestUrl = `${apiUrl}/api/auth/initiate`;
      const requestBody = { email: email };
      
      console.log('📤 Sending request to:', requestUrl);
      console.log('📝 Request body:', requestBody);
      console.log('📝 Request body stringified:', JSON.stringify(requestBody));
      
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Nejdřív zkontrolovat status, pak teprve parsovat JSON
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
          console.log('📥 Response data:', data);
        } catch (jsonError) {
          console.error('❌ Error parsing JSON:', jsonError);
          const text = await response.text();
          console.error('📥 Response text:', text);
          throw new Error(`Server returned invalid JSON: ${text}`);
        }
      } else {
        const text = await response.text();
        console.error('📥 Response is not JSON:', text);
        throw new Error(`Server returned non-JSON response: ${text}`);
      }
      
      if (response.ok) {
        console.log('✅ OTP code sent, showing code input');
        showCodeStep();
        checkClipboard(); // Check for OTP in clipboard
      } else {
        // Server vrátil chybu (400, 500, atd.)
        console.error('❌ Server error:', response.status, data);
        
        // Speciální handling pro limit uživatelů
        if (data?.code === 'USER_LIMIT_REACHED') {
          const errorMessage = `Registration limit reached!\n\n` +
            `Maximum ${data.limit || 100} users allowed.\n` +
            `Current users: ${data.current || 'unknown'}\n\n` +
            `Please try again later or contact support.`;
          alert(errorMessage);
        } else {
          const errorMessage = data?.error || data?.message || `Server error (${response.status})`;
          alert(`Error: ${errorMessage}`);
        }
        
        sendBtn.disabled = false;
        sendBtn.textContent = 'Continue';
      }
    } catch (error) {
      console.error('❌ Fetch error:', error);
      console.error('🌐 API URL:', apiUrl);
      console.error('📝 Error name:', error.name);
      console.error('📝 Error message:', error.message);
      console.error('📝 Error stack:', error.stack);
      
      // Lepší error message s více detaily
      let errorMessage = 'Failed to connect to server';
      
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') ||
          error.message.includes('ERR_CONNECTION_REFUSED') ||
          error.message.includes('ERR_NAME_NOT_RESOLVED')) {
        errorMessage = `Cannot connect to server at ${apiUrl}\n\n` +
          `Please check:\n` +
          `1. Is the server running?\n` +
          `2. Is the API URL correct?\n` +
          `3. Try opening: https://svag.vercel.app/health`;
      } else if (error.message.includes('JSON')) {
        errorMessage = `Server returned invalid response.\n\n` +
          `Error: ${error.message}\n\n` +
          `Check server logs for more details.`;
      } else {
        errorMessage = `Error: ${error.message}`;
      }
      
      alert(errorMessage);
      sendBtn.disabled = false;
      sendBtn.textContent = 'Continue';
    }
  });
  
  // Code input
  codeDigits.forEach((input, index) => {
    // Input event
    input.addEventListener('input', (e) => {
      // Clear error state
      clearCodeError();
      
      const value = e.target.value;
      if (value) {
        input.classList.add('filled');
        // Auto-advance to next input
        if (index < codeDigits.length - 1) {
          codeDigits[index + 1].focus();
        } else {
          // All digits filled, show Continue button
          verifyCodeBtn.style.display = 'block';
        }
      } else {
        input.classList.remove('filled');
        verifyCodeBtn.style.display = 'none';
      }
    });
    
    // Backspace handling
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        codeDigits[index - 1].focus();
      }
      
      if (e.key === 'Enter' && verifyCodeBtn.style.display === 'block') {
        verifyCodeBtn.click();
      }
      
      // Arrow keys
      if (e.key === 'ArrowLeft' && index > 0) {
        codeDigits[index - 1].focus();
      }
      if (e.key === 'ArrowRight' && index < codeDigits.length - 1) {
        codeDigits[index + 1].focus();
      }
    });
    
    // Paste handling
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = e.clipboardData.getData('text').trim();
      const digits = pasteData.replace(/[^a-zA-Z0-9]/g, '');
      
      if (digits.length === 8) {
        codeDigits.forEach((digit, i) => {
          digit.value = digits[i] || '';
          digit.classList.add('filled');
        });
        verifyCodeBtn.style.display = 'block';
        codeDigits[codeDigits.length - 1].focus();
      }
    });
  });
  
  // Verify code button
  verifyCodeBtn.addEventListener('click', async () => {
    await verifyCode();
  });
  
  // Resend email link - inteligentní resend (aktivační link vs OTP podle stavu)
  resendEmailLink.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      resendEmailLink.textContent = 'Sending...';
      
      console.log('📧 Resending OTP code to:', currentEmail);
      
      await fetch(`${apiUrl}/api/auth/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentEmail })
      });
      
      resendEmailLink.textContent = 'Sent!';
      setTimeout(() => {
        resendEmailLink.textContent = 'Resend email';
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      resendEmailLink.textContent = 'Resend email';
    }
  });
}

async function checkClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const code = text.trim().replace(/[^a-zA-Z0-9]/g, '');
    
    if (code.length === 8) {
      // Auto-fill code
      codeDigits.forEach((digit, i) => {
        digit.value = code[i];
        digit.classList.add('filled');
      });
      verifyCodeBtn.style.display = 'block';
    }
  } catch (error) {
    // Clipboard access denied or not available
    console.log('Clipboard access denied');
  }
}

async function verifyCode() {
  const code = codeDigits.map(d => d.value).join('');
  
  if (code.length !== 8) {
    alert('Please enter all 8 digits');
    return;
  }
  
  try {
    verifyCodeBtn.disabled = true;
    verifyCodeBtn.textContent = 'Verifying...';
    
    const response = await fetch(`${apiUrl}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token: code,
        email: currentEmail 
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.token) {
      // Success! Save token, email and API URL
      await chrome.storage.sync.set({ 
        apiToken: data.token,
        userEmail: currentEmail,
        apiUrl: apiUrl // Uložit API URL pro použití v content.js
      });
      
      // Vymazat temporary stav autentizace
      await chrome.storage.sync.remove(['authStep', 'pendingEmail']);
      
      showLoggedIn(currentEmail, data.token);
    } else {
      // Wrong code
      showCodeError();
      verifyCodeBtn.disabled = false;
      verifyCodeBtn.textContent = 'Continue';
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to verify code');
    verifyCodeBtn.disabled = false;
    verifyCodeBtn.textContent = 'Continue';
  }
}

function showCodeError() {
  codeDigits.forEach(digit => {
    digit.classList.add('error');
  });
  verifyCodeBtn.textContent = 'Wrong code';
  verifyCodeBtn.classList.add('error');
  verifyCodeBtn.disabled = true;
}

function clearCodeError() {
  codeDigits.forEach(digit => {
    digit.classList.remove('error');
  });
  verifyCodeBtn.textContent = 'Continue';
  verifyCodeBtn.classList.remove('error');
  verifyCodeBtn.disabled = false;
}

function showCodeStep() {
  emailStep.style.display = 'none';
  codeStep.style.display = 'flex';
  resendEmailLink.style.display = 'inline';
  
  // Uložit email čekající na OTP
  chrome.storage.sync.set({ 
    pendingEmail: currentEmail 
  });
  
  // Reset code inputs
  codeDigits.forEach(digit => {
    digit.value = '';
    digit.classList.remove('filled', 'error');
  });
  verifyCodeBtn.style.display = 'none';
  verifyCodeBtn.disabled = false;
  verifyCodeBtn.textContent = 'Continue';
  verifyCodeBtn.classList.remove('error');
  
  // Focus first digit
  setTimeout(() => codeDigits[0].focus(), 100);
}

function showLoginForm() {
  loginForm.style.display = 'block';
  loggedIn.style.display = 'none';
  galleryLimit.style.display = 'none';
  
  // Reset to email step
  emailStep.style.display = 'flex';
  codeStep.style.display = 'none';
  registerSuccess.style.display = 'none';
  resendEmailLink.style.display = 'none';
  
  emailInput.value = '';
  sendBtn.style.display = 'none';
  sendBtn.disabled = false;
  sendBtn.textContent = 'Continue';
  
  currentEmail = '';
  
  // Vymazat temporary stav autentizace
  chrome.storage.sync.remove(['authStep', 'pendingEmail']);
}

async function showLoggedIn(email, token) {
  loginForm.style.display = 'none';
  loggedIn.style.display = 'flex';
  galleryLimit.style.display = 'block';
  resendEmailLink.style.display = 'none'; // Skrýt resend email link po přihlášení
  
  userEmail.textContent = email;
  
  // Load recent icons and gallery count
  await loadRecentIcons(token);
}

// ===== Gallery Logic =====

function attachGalleryListeners() {
  // Open gallery button
  openGalleryBtn.addEventListener('click', async () => {
    const result = await chrome.storage.sync.get(['apiToken', 'userEmail']);
    const url = result.apiToken && result.userEmail 
      ? `${apiUrl}/gallery?token=${encodeURIComponent(result.apiToken)}&email=${encodeURIComponent(result.userEmail)}`
      : `${apiUrl}/gallery`;
    chrome.tabs.create({ url });
  });
  
  // Logout button
  logoutBtn.addEventListener('click', async () => {
    await chrome.storage.sync.remove(['apiToken', 'userEmail']);
    
    // ===== NOVÉ: Notifikovat všechny galerie taby o odhlášení =====
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.url && tab.url.includes('/gallery')) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'extensionLogout'
          }).catch(() => {
            // Ignorovat chyby pro taby bez content scriptu
          });
        }
      });
    });
    
    showLoginForm();
  });
}

// Detekuje, zda SVG má pouze jednu barvu
function isSingleColor(svg) {
  const colors = new Set();
  
  // Najít všechny fill atributy
  const fillMatches = svg.match(/fill="([^"]*?)"/gi) || [];
  fillMatches.forEach(match => {
    const color = match.match(/fill="([^"]*?)"/i)?.[1];
    if (color && color !== 'none' && color !== 'transparent' && color !== 'currentColor') {
      colors.add(color.toLowerCase().trim());
    }
  });
  
  // Najít všechny stroke atributy
  const strokeMatches = svg.match(/stroke="([^"]*?)"/gi) || [];
  strokeMatches.forEach(match => {
    const color = match.match(/stroke="([^"]*?)"/i)?.[1];
    if (color && color !== 'none' && color !== 'transparent' && color !== 'currentColor') {
      colors.add(color.toLowerCase().trim());
    }
  });
  
  // Najít fill/stroke ve style atributech
  const styleMatches = svg.match(/style="([^"]*?)"/gi) || [];
  styleMatches.forEach(match => {
    const style = match.match(/style="([^"]*?)"/i)?.[1] || '';
    
    const fillStyle = style.match(/fill:\s*([^;]+)/i)?.[1];
    if (fillStyle && fillStyle !== 'none' && fillStyle !== 'transparent') {
      colors.add(fillStyle.toLowerCase().trim());
    }
    
    const strokeStyle = style.match(/stroke:\s*([^;]+)/i)?.[1];
    if (strokeStyle && strokeStyle !== 'none' && strokeStyle !== 'transparent') {
      colors.add(strokeStyle.toLowerCase().trim());
    }
  });
  
  // Pokud má 0 barev (jen černá/žádná) nebo 1 barvu = jednobarevná
  return colors.size <= 1;
}

// Přebarvit SVG na černou
function recolorToBlack(svg) {
  return svg
    // Nahradit fill atributy
    .replace(/fill="(?!none|transparent)[^"]*"/gi, 'fill="black"')
    // Nahradit stroke atributy
    .replace(/stroke="(?!none|transparent)[^"]*"/gi, 'stroke="black"')
    // Nahradit fill ve style
    .replace(/fill:\s*(?!none|transparent)[^;"]*/gi, 'fill:black')
    // Nahradit stroke ve style
    .replace(/stroke:\s*(?!none|transparent)[^;"]*/gi, 'stroke:black');
}

async function loadRecentIcons(token) {
  try {
    // Načíst ikony a statistiky
    const [iconsResponse, statsResponse] = await Promise.all([
      fetch(`${apiUrl}/api/gallery`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${apiUrl}/api/gallery/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);
    
    if (iconsResponse.ok && statsResponse.ok) {
      const icons = await iconsResponse.json();
      const stats = await statsResponse.json();
      const totalIcons = icons.length;
      
      // Update gallery limit s dynamickým limitem z API
      limitText.textContent = `${stats.current || totalIcons}/${stats.limit || 100}`;
      
      // Clear icons list
      iconsList.innerHTML = '';
      
      // Display first 3 icons
      const displayIcons = icons.slice(0, 3);
      displayIcons.forEach(icon => {
        const iconItem = document.createElement('div');
        iconItem.className = 'icon-item';
        
        // Detekovat jednobarevné SVG a přebarvit na černou
        let svg = icon.svg;
        if (isSingleColor(svg)) {
          svg = recolorToBlack(svg);
        }
        
        iconItem.innerHTML = svg;
        iconItem.addEventListener('click', () => {
          chrome.tabs.create({ url: `${apiUrl}/gallery` });
        });
        iconsList.appendChild(iconItem);
      });
      
      // Add empty slots
      for (let i = displayIcons.length; i < 3; i++) {
        const iconItem = document.createElement('div');
        iconItem.className = 'icon-item empty';
        iconsList.appendChild(iconItem);
      }
      
      // Add "+X" indicator if more than 3 icons
      if (totalIcons > 3) {
        const moreItem = document.createElement('div');
        moreItem.className = 'icon-item more';
        moreItem.textContent = `+${totalIcons - 3}`;
        moreItem.addEventListener('click', () => {
          chrome.tabs.create({ url: `${apiUrl}/gallery` });
        });
        iconsList.appendChild(moreItem);
      }
    } else {
      console.error('Failed to load icons');
    }
  } catch (error) {
    console.error('Error loading icons:', error);
  }
}

// Poslouchat na změny v chrome.storage (pro automatické přihlášení po aktivaci)
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === 'sync') {
    console.log('📦 Storage changed:', Object.keys(changes));
    
    // Když extension dostane token (login)
    if (changes.apiToken && changes.apiToken.newValue && changes.userEmail && changes.userEmail.newValue) {
      console.log('🔄 User logged in, refreshing popup');
      window.location.reload();
    }
    
    // Když extension ztratí token (logout)
    if (changes.apiToken && !changes.apiToken.newValue) {
      console.log('🔄 User logged out, refreshing popup');
      window.location.reload();
    }
  }
});

// Poslouchat na zprávy z background scriptu
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'storageChanged') {
    console.log('📩 Popup received storage change notification from background');
    
    // Reload popup pokud se změnil token
    if (request.changes.apiToken) {
      console.log('🔄 Token changed, reloading popup...');
      window.location.reload();
    }
  }
  
  return true;
});
