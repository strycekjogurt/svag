// Sledování stavu klávesnice
let isCommandPressed = false;
let currentHoveredSvg = null;
let previewOverlay = null;
let currentCursorElement = null;
let popupVisible = false;
let popupPosition = { x: 0, y: 0 };

// Načíst nastavení při načtení scriptu
let colorSchemeSetting = 'white-black'; // default
let buttonOrderSetting = ['gallery', 'download']; // default

// Helper funkce pro kontrolu a refresh tokenu
async function getValidToken() {
  const result = await chrome.storage.sync.get(['apiToken', 'refreshToken', 'apiUrl']);
  
  if (!result.apiToken || !result.refreshToken) {
    return null;
  }
  
  // Dekódovat JWT a zkontrolovat expiraci
  try {
    const payload = JSON.parse(atob(result.apiToken.split('.')[1]));
    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    
    // Pokud token vyprší za méně než 5 minut, refreshnout
    if (expiresAt - now < 5 * 60 * 1000) {
      console.log('🔄 Token expiring soon, refreshing...');
      
      const apiUrl = result.apiUrl || 'https://svag.pro';
      const response = await fetch(`${apiUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: result.refreshToken })
      });
      
      if (response.ok) {
        const data = await response.json();
        await chrome.storage.sync.set({
          apiToken: data.token,
          refreshToken: data.refreshToken
        });
        console.log('✅ Token refreshed');
        return data.token;
      } else {
        console.error('❌ Failed to refresh token');
        return null;
      }
    }
    
    return result.apiToken;
  } catch (error) {
    console.error('Error checking token:', error);
    return result.apiToken;
  }
}

// Načíst všechna nastavení při načtení scriptu
chrome.storage.sync.get(['colorScheme', 'buttonOrder'], (result) => {
  if (result.colorScheme) {
    colorSchemeSetting = result.colorScheme;
    applyColorScheme(result.colorScheme);
  }
  if (result.buttonOrder) {
    buttonOrderSetting = result.buttonOrder;
  }
});

// Poslouchat změny nastavení
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateColorScheme') {
    colorSchemeSetting = request.scheme;
    applyColorScheme(request.scheme);
    
    // Pokud je popup otevřený, aktualizovat ho
    if (previewOverlay) {
      const popup = previewOverlay.querySelector('.svag-popup');
      if (popup) {
        // Znovu aplikovat barevné schéma na existující popup
        applyColorScheme(request.scheme);
      }
    }
  }
  if (request.action === 'updateButtonOrder') {
    buttonOrderSetting = request.order;
    // Recreate popup with new order
    if (previewOverlay) {
      previewOverlay.remove();
      previewOverlay = null;
    }
  }
  if (request.action === 'openPopup') {
    // Toto bude zpracováno v background.js
  }
});

// Funkce pro nastavení copy cursor
function setCopyCursor(element) {
  if (currentCursorElement && currentCursorElement !== element) {
    currentCursorElement.classList.remove('svag-cursor-copy');
  }
  element.classList.add('svag-cursor-copy');
  currentCursorElement = element;
}

// Funkce pro odstranění copy cursor
function removeCopyCursor() {
  if (currentCursorElement) {
    currentCursorElement.classList.remove('svag-cursor-copy');
    currentCursorElement = null;
  }
}

// Funkce pro aplikování barevného schématu
function applyColorScheme(scheme) {
  const root = document.documentElement;
  
  switch (scheme) {
    case 'black-white':
      // Černé pozadí s bílými ikonami (jako v popup.css)
      root.style.setProperty('--svag-bg', '#000000');
      root.style.setProperty('--svag-border', '#ffffff');
      root.style.setProperty('--svag-icon', '#ffffff');
      break;
    case 'white-black':
      // Bílé pozadí s černými ikonami (jako v popup.css)
      root.style.setProperty('--svag-bg', '#ffffff');
      root.style.setProperty('--svag-border', '#000000');
      root.style.setProperty('--svag-icon', '#000000');
      break;
    case 'black-gray':
      root.style.setProperty('--svag-bg', '#f0f0f0');
      root.style.setProperty('--svag-border', '#000000');
      root.style.setProperty('--svag-icon', '#000000');
      break;
    case 'gray-black':
      root.style.setProperty('--svag-bg', '#000000');
      root.style.setProperty('--svag-border', '#808080');
      root.style.setProperty('--svag-icon', '#808080');
      break;
    default:
      // Default: white-black
      root.style.setProperty('--svag-bg', '#ffffff');
      root.style.setProperty('--svag-border', '#000000');
      root.style.setProperty('--svag-icon', '#000000');
  }
}

// Vytvoření popup menu s akcemi
function createActionPopup() {
  const popup = document.createElement('div');
  popup.id = 'svag-action-popup';
  
  // Definice tlačítek
  const buttonDefs = {
    gallery: `
      <div class="svag-action-item" data-action="gallery">
        <span class="svag-action-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="19" viewBox="0 0 16 19" fill="none">
            <path d="M11 1H5C2.79086 1 1 2.79086 1 5V17L7.41876 12.4152C7.76646 12.1668 8.23354 12.1668 8.58124 12.4152L15 17V5C15 2.79086 13.2091 1 11 1Z" fill="var(--svag-bg)" stroke="var(--svag-border)" stroke-width="2"/>
          </svg>
        </span>
      </div>
    `,
    download: `
      <div class="svag-action-item" data-action="download">
        <span class="svag-action-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" viewBox="0 0 14 16" fill="none">
            <path d="M6.67572 0V14.5M6.67572 14.5L12.6757 9M6.67572 14.5L0.67572 9" stroke="var(--svag-icon)" stroke-width="2"/>
          </svg>
        </span>
      </div>
    `
  };
  
  // Vytvořit HTML podle pořadí z nastavení
  const html = buttonOrderSetting.map(action => buttonDefs[action]).join('');
  popup.innerHTML = html;
  
  document.body.appendChild(popup);
  
  // Před vytvořením popupu znovu načíst aktuální nastavení
  chrome.storage.sync.get(['colorScheme', 'buttonOrder'], (result) => {
    if (result.colorScheme) {
      colorSchemeSetting = result.colorScheme;
    }
    if (result.buttonOrder) {
      buttonOrderSetting = result.buttonOrder;
    }
    
    // Aplikovat barevné schéma
    applyColorScheme(colorSchemeSetting);
  });
  
  // Sledování pozice myši pro proximity efekt
  let animationFrameId = null;
  
  const updateProximityEffect = (e) => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    
    animationFrameId = requestAnimationFrame(() => {
      const buttons = popup.querySelectorAll('.svag-action-item');
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Vypočítat vzdálenost od středu buttonu
        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Maximální vzdálenost pro efekt (poloměr buttonu = 24px)
        const maxDistance = 24;
        
        // Vypočítat fill procento (0 = daleko, 1 = blízko)
        const fillPercent = Math.max(0, Math.min(1, 1 - (distance / maxDistance)));
        
        // Aplikovat fill na button
        button.style.setProperty('--fill-percent', fillPercent);
        
        // Přidat třídu když je button dostatečně vyplněný (pro změnu barvy ikon)
        if (fillPercent > 0.4) {
          button.classList.add('svag-filled');
        } else {
          button.classList.remove('svag-filled');
        }
      });
    });
  };
  
  // Event listener pro mousemove na celém dokumentu
  const mouseMoveHandler = (e) => {
    if (popup.classList.contains('svag-visible')) {
      updateProximityEffect(e);
    }
  };
  
  document.addEventListener('mousemove', mouseMoveHandler);
  
  // Event listenery pro mouseenter místo click
  const galleryBtn = popup.querySelector('[data-action="gallery"]');
  const downloadBtn = popup.querySelector('[data-action="download"]');
  
  if (galleryBtn) {
    galleryBtn.addEventListener('mouseenter', () => {
      if (currentHoveredSvg) {
        sendToGallery(currentHoveredSvg);
        hideActionPopup();
      }
    });
  }
  
  if (downloadBtn) {
    downloadBtn.addEventListener('mouseenter', () => {
      if (currentHoveredSvg) {
        downloadSvg(currentHoveredSvg);
        hideActionPopup();
      }
    });
  }
  
  return popup;
}

// Získání SVG dat z různých zdrojů
function getSvgData(element) {
  // Případ 1: Inline SVG
  if (element.tagName.toLowerCase() === 'svg') {
    return {
      type: 'inline',
      content: element.outerHTML,
      element: element
    };
  }
  
  // Případ 2: IMG s SVG src
  if (element.tagName.toLowerCase() === 'img' && element.src && element.src.includes('.svg')) {
    return {
      type: 'img',
      url: element.src,
      element: element
    };
  }
  
  // Případ 3: Element s SVG background
  const bgImage = window.getComputedStyle(element).backgroundImage;
  if (bgImage && bgImage.includes('.svg')) {
    const urlMatch = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
    if (urlMatch) {
      return {
        type: 'background',
        url: urlMatch[1],
        element: element
      };
    }
  }
  
  // Případ 4: Use element uvnitř SVG
  if (element.tagName.toLowerCase() === 'use') {
    const svg = element.closest('svg');
    if (svg) {
      return {
        type: 'use',
        content: svg.outerHTML,
        element: svg
      };
    }
  }
  
  return null;
}

// Kontrola, zda je element SVG nebo obsahuje SVG
function isSvgElement(element) {
  if (!element || !element.tagName) return false;
  
  const tagName = element.tagName.toLowerCase();
  
  // Inline SVG nebo jeho potomci
  if (tagName === 'svg' || element.closest('svg')) {
    return true;
  }
  
  // IMG s .svg
  if (tagName === 'img' && element.src && element.src.includes('.svg')) {
    return true;
  }
  
  // Background s SVG
  const bgImage = window.getComputedStyle(element).backgroundImage;
  if (bgImage && bgImage.includes('.svg')) {
    return true;
  }
  
  return false;
}

// Upravte funkci showActionPopup
async function showActionPopup(svgData, mouseX, mouseY) {
  // Pokud už je popup viditelný, neotvírej nový
  if (popupVisible) {
    return;
  }
  
  // Skrýt všechny viditelné notifikace, když se zobrazí nové buttony
  const existingNotifications = document.querySelectorAll('.svag-notification.svag-visible');
  existingNotifications.forEach(notification => {
    notification.classList.add('svag-hiding');
    setTimeout(() => notification.remove(), 200);
  });
  
  if (!previewOverlay) {
    previewOverlay = createActionPopup();
  }
  
  currentHoveredSvg = svgData;
  popupVisible = true;
  
  // Pro img/background načíst obsah předem
  if (!svgData.content && svgData.url) {
    try {
      const response = await fetch(svgData.url);
      svgData.content = await response.text();
    } catch (error) {
      console.error('Chyba při načítání SVG:', error);
    }
  }
  
  // Umístit popup podle nastavení pozice
  const popup = previewOverlay;
  popup.style.display = 'flex';
  
  const popupWidth = 42 * 2 + 4; // 2 ikony + gap (88px celkem)
  const popupHeight = 42;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let left, top;
  
  // Umístit buttony pod kurzor (vždy)
  left = mouseX - 44;  // 44px = polovina celkové šířky (88/2)
  top = mouseY + 20;   // Pod kurzorem
  
  // Kontrola pravého okraje
  if (left + popupWidth > viewportWidth) {
    left = viewportWidth - popupWidth - 10;
  }
  
  // Kontrola levého okraje
  if (left < 10) {
    left = 10;
  }
  
  // Kontrola spodního okraje
  if (top + popupHeight > viewportHeight) {
    top = mouseY - popupHeight - 20; // Pokud není místo dole, přesunout nahoru
  }
  
  // Kontrola horního okraje
  if (top < 10) {
    top = 10;
  }
  
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  
  // Uložit pozici pro notifikace
  popupPosition = { x: left, y: top };
  
  // Animace
  requestAnimationFrame(() => {
    popup.classList.add('svag-visible');
  });
}

// Skrytí action popup
function hideActionPopup() {
  if (previewOverlay) {
    previewOverlay.classList.remove('svag-visible');
    setTimeout(() => {
      previewOverlay.style.display = 'none';
    }, 150);
  }
  currentHoveredSvg = null;
  popupVisible = false;
}

// Vyčištění názvu souboru od neplatných znaků
function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-') // nahradit neplatné znaky pomlčkou
    .replace(/-+/g, '-') // více pomlček za sebou -> jedna
    .replace(/^-|-$/g, '') // odebrat pomlčky ze začátku/konce
    .substring(0, 50); // omezit délku
}

// Extrakce názvu ikony z SVG elementu
function extractIconName(svgElement) {
  if (!svgElement) return null;
  
  // Získat všechny možné zdroje názvu
  const className = svgElement.getAttribute('class') || '';
  const id = svgElement.getAttribute('id') || '';
  const ariaLabel = svgElement.getAttribute('aria-label') || '';
  const dataIcon = svgElement.getAttribute('data-icon') || '';
  const dataName = svgElement.getAttribute('data-name') || '';
  const title = svgElement.querySelector('title')?.textContent || '';
  
  // Patterns pro extrakci názvu ikony
  const patterns = [
    // Font Awesome: "fa fa-home" -> "home"
    /fa[srb]?\s+fa-([a-z0-9-]+)/i,
    /fa-([a-z0-9-]+)/i,
    // Lucide/Feather: "lucide-home" -> "home"
    /lucide-([a-z0-9-]+)/i,
    /feather-([a-z0-9-]+)/i,
    // Bootstrap Icons: "bi-house" -> "house"
    /bi-([a-z0-9-]+)/i,
    // Heroicons: "hero-*"
    /hero(?:icon)?-([a-z0-9-]+)/i,
    // Material Icons
    /material-icons?[_-]([a-z0-9-]+)/i,
    // Generic patterns: "icon-home", "home-icon"
    /icon-([a-z0-9-]+)/i,
    /([a-z0-9-]+)-icon/i,
    // ID patterns: "home-icon", "icon_home"
    /^([a-z0-9-]+)[-_]icon$/i,
    /^icon[-_]([a-z0-9-]+)$/i,
  ];
  
  // Zkusit všechny zdroje
  const sources = [
    { value: dataIcon, priority: 1 },
    { value: dataName, priority: 1 },
    { value: id, priority: 2 },
    { value: className, priority: 3 },
    { value: ariaLabel, priority: 4 },
    { value: title, priority: 5 }
  ];
  
  for (const source of sources) {
    if (!source.value) continue;
    
    // Zkusit všechny patterns
    for (const pattern of patterns) {
      const match = source.value.match(pattern);
      if (match && match[1]) {
        return sanitizeFilename(match[1]);
      }
    }
    
    // Pokud máme data-icon nebo data-name, použij přímo
    if ((source.value === dataIcon || source.value === dataName) && source.value) {
      return sanitizeFilename(source.value);
    }
    
    // Pokud máme title kratší než 30 znaků, použij ho
    if (source.value === title && title.length > 0 && title.length < 30) {
      return sanitizeFilename(title);
    }
  }
  
  // Fallback: zkusit vzít první smysluplné slovo z class
  const words = className.split(/[\s_-]+/).filter(w => 
    w.length > 2 && 
    !['svg', 'icon', 'inline', 'block', 'flex', 'hidden', 'w', 'h', 'mr', 'ml', 'mt', 'mb', 'p', 'text'].includes(w.toLowerCase()) &&
    !w.match(/^[0-9]+$/) && // ignorovat čísla jako "24", "5"
    !w.match(/^h-[0-9]/) && // ignorovat Tailwind utility classes
    !w.match(/^w-[0-9]/)
  );
  
  if (words.length > 0) {
    return sanitizeFilename(words[0]);
  }
  
  // Pokud nic nenajdeme, vrátit null (použije se timestamp)
  return null;
}

// Fallback funkce pro přímé stahování
function downloadDirectly(url, filename, sizeKB = null) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  const message = sizeKB ? `${sizeKB}kb ${filename}` : filename;
  showNotification(message, popupPosition);
}

// Stažení SVG
async function downloadSvg(svgData) {
  let content = svgData.content;
  
  // Pokud ještě nemáme content (pro img/background), načteme ho
  if (!content && svgData.url) {
    try {
      const response = await fetch(svgData.url);
      content = await response.text();
    } catch (error) {
      showNotification('load error', popupPosition);
      return;
    }
  }
  
  if (!content) {
    showNotification('no content', popupPosition);
    return;
  }
  
  // Vytvoření blob a stažení
  const blob = new Blob([content], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const sizeKB = (blob.size / 1024).toFixed(1);
  
  // INTELIGENTNÍ POJMENOVÁNÍ: Pokus o extrakci názvu ikony
  const iconName = extractIconName(svgData.element);
  const timestamp = new Date().getTime();
  
  // Pokud máme název ikony, použij ho, jinak fallback na timestamp
  let filename;
  if (iconName) {
    filename = `${iconName}.svg`;
    console.log(`📝 Icon name detected: ${iconName}`);
  } else {
    filename = `svg-icon-${timestamp}.svg`;
    console.log('📝 No icon name detected, using timestamp');
  }
  
  // Zkontrolovat, zda chrome.runtime existuje
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    try {
      chrome.runtime.sendMessage({
        action: 'download',
        url: url,
        filename: filename
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          showNotification(`error`, popupPosition);
        } else if (response && response.success) {
          showNotification(`${sizeKB}kb ${filename}`, popupPosition);
        } else {
          console.error('Download failed:', response?.error);
          showNotification(`download failed`, popupPosition);
        }
      });
    } catch (error) {
      console.error('Error sending message to background:', error);
      showNotification(`error`, popupPosition);
    }
  } else {
    // Fallback: Stáhnout přímo bez background scriptu
    console.log('chrome.runtime not available, using direct download');
    downloadDirectly(url, filename, sizeKB);
  }
  
  hideActionPopup();
}

// Odeslání do galerie
async function sendToGallery(svgData) {
  let content = svgData.content;
  
  if (!content && svgData.url) {
    const response = await fetch(svgData.url);
    content = await response.text();
  }
  
  if (!content) {
    showNotification('no content', popupPosition);
    return;
  }
  
  // Extrahovat název ikony
  let iconName = 'Bez názvu';
  if (svgData.url) {
    try {
      const url = new URL(svgData.url, window.location.href);
      const pathname = url.pathname;
      const filename = pathname.split('/').pop();
      iconName = filename.replace(/\.(svg|png|jpg|jpeg)$/i, '') || 'Bez názvu';
    } catch {
      // Zkusit extrahovat z URL bez parsování
      const parts = svgData.url.split('/');
      const filename = parts[parts.length - 1];
      if (filename) {
        iconName = filename.replace(/\.(svg|png|jpg|jpeg)$/i, '') || 'Bez názvu';
      }
    }
  }
  
  // Vypočítat velikost SVG v KB
  const sizeInKB = (new Blob([content]).size / 1024).toFixed(2);
  
  // Zkontrolovat, zda je uživatel přihlášen a získat validní token
  const validToken = await getValidToken();
  if (!validToken) {
    // Automaticky otevřít popup pokud není přihlášen
    chrome.runtime.sendMessage({ action: 'openPopup' }, (response) => {
      // Fallback pokud se nepodařilo otevřít popup
      if (chrome.runtime.lastError) {
        showNotification('not logged in - otevřete popup', popupPosition);
      }
    });
    showNotification('not logged in', popupPosition);
    return;
  }
  
  // Získat API URL
  chrome.storage.sync.get(['apiUrl'], async (result) => {
    
    try {
      // Odeslat do API
      const response = await fetch(`${result.apiUrl || 'https://svag.pro'}/api/gallery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({
          svg: content,
          source: window.location.href,
          timestamp: new Date().toISOString(),
          name: iconName,
          size: sizeInKB
        })
      });
      
      if (response.ok) {
        showNotification('saved to gallery', popupPosition);
      } else if (response.status === 400) {
        // Zkontrolovat, zda je to limit error
        const errorData = await response.json();
        if (errorData.error === 'Icon limit reached' && errorData.tier === 'free') {
          showNotification('⚠️ Limit dosažen! Upgradujte na Pro pro 1000 ikon ($9.99/měsíc)', popupPosition);
        } else {
          showNotification('save failed', popupPosition);
        }
      } else {
        showNotification('save failed', popupPosition);
      }
    } catch (error) {
      console.error('Chyba při odesílání do galerie:', error);
      showNotification('connection error', popupPosition);
    }
  });
  
  hideActionPopup();
}

