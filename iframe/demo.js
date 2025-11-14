// Sledování stavu klávesnice
let isCommandPressed = false;
let currentHoveredSvg = null;
let previewOverlay = null;
let popupVisible = false;
let popupPosition = { x: 0, y: 0 };

// Pro demo používáme pevné barevné schéma
const colorSchemeSetting = 'white-black';

// Funkce pro aplikování barevného schématu
function applyColorScheme() {
  const root = document.documentElement;
  root.style.setProperty('--svag-bg', '#ffffff');
  root.style.setProperty('--svag-border', '#000000');
  root.style.setProperty('--svag-icon', '#000000');
}

// Vytvoření popup menu s akcemi (gallery a download button)
function createActionPopup() {
  const popup = document.createElement('div');
  popup.id = 'svag-action-popup';
  
  // Gallery (bookmark) a download button pro demo
  popup.innerHTML = `
    <div class="svag-action-item" data-action="gallery">
      <span class="svag-action-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="19" viewBox="0 0 16 19" fill="none">
          <path d="M11 1H5C2.79086 1 1 2.79086 1 5V17L7.41876 12.4152C7.76646 12.1668 8.23354 12.1668 8.58124 12.4152L15 17V5C15 2.79086 13.2091 1 11 1Z" fill="var(--svag-bg)" stroke="var(--svag-border)" stroke-width="2"/>
        </svg>
      </span>
    </div>
    <div class="svag-action-item" data-action="download">
      <span class="svag-action-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" viewBox="0 0 14 16" fill="none">
          <path d="M6.67572 0V14.5M6.67572 14.5L12.6757 9M6.67572 14.5L0.67572 9" stroke="var(--svag-icon)" stroke-width="2"/>
        </svg>
      </span>
    </div>
  `;
  
  document.body.appendChild(popup);
  applyColorScheme();
  
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
        
        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        const maxDistance = 24;
        const fillPercent = Math.max(0, Math.min(1, 1 - (distance / maxDistance)));
        
        button.style.setProperty('--fill-percent', fillPercent);
        
        if (fillPercent > 0.4) {
          button.classList.add('svag-filled');
        } else {
          button.classList.remove('svag-filled');
        }
      });
    });
  };
  
  const mouseMoveHandler = (e) => {
    if (popup.classList.contains('svag-visible')) {
      updateProximityEffect(e);
    }
  };
  
  document.addEventListener('mousemove', mouseMoveHandler);
  
  // Event listener pro gallery button
  const galleryBtn = popup.querySelector('[data-action="gallery"]');
  if (galleryBtn) {
    galleryBtn.addEventListener('mouseenter', () => {
      if (currentHoveredSvg) {
        // Místo skutečného ukládání jen zobrazíme notifikaci
        showNotification('Added to gallery', popupPosition);
        hideActionPopup();
      }
    });
  }
  
  // Event listener pro download
  const downloadBtn = popup.querySelector('[data-action="download"]');
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

