// Initialize Stripe (will be set from gallery.ejs)
let stripe;
if (typeof STRIPE_KEY !== 'undefined') {
  stripe = Stripe(STRIPE_KEY);
}

// State
let token = null;
let userEmail = null;
let currentEmail = '';
let allItems = [];
let currentSort = 'newest';
let userStats = null;
let isProcessingMessage = false; // Flag to prevent message loop

// Helper funkce pro kontrolu a refresh tokenu
async function getValidToken() {
  const storedToken = localStorage.getItem('token');
  const storedRefreshToken = localStorage.getItem('refreshToken');
  
  if (!storedToken || !storedRefreshToken) {
    return null;
  }
  
  try {
    const payload = JSON.parse(atob(storedToken.split('.')[1]));
    const expiresAt = payload.exp * 1000;
    const now = Date.now();
    
    // Pokud token vyprší za méně než 5 minut, refreshnout
    if (expiresAt - now < 5 * 60 * 1000) {
      console.log('🔄 Token expiring soon, refreshing...');
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken })
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        console.log('✅ Token refreshed');
        return data.token;
      } else {
        console.error('❌ Failed to refresh token');
        localStorage.clear();
        window.location.href = '/gallery/login';
        return null;
      }
    }
    
    return storedToken;
  } catch (error) {
    console.error('Error checking token:', error);
    return storedToken;
  }
}

// DOM Elements - Check if they exist (different on login vs gallery page)
const loginSection = document.getElementById('loginSection');
const gallerySection = document.getElementById('gallerySection');
const emailStep = document.getElementById('emailStep');
const codeStep = document.getElementById('codeStep');
const registerSuccess = document.getElementById('registerSuccess');
const emailInput = document.getElementById('emailInput');
const sendBtn = document.getElementById('sendBtn');
const verifyCodeBtn = document.getElementById('verifyCodeBtn');
const resendEmailLink = document.getElementById('resendEmailLink');
const backToEmailBtn = document.getElementById('backToEmailBtn');
const codeDigits = document.querySelectorAll('.code-input') ? Array.from(document.querySelectorAll('.code-input')) : [];
const registerEmailEl = document.getElementById('registerEmail');

// ===== INITIALIZATION =====

async function init() {
  // Check if we're on login page or gallery page
  if (loginSection) {
    initLoginPage();
  } else if (gallerySection) {
    initGalleryPage();
  }
}

function initLoginPage() {
  attachAuthListeners();
  
  // Check URL params (if extension passed token)
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('token');
  const urlEmail = urlParams.get('email');
  
  if (urlToken && urlEmail) {
    // Save and redirect to gallery
    localStorage.setItem('token', urlToken);
    
    // Pokud je v URL i refreshToken, uložit ho
    const urlRefreshToken = urlParams.get('refreshToken');
    if (urlRefreshToken) {
      localStorage.setItem('refreshToken', urlRefreshToken);
    }
    
    localStorage.setItem('userEmail', urlEmail);
    window.location.href = '/gallery';
    return;
  }
  
  // Check if already logged in
  token = localStorage.getItem('token');
  userEmail = localStorage.getItem('userEmail');
  
  console.log('🔍 Checking login state:', { hasToken: !!token, hasEmail: !!userEmail });
  
  if (token && userEmail) {
    console.log('✅ Already logged in, redirecting to gallery');
    window.location.href = '/gallery';
  }
}

async function initGalleryPage() {
  console.log('🚀 Initializing gallery page...');
  
  // Check URL params first (if extension passed token)
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('token');
  const urlEmail = urlParams.get('email');
  
  console.log('🔍 URL params:', { 
    hasToken: !!urlToken, 
    hasEmail: !!urlEmail,
    tokenLength: urlToken?.length,
    email: urlEmail 
  });
  
  if (urlToken && urlEmail) {
    console.log('✅ Found token in URL - saving to localStorage');
    // Save to localStorage
    localStorage.setItem('token', urlToken);
    
    // Pokud je v URL i refreshToken, uložit ho
    const urlRefreshToken = urlParams.get('refreshToken');
    if (urlRefreshToken) {
      localStorage.setItem('refreshToken', urlRefreshToken);
    }
    
    localStorage.setItem('userEmail', urlEmail);
    token = urlToken;
    userEmail = urlEmail;
    
    console.log('📝 Saved to localStorage:', {
      token: token.substring(0, 20) + '...',
      email: userEmail
    });
    
    // Clean URL (remove params)
    window.history.replaceState({}, '', '/gallery');
    console.log('🧹 Cleaned URL params');
  } else {
    console.log('📦 Checking localStorage for existing session...');
    // Check localStorage
    userEmail = localStorage.getItem('userEmail');
    console.log('📦 LocalStorage check:', { 
      hasEmail: !!userEmail,
      email: userEmail
    });
  }
  
  // Získat validní token (s auto-refresh)
  token = await getValidToken();
  if (!token || !userEmail) {
    console.log('❌ No valid session found - redirecting to login');
    window.location.href = '/gallery/login';
    return;
  }
  
  console.log('✅ Valid session found - loading gallery');
  
  document.getElementById('userEmail').textContent = userEmail;
  await loadGallery();
  await loadStats();
  attachGalleryListeners();
}