// Notifikace
function showNotification(message, position = null) {
  const notification = document.createElement('div');
  notification.className = 'svag-notification';
  
  // Obalit text do span pro správné z-index nad skeleton
  const textSpan = document.createElement('span');
  textSpan.style.position = 'relative';
  textSpan.style.zIndex = '1';
  textSpan.textContent = message;
  notification.appendChild(textSpan);
  
  // Pokud máme pozici, použij ji
  if (position && position.x && position.y) {
    notification.style.position = 'fixed';
    notification.style.left = `${position.x}px`;
    notification.style.top = `${position.y}px`;
    notification.style.bottom = 'auto';
    notification.style.right = 'auto';
    notification.style.transform = 'translateY(0)';
  }
  
  document.body.appendChild(notification);
  
  // Fade in
  setTimeout(() => notification.classList.add('svag-visible'), 10);
  
  // Fade out s animací po 1500ms
  setTimeout(() => {
    notification.classList.add('svag-hiding');
    setTimeout(() => notification.remove(), 200);
  }, 1500);
}

// Event listenery pro klávesnici
document.addEventListener('keydown', (e) => {
  if (e.key === 'Meta' || e.key === 'Command' || e.key === 'Control') {
    isCommandPressed = true;
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'Meta' || e.key === 'Command' || e.key === 'Control') {
    isCommandPressed = false;
    // removeCopyCursor();
    if (currentHoveredSvg) {
      hideActionPopup();
    }
  }
});