// Získání SVG dat
function getSvgData(element) {
  if (element.tagName.toLowerCase() === 'svg') {
    return {
      type: 'inline',
      content: element.outerHTML,
      element: element
    };
  }
  
  if (element.tagName.toLowerCase() === 'img' && element.src && element.src.includes('.svg')) {
    return {
      type: 'img',
      url: element.src,
      element: element
    };
  }
  
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

// Kontrola, zda je element SVG
function isSvgElement(element) {
  if (!element || !element.tagName) return false;
  
  const tagName = element.tagName.toLowerCase();
  
  if (tagName === 'svg' || element.closest('svg')) {
    return true;
  }
  
  if (tagName === 'img' && element.src && element.src.includes('.svg')) {
    return true;
  }
  
  const bgImage = window.getComputedStyle(element).backgroundImage;
  if (bgImage && bgImage.includes('.svg')) {
    return true;
  }
  
  return false;
}

// Zobrazení action popup
async function showActionPopup(svgData, mouseX, mouseY) {
  if (popupVisible) {
    return;
  }
  
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
  
  if (!svgData.content && svgData.url) {
    try {
      const response = await fetch(svgData.url);
      svgData.content = await response.text();
    } catch (error) {
      console.error('Chyba při načítání SVG:', error);
    }
  }
  
  const popup = previewOverlay;
  popup.style.display = 'flex';
  
  const popupWidth = 42 * 2 + 4; // Dva buttony + gap (88px celkem - stejně jako extension)
  const popupHeight = 42;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let left, top;
  
  left = mouseX - 44; // 44px = polovina šířky (88/2)
  top = mouseY + 20;
  
  if (left + popupWidth > viewportWidth) {
    left = viewportWidth - popupWidth - 10;
  }
  
  if (left < 10) {
    left = 10;
  }
  
  if (top + popupHeight > viewportHeight) {
    top = mouseY - popupHeight - 20;
  }
  
  if (top < 10) {
    top = 10;
  }
  
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  
  popupPosition = { x: left, y: top };
  
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

// Vyčištění názvu souboru
function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// Extrakce názvu ikony
function extractIconName(svgElement) {
  if (!svgElement) return null;
  
  const className = svgElement.getAttribute('class') || '';
  const id = svgElement.getAttribute('id') || '';
  const ariaLabel = svgElement.getAttribute('aria-label') || '';
  const dataIcon = svgElement.getAttribute('data-icon') || '';
  const dataName = svgElement.getAttribute('data-name') || '';
  const title = svgElement.querySelector('title')?.textContent || '';
  
  const patterns = [
    /fa[srb]?\s+fa-([a-z0-9-]+)/i,
    /fa-([a-z0-9-]+)/i,
    /lucide-([a-z0-9-]+)/i,
    /feather-([a-z0-9-]+)/i,
    /bi-([a-z0-9-]+)/i,
    /hero(?:icon)?-([a-z0-9-]+)/i,
    /material-icons?[_-]([a-z0-9-]+)/i,
    /icon-([a-z0-9-]+)/i,
    /([a-z0-9-]+)-icon/i,
    /^([a-z0-9-]+)[-_]icon$/i,
    /^icon[-_]([a-z0-9-]+)$/i,
  ];
  
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
    
    for (const pattern of patterns) {
      const match = source.value.match(pattern);
      if (match && match[1]) {
        return sanitizeFilename(match[1]);
      }
    }
    
    if ((source.value === dataIcon || source.value === dataName) && source.value) {
      return sanitizeFilename(source.value);
    }
    
    if (source.value === title && title.length > 0 && title.length < 30) {
      return sanitizeFilename(title);
    }
  }
  
  const words = className.split(/[\s_-]+/).filter(w => 
    w.length > 2 && 
    !['svg', 'icon', 'inline', 'block', 'flex', 'hidden', 'w', 'h', 'mr', 'ml', 'mt', 'mb', 'p', 'text'].includes(w.toLowerCase()) &&
    !w.match(/^[0-9]+$/) &&
    !w.match(/^h-[0-9]/) &&
    !w.match(/^w-[0-9]/)
  );
  
  if (words.length > 0) {
    return sanitizeFilename(words[0]);
  }
  
  return null;
}

// Přímé stahování (bez Chrome API)
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
  
  const blob = new Blob([content], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const sizeKB = (blob.size / 1024).toFixed(1);
  
  const iconName = extractIconName(svgData.element);
  const timestamp = new Date().getTime();
  
  let filename;
  if (iconName) {
    filename = `${iconName}.svg`;
  } else {
    filename = `svg-icon-${timestamp}.svg`;
  }
  
  // Přímé stahování (bez Chrome API)
  downloadDirectly(url, filename, sizeKB);
  
  hideActionPopup();
}

// Notifikace
function showNotification(message, position = null) {
  const notification = document.createElement('div');
  notification.className = 'svag-notification';
  
  const textSpan = document.createElement('span');
  textSpan.style.position = 'relative';
  textSpan.style.zIndex = '1';
  textSpan.textContent = message;
  notification.appendChild(textSpan);
  
  if (position && position.x && position.y) {
    notification.style.position = 'fixed';
    notification.style.left = `${position.x}px`;
    notification.style.top = `${position.y}px`;
    notification.style.bottom = 'auto';
    notification.style.right = 'auto';
    notification.style.transform = 'translateY(0)';
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => notification.classList.add('svag-visible'), 10);
  
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
    if (currentHoveredSvg) {
      hideActionPopup();
    }
  }
});

// Hover detection
document.addEventListener('mouseover', (e) => {
  const isCommandHeld = e.metaKey || e.ctrlKey;
  
  if (!isCommandHeld) {
    return;
  }
  
  const element = e.target;
  
  if (element.closest('#svag-action-popup') || element.id === 'svag-action-popup') {
    return;
  }
  
  if (element.closest('.svag-notification') || element.classList.contains('svag-notification')) {
    return;
  }
  
  let svgElement = element;
  if (!isSvgElement(element) && element.closest('svg')) {
    svgElement = element.closest('svg');
  }
  
  if (isSvgElement(svgElement)) {
    const svgData = getSvgData(svgElement);
    if (svgData && !popupVisible) {
      currentHoveredSvg = svgData;
      showActionPopup(svgData, e.clientX, e.clientY);
    }
  }
});

// Skrýt náhled když uživatel pustí klávesu
document.addEventListener('mousemove', (e) => {
  const isCommandHeld = e.metaKey || e.ctrlKey;
  
  if (!isCommandHeld) {
    if (currentHoveredSvg) {
      hideActionPopup();
    }
  }
});

console.log('svag demo loaded ✨');