// ===== AUTH LOGIC =====

function attachAuthListeners() {
  if (!emailInput) return;
  
  // Email input handlers
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
  
  // Send email
  sendBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    
    if (!email) {
      alert('Please enter your email');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email');
      return;
    }
    
    currentEmail = email;
    
    try {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending...';
      
      const response = await fetch('/api/auth/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (data.type === 'login') {
          showCodeStep();
        } else if (data.type === 'register') {
          showRegisterSuccess(email);
        }
      } else {
        alert(data.error || 'Error sending email');
        sendBtn.disabled = false;
        sendBtn.textContent = 'Continue';
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Connection error');
      sendBtn.disabled = false;
      sendBtn.textContent = 'Continue';
    }
  });
  
  // Code input handlers
  codeDigits.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      clearCodeError();
      
      const value = e.target.value;
      if (value) {
        input.classList.add('filled');
        if (index < codeDigits.length - 1) {
          codeDigits[index + 1].focus();
        } else {
          verifyCodeBtn.style.display = 'block';
        }
      } else {
        input.classList.remove('filled');
        verifyCodeBtn.style.display = 'none';
      }
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        codeDigits[index - 1].focus();
      }
      
      if (e.key === 'Enter' && verifyCodeBtn.style.display === 'block') {
        verifyCodeBtn.click();
      }
      
      if (e.key === 'ArrowLeft' && index > 0) {
        codeDigits[index - 1].focus();
      }
      if (e.key === 'ArrowRight' && index < codeDigits.length - 1) {
        codeDigits[index + 1].focus();
      }
    });
    
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
  
  // Verify code
  if (verifyCodeBtn) {
    verifyCodeBtn.addEventListener('click', async () => {
      const code = codeDigits.map(d => d.value).join('');
      
      if (code.length !== 8) {
        alert('Please enter all 8 digits');
        return;
      }
      
      try {
        verifyCodeBtn.disabled = true;
        verifyCodeBtn.textContent = 'Verifying...';
        
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            token: code,
            email: currentEmail 
          })
        });
        
        const data = await response.json();
        
        if (response.ok && data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('refreshToken', data.refreshToken);
          localStorage.setItem('userEmail', currentEmail);
          
          // ===== NOVÉ: Notifikovat extension o přihlášení =====
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            try {
              chrome.runtime.sendMessage({
                action: 'syncLogin',
                token: data.token,
                refreshToken: data.refreshToken,
                email: currentEmail,
                apiUrl: window.location.origin
              }, (response) => {
                if (response && response.success) {
                  console.log('✅ Login synced to extension');
                }
              });
            } catch (e) {
              console.log('Extension not available:', e);
            }
          }
          
          window.location.href = '/gallery';
        } else {
          showCodeError();
          verifyCodeBtn.disabled = false;
          verifyCodeBtn.textContent = 'Verify';
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Verification error');
        verifyCodeBtn.disabled = false;
        verifyCodeBtn.textContent = 'Verify';
      }
    });
  }
  
  // Resend email
  if (resendEmailLink) {
    resendEmailLink.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        resendEmailLink.textContent = 'Sending...';
        await fetch('/api/auth/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentEmail })
        });
        resendEmailLink.textContent = 'Sent!';
        setTimeout(() => {
          resendEmailLink.textContent = 'Resend code';
        }, 2000);
      } catch (error) {
        console.error('Error:', error);
        resendEmailLink.textContent = 'Resend code';
      }
    });
  }
  
  // Back to email
  if (backToEmailBtn) {
    backToEmailBtn.addEventListener('click', () => {
      showLoginForm();
    });
  }
}