// Hover detection
document.addEventListener('mouseover', (e) => {
  // Kontrola přímo z eventu - spolehlivější než globální proměnné
  const isCommandHeld = e.metaKey || e.ctrlKey;
  
  if (!isCommandHeld) {
    // removeCopyCursor();
    return;
  }
  
  const element = e.target;
  
  // DŮLEŽITÉ: Ignorovat elementy uvnitř našeho popup!
  if (element.closest('#svag-action-popup') || element.id === 'svag-action-popup') {
    return;
  }
  
  // Ignorovat naše notifikace
  if (element.closest('.svag-notification') || element.classList.contains('svag-notification')) {
    return;
  }
  
  // Najít SVG element (může být potomek)
  let svgElement = element;
  if (!isSvgElement(element) && element.closest('svg')) {
    svgElement = element.closest('svg');
  }
  
  if (isSvgElement(svgElement)) {
    // Nastavit copy cursor - VYPNUTO, používáme defaultní cursor
    // setCopyCursor(svgElement);
    
    const svgData = getSvgData(svgElement);
    // Zobrazit popup pouze pokud není viditelný
    if (svgData && !popupVisible) {
      currentHoveredSvg = svgData;
      showActionPopup(svgData, e.clientX, e.clientY);
    }
  } else {
    // Pokud to není SVG, odebrat cursor (ale NESKRÝVAT popup)
    // removeCopyCursor();
  }
});

// Odebrat cursor při opuštění elementu
document.addEventListener('mouseout', (e) => {
  const element = e.target;
  
  if (element === currentCursorElement) {
    // removeCopyCursor();
  }
});

// Skrýt náhled když uživatel pustí klávesu
document.addEventListener('mousemove', (e) => {
  const isCommandHeld = e.metaKey || e.ctrlKey;
  
  if (!isCommandHeld) {
    // removeCopyCursor();
    if (currentHoveredSvg) {
      hideActionPopup();
    }
  }
});

// Klik na SVG s modifikátory
document.addEventListener('click', (e) => {
  // Kontrola přímo z eventu
  const isCommandHeld = e.metaKey || e.ctrlKey;
  
  if (!isCommandHeld) return;
  
  // DŮLEŽITÉ: Ignorovat kliky v našem popup
  if (e.target.closest('#svag-action-popup') || e.target.id === 'svag-action-popup') {
    return;
  }
  
  if (!isSvgElement(e.target) && !e.target.closest('svg')) return;
  
  let svgElement = e.target;
  if (!isSvgElement(e.target) && e.target.closest('svg')) {
    svgElement = e.target.closest('svg');
  }
  
  const svgData = getSvgData(svgElement);
  if (!svgData) return;
  
  // Command + klik zobrazí popup menu s výběrem akce
  e.preventDefault();
  e.stopPropagation();
  
  currentHoveredSvg = svgData;
  popupPosition = { x: e.clientX, y: e.clientY };
  showActionPopup(e.clientX, e.clientY);
});

console.log('svag extension loaded');