function showCodeStep() {
  emailStep.style.display = 'none';
  registerSuccess.style.display = 'none';
  codeStep.style.display = 'flex';
  
  // Reset code inputs
  codeDigits.forEach(digit => {
    digit.value = '';
    digit.classList.remove('filled', 'error');
  });
  verifyCodeBtn.style.display = 'none';
  verifyCodeBtn.disabled = false;
  verifyCodeBtn.textContent = 'Verify';
  verifyCodeBtn.classList.remove('error');
  
  setTimeout(() => codeDigits[0].focus(), 100);
}

function showRegisterSuccess(email) {
  emailStep.style.display = 'none';
  codeStep.style.display = 'none';
  registerSuccess.style.display = 'flex';
  registerEmailEl.textContent = email;
}

function showLoginForm() {
  emailStep.style.display = 'flex';
  codeStep.style.display = 'none';
  registerSuccess.style.display = 'none';
  
  emailInput.value = '';
  sendBtn.style.display = 'none';
  sendBtn.disabled = false;
  sendBtn.textContent = 'Continue';
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
  verifyCodeBtn.textContent = 'Verify';
  verifyCodeBtn.classList.remove('error');
  verifyCodeBtn.disabled = false;
}

// ===== GALLERY LOGIC =====

function attachGalleryListeners() {
  // Already attached via onclick in HTML
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userEmail');
  
  // ===== NOVÉ: Notifikovat extension o odhlášení přes window.postMessage =====
  window.postMessage({
    source: 'svag-gallery',
    action: 'galleryLogout'
  }, '*');
  
  console.log('📤 Logout message sent to extension');
  
  window.location.href = '/gallery/login';
}

async function loadStats() {
  try {
    const validToken = await getValidToken();
    if (!validToken) return;
    
    const response = await fetch('/api/gallery/stats', {
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    
    if (response.ok) {
      userStats = await response.json();
      updateUI();
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

function updateUI() {
  if (!userStats) return;
  
  document.getElementById('usageStats').textContent = 
    `${userStats.current}/${userStats.limit}`;
}

async function upgradeToPro() {
  try {
    const validToken = await getValidToken();
    if (!validToken) return;
    
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    
    if (response.ok) {
      const { url } = await response.json();
      window.location.href = url;
    } else {
      const error = await response.json();
      alert(error.error || 'Error creating payment');
    }
  } catch (error) {
    alert('Error redirecting to payment');
    console.error(error);
  }
}

async function loadGallery() {
  try {
    const validToken = await getValidToken();
    if (!validToken) return;
    
    const response = await fetch('/api/gallery', {
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    
    if (response.ok) {
      allItems = await response.json();
      displayGallery(allItems);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userEmail');
      window.location.href = '/gallery/login';
    }
  } catch (error) {
    alert('Error loading gallery');
    console.error(error);
  }
}

function sortGallery(sortType) {
  currentSort = sortType;
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-sort="${sortType}"]`).classList.add('active');
  
  const sorted = [...allItems];
  switch(sortType) {
    case 'newest':
      sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      break;
    case 'oldest':
      sorted.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      break;
    case 'a-z':
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      break;
    case 'z-a':
      sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      break;
    case 'largest':
      sorted.sort((a, b) => parseFloat(b.size || 0) - parseFloat(a.size || 0));
      break;
    case 'smallest':
      sorted.sort((a, b) => parseFloat(a.size || 0) - parseFloat(b.size || 0));
      break;
  }
  
  displayGallery(sorted);
}

function filterGallery() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const filtered = allItems.filter(item => 
    (item.name || '').toLowerCase().includes(searchTerm)
  );
  
  const tempAllItems = allItems;
  allItems = filtered;
  sortGallery(currentSort);
  allItems = tempAllItems;
}

function isSingleColor(svg) {
  const colors = new Set();
  
  const fillMatches = svg.match(/fill="([^"]*?)"/gi) || [];
  fillMatches.forEach(match => {
    const color = match.match(/fill="([^"]*?)"/i)?.[1];
    if (color && color !== 'none' && color !== 'transparent' && color !== 'currentColor') {
      colors.add(color.toLowerCase().trim());
    }
  });
  
  const strokeMatches = svg.match(/stroke="([^"]*?)"/gi) || [];
  strokeMatches.forEach(match => {
    const color = match.match(/stroke="([^"]*?)"/i)?.[1];
    if (color && color !== 'none' && color !== 'transparent' && color !== 'currentColor') {
      colors.add(color.toLowerCase().trim());
    }
  });
  
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
  
  return colors.size <= 1;
}

function recolorToBlack(svg) {
  return svg
    .replace(/fill="(?!none|transparent)[^"]*"/gi, 'fill="black"')
    .replace(/stroke="(?!none|transparent)[^"]*"/gi, 'stroke="black"')
    .replace(/fill:\s*(?!none|transparent)[^;"]*/gi, 'fill:black')
    .replace(/stroke:\s*(?!none|transparent)[^;"]*/gi, 'stroke:black');
}

function displayGallery(items) {
  const gallery = document.getElementById('gallery');
  const emptyState = document.getElementById('emptyState');
  
  if (items.length === 0) {
    gallery.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  
  gallery.style.display = 'grid';
  emptyState.style.display = 'none';
  
  gallery.innerHTML = items.map(item => {
    const displayName = (item.name || 'icon').length > 20 
      ? (item.name || 'icon').substring(0, 17) + '...'
      : (item.name || 'icon');
    
    let svg = item.svg;
    if (isSingleColor(svg)) {
      svg = recolorToBlack(svg);
    }
    
    return `
      <div class="gallery-item" onclick="downloadItem(event, '${item.id}')">
        <div class="gallery-item-inner">
          ${svg}
        </div>
        <div class="download-tooltip">Downloaded!</div>
        <div class="item-info">
          <span class="item-name">${displayName}</span>
        </div>
        <div class="item-size">${item.size || '0'}kb</div>
        <div class="item-actions">
          <button class="delete-btn" onclick="deleteItem(event, '${item.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function downloadItem(event, id) {
  if (event) {
    event.stopPropagation();
  }
  
  const item = allItems.find(i => i.id === id);
  if (!item) return;
  
  const blob = new Blob([item.svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${item.name || 'icon'}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  // Show tooltip
  const galleryItem = event.currentTarget;
  const tooltip = galleryItem.querySelector('.download-tooltip');
  if (tooltip) {
    tooltip.classList.add('show');
    setTimeout(() => {
      tooltip.classList.remove('show');
    }, 1000);
  }
}

async function deleteItem(event, id) {
  if (event) {
    event.stopPropagation();
  }
  
  try {
    const validToken = await getValidToken();
    if (!validToken) return;
    
    const response = await fetch(`/api/gallery/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    
    if (response.ok) {
      // Remove from local array
      allItems = allItems.filter(item => item.id !== id);
      // Refresh display
      sortGallery(currentSort);
      // Reload stats
      await loadStats();
    } else {
      const error = await response.json();
      alert(error.error || 'Error deleting icon');
    }
  } catch (error) {
    console.error('Error deleting:', error);
    alert('Error deleting icon');
  }
}

// Check for Stripe success/cancel on page load
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('success') === 'true') {
    setTimeout(() => {
      alert('✅ Successfully upgraded to Pro!');
      window.history.replaceState({}, document.title, '/gallery');
      if (token) loadStats();
    }, 500);
  }
  if (urlParams.get('canceled') === 'true') {
    setTimeout(() => {
      alert('Payment was canceled.');
      window.history.replaceState({}, document.title, '/gallery');
    }, 500);
  }
});

// Global message listener for extension sync (with loop protection)
window.addEventListener('message', (event) => {
  // Ignore messages while processing to prevent loops
  if (isProcessingMessage) {
    console.log('⏭️ Skipping message - already processing');
    return;
  }
  
  // Check if message is from svag extension
  if (event.data && event.data.source === 'svag-extension') {
    isProcessingMessage = true;
    
    if (event.data.action === 'extensionLogin') {
      console.log('🔄 Extension logged in, syncing to gallery');
      localStorage.setItem('token', event.data.token);
      if (event.data.refreshToken) {
        localStorage.setItem('refreshToken', event.data.refreshToken);
      }
      localStorage.setItem('userEmail', event.data.email);
      
      // Redirect based on current page
      if (loginSection) {
        window.location.href = '/gallery';
      } else if (gallerySection) {
        window.location.reload();
      }
    }
    
    if (event.data.action === 'extensionLogout') {
      console.log('🔄 Extension logged out, syncing to gallery');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userEmail');
      window.location.href = '/gallery/login';
    }
    
    // Reset flag after a delay to allow redirect
    setTimeout(() => {
      isProcessingMessage = false;
    }, 1000);
  }
});

// Initialize
init();

