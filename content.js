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

// 🧪 Debug helper funkce - dostupné v Console
window.svagDebug = {
  // Získat token z storage
  getToken: async function() {
    const result = await chrome.storage.sync.get(['apiToken', 'apiUrl', 'refreshToken']);
    console.log('📦 API Token:', result.apiToken);
    console.log('📍 API URL:', result.apiUrl);
    console.log('🔄 Refresh Token:', result.refreshToken ? '✅ Dostupný' : '❌ Chybí');
    return result.apiToken;
  },
  
  // Dekódovat token
  decodeToken: async function() {
    const result = await chrome.storage.sync.get(['apiToken']);
    if (!result.apiToken) {
      console.error('❌ Token nenalezen');
      return null;
    }
    
    try {
      const payload = JSON.parse(atob(result.apiToken.split('.')[1]));
      const exp = new Date(payload.exp * 1000);
      const now = new Date();
      const timeLeft = ((exp - now) / 1000 / 60).toFixed(1);
      
      console.log('🔍 Token Info:');
      console.log('   User ID:', payload.userId);
      console.log('   Email:', payload.email);
      console.log('   Expirace:', exp.toLocaleString());
      console.log('   Status:', exp > now ? `✅ Platný (${timeLeft} min)` : '❌ VYPRŠEL');
      
      return payload;
    } catch (error) {
      console.error('❌ Chyba při dekódování:', error);
      return null;
    }
  },
  
  // Testovat API call
  testGalleryAPI: async function() {
    const result = await chrome.storage.sync.get(['apiToken', 'apiUrl']);
    
    if (!result.apiToken) {
      console.error('❌ Token nenalezen - přihlaste se v extension popup');
      return;
    }
    
    const testSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" fill="#000"/></svg>`;
    const apiUrl = `${result.apiUrl || 'https://www.svag.pro'}/api/gallery`;
    
    console.log('🚀 Testuji API call...');
    console.log('   URL:', apiUrl);
    console.log('   Token length:', result.apiToken.length);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${result.apiToken}`
        },
        body: JSON.stringify({
          svg: testSvg,
          name: 'test-debug-' + Date.now()
        })
      });
      
      const data = await response.text();
      
      if (response.ok) {
        console.log('✅ SUCCESS!', JSON.parse(data));
      } else {
        console.error(`❌ ERROR ${response.status}:`, data);
      }
      
      return { status: response.status, data };
    } catch (error) {
      console.error('❌ Fetch error:', error);
      return null;
    }
  },
  
  // Nápověda
  help: function() {
    console.log('🧪 svag Debug Helper v1.2.0');
    console.log('');
    console.log('Dostupné příkazy:');
    console.log('  svagDebug.getToken()        - Zobrazí token z storage');
    console.log('  svagDebug.decodeToken()     - Dekóduje a zobrazí info o tokenu');
    console.log('  svagDebug.testGalleryAPI()  - Testuje API call na /api/gallery');
    console.log('  svagDebug.help()            - Zobrazí tuto nápovědu');
    console.log('');
    console.log('💡 TIP: Všechny funkce jsou async, použijte await:');
    console.log('   await svagDebug.testGalleryAPI()');
  }
};

console.log('🧪 [svag v1.2.0] Debug helper načten. Zadejte "svagDebug.help()" pro nápovědu.');

// Helper funkce pro kontrolu a refresh tokenu
async function getValidToken() {
  const result = await chrome.storage.sync.get(['apiToken']);
  
  if (!result.apiToken) {
    console.log('[svag v1.2.0] getValidToken: Token chybí v storage');
    return null;
  }
  
  try {
    const payload = JSON.parse(atob(result.apiToken.split('.')[1]));
    const expiresAt = payload.exp * 1000;
    const now = Date.now();
    const timeUntilExpire = (expiresAt - now) / 1000 / 60;
    
    console.log(`[svag v1.2.0] Token expires in ${timeUntilExpire.toFixed(1)} minutes`);
    
    // Pokud token už vypršel, nelze ho použít
    if (expiresAt <= now) {
      console.error('[svag v1.2.0] Token EXPIRED');
      return null;
    }
    
    // Token je validní
    console.log('[svag v1.2.0] Token is valid');
    return result.apiToken;
    
  } catch (error) {
    console.error('[svag v1.2.0] Error processing token:', error);
    return null;
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

// Helper funkce pro dekódování SVG data URI
function decodeSvgDataUri(dataUri) {
  try {
    // data:image/svg+xml;base64,PHN2Zy...
    if (dataUri.includes(';base64,')) {
      const base64 = dataUri.split(';base64,')[1];
      return atob(base64);
    }
    // data:image/svg+xml,%3Csvg... (URL encoded)
    else if (dataUri.includes('data:image/svg+xml,')) {
      const encoded = dataUri.split('data:image/svg+xml,')[1];
      return decodeURIComponent(encoded);
    }
    // data:image/svg+xml;charset=utf-8,...
    else if (dataUri.includes('charset=')) {
      const parts = dataUri.split(',');
      if (parts.length > 1) {
        return decodeURIComponent(parts.slice(1).join(','));
      }
    }
  } catch (error) {
    console.error('Error decoding SVG data URI:', error);
  }
  return null;
}

// Helper funkce pro hledání elementu v shadow DOM
function findElementInShadowDOM(elementId) {
  const allElements = document.querySelectorAll('*');
  
  for (const element of allElements) {
    if (element.shadowRoot) {
      try {
        const found = element.shadowRoot.getElementById(elementId);
        if (found) {
          return found;
        }
        
        // Rekurzivně hledat ve vnořených shadow roots
        const nestedSearch = findInShadowRootRecursive(element.shadowRoot, elementId);
        if (nestedSearch) {
          return nestedSearch;
        }
      } catch (error) {
        console.debug('[svag] Cannot access shadow root:', error);
      }
    }
  }
  
  return null;
}

// Rekurzivní hledání v shadow DOM
function findInShadowRootRecursive(shadowRoot, elementId) {
  const found = shadowRoot.getElementById(elementId);
  if (found) return found;
  
  const children = shadowRoot.querySelectorAll('*');
  for (const child of children) {
    if (child.shadowRoot) {
      const nested = findInShadowRootRecursive(child.shadowRoot, elementId);
      if (nested) return nested;
    }
  }
  
  return null;
}

// === NOVÝ EXTRACTION LAYER v1.2.0 ===
// Zjednodušený systém pro extrakci čistého SVG bez závislosti na CSS třídách

/**
 * Extrahuje všechny shape elementy ze zdrojového elementu a vytvoří čisté kopie
 * @param {Element} sourceElement - Element obsahující SVG shapes
 * @returns {Array<Element>} Pole čistých SVG elementů
 */
function extractShapes(sourceElement, inheritedFill = null, inheritedStroke = null) {
  const shapes = [];
  const shapeTypes = ['path', 'circle', 'rect', 'ellipse', 'line', 'polygon', 'polyline', 'g'];
  
  // OPRAVA 1: Použít :scope selector pro vyhnutí se duplicitám
  // Najdi pouze PŘÍMÉ children, ne všechny nested
  const selector = shapeTypes.map(t => `:scope > ${t}`).join(', ');
  const elements = sourceElement.querySelectorAll(selector);
  
  elements.forEach(el => {
    const tagName = el.tagName.toLowerCase();
    const newEl = document.createElementNS('http://www.w3.org/2000/svg', tagName);
    
    // Geometry atributy podle typu elementu
    const geometryAttrs = {
      'path': ['d'],
      'circle': ['cx', 'cy', 'r'],
      'rect': ['x', 'y', 'width', 'height', 'rx', 'ry'],
      'ellipse': ['cx', 'cy', 'rx', 'ry'],
      'line': ['x1', 'y1', 'x2', 'y2'],
      'polygon': ['points'],
      'polyline': ['points'],
      'g': [] // Group nemá geometry atributy
    };
    
    // Zkopírovat geometry atributy
    (geometryAttrs[tagName] || []).forEach(attr => {
      if (el.hasAttribute(attr)) {
        newEl.setAttribute(attr, el.getAttribute(attr));
      }
    });
    
    // Zkopírovat transform pokud existuje
    if (el.hasAttribute('transform')) {
      newEl.setAttribute('transform', el.getAttribute('transform'));
    }
    
    // Zkopírovat stroke atributy pokud existují JAKO ATRIBUTY
    const strokeAttrs = ['stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 
                         'stroke-dasharray', 'stroke-dashoffset', 'stroke-miterlimit'];
    strokeAttrs.forEach(attr => {
      if (el.hasAttribute(attr)) {
        newEl.setAttribute(attr, el.getAttribute(attr));
      }
    });
    
    // OPRAVA 2 & 3: Inteligentní fill/stroke detection
    try {
      const computed = window.getComputedStyle(el);
      const fill = computed.fill;
      const stroke = computed.stroke;
      const strokeWidth = computed.strokeWidth;
      
      // Aplikovat computed fill pokud není 'none'
      if (fill && fill !== 'none') {
        // Vyčistit fill hodnotu (odstranit duplicitní #)
        const cleanFill = fill.replace(/^#+/, '#');
        newEl.setAttribute('fill', cleanFill);
        console.debug(`[svag v1.2.0] extractShapes: Aplikován computed fill: ${cleanFill}`);
      } else if (inheritedFill && inheritedFill !== 'none') {
        // OPRAVA 4: Použít inherited fill z parent <use>
        newEl.setAttribute('fill', inheritedFill);
        console.debug(`[svag v1.2.0] extractShapes: Aplikován inherited fill: ${inheritedFill}`);
      } else if (!stroke || stroke === 'none') {
        // OPRAVA 4: Fallback na currentColor POUZE pokud nemá stroke
        newEl.setAttribute('fill', 'currentColor');
        console.debug('[svag v1.2.0] extractShapes: Fallback fill: currentColor');
      }
      
      // OPRAVA 3: Aplikovat computed stroke pokud není v atributech
      if (!newEl.hasAttribute('stroke')) {
        if (stroke && stroke !== 'none') {
          const cleanStroke = stroke.replace(/^#+/, '#');
          newEl.setAttribute('stroke', cleanStroke);
          console.debug(`[svag v1.2.0] extractShapes: Aplikován computed stroke: ${cleanStroke}`);
        } else if (inheritedStroke && inheritedStroke !== 'none') {
          // OPRAVA 4: Použít inherited stroke z parent <use>
          newEl.setAttribute('stroke', inheritedStroke);
          console.debug(`[svag v1.2.0] extractShapes: Aplikován inherited stroke: ${inheritedStroke}`);
        }
      }
      
      // Aplikovat computed stroke-width pokud není v atributech
      if (!newEl.hasAttribute('stroke-width') && strokeWidth && strokeWidth !== '0px' && (newEl.hasAttribute('stroke') || stroke !== 'none')) {
        newEl.setAttribute('stroke-width', strokeWidth);
        console.debug(`[svag v1.2.0] extractShapes: Aplikován computed stroke-width: ${strokeWidth}`);
      }
    } catch (error) {
      console.debug('[svag v1.2.0] extractShapes: Chyba při získávání computed style:', error);
      // Fallback pouze pokud nemáme inherited values
      if (!inheritedFill && !inheritedStroke) {
        newEl.setAttribute('fill', 'currentColor');
      }
    }
    
    // Pokud je to group, zpracovat children rekurzivně
    // Předat inherited values dál
    if (tagName === 'g') {
      const childShapes = extractShapes(el, inheritedFill, inheritedStroke);
      childShapes.forEach(child => newEl.appendChild(child));
    }
    
    shapes.push(newEl);
  });
  
  // Handle <use> elements - expandovat je inline
  // OPRAVA 1: Použít :scope pro vyhnutí se vnořeným <use>
  const useElements = sourceElement.querySelectorAll(':scope > use');
  useElements.forEach(useEl => {
    const href = useEl.getAttribute('href') || useEl.getAttribute('xlink:href');
    if (href && href.startsWith('#')) {
      const symbolId = href.substring(1);
      
      // Najít referencovaný element
      let symbol = document.getElementById(symbolId);
      
      // Zkusit shadow DOM pokud nenalezen
      if (!symbol) {
        symbol = findElementInShadowDOM(symbolId);
      }
      
      // Zkusit v <defs>
      if (!symbol) {
        const allDefs = document.querySelectorAll('defs, svg');
        for (const def of allDefs) {
          try {
            const found = def.querySelector(`#${CSS.escape(symbolId)}`);
            if (found) {
              symbol = found;
              break;
            }
          } catch (error) {
            console.debug('[svag v1.2.0] extractShapes: Error with CSS.escape:', error);
          }
        }
      }
      
      if (symbol) {
        console.log(`[svag v1.2.0] extractShapes: Expanduji <use> → #${symbolId}`);
        
        // OPRAVA 4: Získat fill/stroke z <use> elementu pro dědičnost
        try {
          const useComputed = window.getComputedStyle(useEl);
          const useFill = useComputed.fill;
          const useStroke = useComputed.stroke;
          
          // Předat fill/stroke jako inherited values do rekurze
          const expandedShapes = extractShapes(
            symbol,
            useFill && useFill !== 'none' ? useFill : inheritedFill,
            useStroke && useStroke !== 'none' ? useStroke : inheritedStroke
          );
          
          console.debug(`[svag v1.2.0] extractShapes: Inherited fill: ${useFill}, stroke: ${useStroke}`);
          
          // Aplikovat transform z <use> pokud existuje
          const useTransform = useEl.getAttribute('transform');
          if (useTransform && expandedShapes.length > 0) {
            // Zabalit do <g> s transform
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('transform', useTransform);
            expandedShapes.forEach(shape => g.appendChild(shape));
            shapes.push(g);
          } else {
            shapes.push(...expandedShapes);
          }
        } catch (error) {
          console.error('[svag v1.2.0] extractShapes: Chyba při zpracování <use>:', error);
        }
      } else {
        console.warn(`[svag v1.2.0] extractShapes: Symbol #${symbolId} nenalezen`);
      }
    }
  });
  
  return shapes;
}

/**
 * Extrahuje čistý SVG z elementu
 * @param {Element} svgElement - SVG element z DOM
 * @returns {Object} { content: string, name: string }
 */
function extractCleanSvg(svgElement) {
  console.log('[svag v1.2.0] extractCleanSvg: Začínám extrakci...');
  
  // Vytvořit nový čistý SVG
  const cleanSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  cleanSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  cleanSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  
  // ViewBox - zkusit získat z různých zdrojů
  let viewBox = svgElement.getAttribute('viewBox');
  
  // Pokud není viewBox, zkusit ze symbolu pokud je <use>
  if (!viewBox) {
    const useElement = svgElement.querySelector('use');
    if (useElement) {
      const href = useElement.getAttribute('href') || useElement.getAttribute('xlink:href');
      if (href && href.startsWith('#')) {
        const symbolId = href.substring(1);
        const symbol = document.getElementById(symbolId) || findElementInShadowDOM(symbolId);
        if (symbol && symbol.hasAttribute('viewBox')) {
          viewBox = symbol.getAttribute('viewBox');
        }
      }
    }
  }
  
  // Fallback viewBox
  if (!viewBox) {
    const width = svgElement.getAttribute('width') || '24';
    const height = svgElement.getAttribute('height') || '24';
    viewBox = `0 0 ${width} ${height}`;
  }
  
  cleanSvg.setAttribute('viewBox', viewBox);
  
  // Extrahovat shapes
  const shapes = extractShapes(svgElement);
  console.log(`[svag v1.2.0] extractCleanSvg: Extrahovano ${shapes.length} shapes`);
  
  shapes.forEach(shape => cleanSvg.appendChild(shape));
  
  // Extrahovat název ikony
  const name = svgElement.getAttribute('data-dssvgid') || 
               extractIconName(svgElement) || 
               'icon';
  
  console.log(`[svag v1.2.0] extractCleanSvg: Název ikony: ${name}`);
  
  return {
    content: cleanSvg.outerHTML,
    name: name
  };
}

// === NOVÉ v1.3.0: Podpora pro externí sprite soubory ===

/**
 * Extrahuje rendered SVG z <use> elementu i když symbol není v DOM
 * Používá computed styles a serializaci pro získání skutečné vizuální reprezentace
 * @param {Element} svgElement - SVG element obsahující <use>
 * @returns {string|null} Serializovaný SVG nebo null
 */
function extractRenderedSvgFromUse(svgElement) {
  console.log('[svag v1.3.0] Extracting rendered SVG from <use> element...');
  
  try {
    const useElement = svgElement.querySelector('use');
    if (!useElement) return null;
    
    // Získat computed styles z parent SVG
    const svgStyles = window.getComputedStyle(svgElement);
    const useStyles = window.getComputedStyle(useElement);
    
    // Klonovat celý SVG
    const clonedSvg = svgElement.cloneNode(true);
    const clonedUse = clonedSvg.querySelector('use');
    
    // Aplikovat computed fill a stroke na <use> element
    // Získat computed hodnoty (už vyřešené CSS variables)
    const computedFill = svgStyles.fill || useStyles.fill;
    const computedStroke = svgStyles.stroke || useStyles.stroke;
    
    // Získat původní atributy pro případ, že computed nefunguje
    const originalFill = svgElement.getAttribute('fill');
    
    if (computedFill && computedFill !== 'none' && computedFill !== 'rgba(0, 0, 0, 0)' && !computedFill.includes('var(')) {
      clonedUse.setAttribute('fill', computedFill);
    } else if (originalFill && !originalFill.includes('var(')) {
      clonedUse.setAttribute('fill', originalFill);
    }
    
    if (computedStroke && computedStroke !== 'none' && computedStroke !== 'rgba(0, 0, 0, 0)') {
      clonedUse.setAttribute('stroke', computedStroke);
      const strokeWidth = svgStyles.strokeWidth || useStyles.strokeWidth;
      if (strokeWidth) clonedUse.setAttribute('stroke-width', strokeWidth);
    }
    
    // Odstranit inline fill ze SVG pokud je nastaven, aby <use> fill fungoval
    clonedSvg.removeAttribute('fill');
    
    console.log('[svag v1.3.0] Successfully extracted rendered SVG');
    return clonedSvg.outerHTML;
    
  } catch (error) {
    console.error('[svag v1.3.0] Error extracting rendered SVG:', error);
    return null;
  }
}

/**
 * Pokusí se najít a stáhnout externí sprite soubor
 * @param {string} symbolId - ID symbolu k nalezení
 * @returns {Promise<Object|null>} Promise s objektem {symbol, spriteUrl} nebo null
 */
async function fetchSpriteSymbol(symbolId) {
  console.log(`[svag v1.3.0] Searching for sprite file containing symbol: ${symbolId}`);
  
  // Hledat možné sprite soubory v dokumentu
  const possibleSpriteUrls = new Set();
  
  // 1. Hledat ve všech <use> elementech s externími odkazy
  document.querySelectorAll('use[href], use[xlink\\:href]').forEach(use => {
    const href = use.getAttribute('href') || use.getAttribute('xlink:href');
    if (href && href.includes('.svg')) {
      const spriteUrl = href.split('#')[0];
      possibleSpriteUrls.add(spriteUrl);
    }
  });
  
  // 2. Hledat ve všech <img> a <object> s .svg obsahujícím "sprite"
  document.querySelectorAll('img[src*=".svg"], object[data*=".svg"]').forEach(el => {
    const url = el.src || el.getAttribute('data');
    if (url && (url.includes('sprite') || url.includes('icon'))) {
      possibleSpriteUrls.add(url);
    }
  });
  
  // 3. Hledat v <link> preload nebo resource hints
  document.querySelectorAll('link[href*=".svg"]').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href.includes('sprite') || href.includes('icon'))) {
      possibleSpriteUrls.add(href);
    }
  });
  
  console.log(`[svag v1.3.0] Found ${possibleSpriteUrls.size} possible sprite files`);
  
  // Zkusit stáhnout každý sprite a najít symbol
  for (const spriteUrl of possibleSpriteUrls) {
    try {
      const response = await fetch(spriteUrl);
      if (!response.ok) continue;
      
      const svgText = await response.text();
      
      // Parsovat SVG
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
      
      // Najít symbol v sprite souboru
      const symbol = svgDoc.getElementById(symbolId);
      if (symbol) {
        console.log(`[svag v1.3.0] ✅ Found symbol in sprite: ${spriteUrl}`);
        return {
          symbol: symbol,
          spriteUrl: spriteUrl,
          svgDoc: svgDoc
        };
      }
    } catch (error) {
      console.debug(`[svag v1.3.0] Could not fetch sprite: ${spriteUrl}`, error);
    }
  }
  
  console.log(`[svag v1.3.0] ❌ Symbol ${symbolId} not found in any sprite file`);
  return null;
}

/**
 * Serializuje SVG včetně všech computed stylů (fallback metoda)
 * @param {Element} svgElement - SVG element k serializaci
 * @returns {string} Serializovaný SVG
 */
function serializeSvgWithComputedStyles(svgElement) {
  console.log('[svag v1.3.0] Serializing SVG with computed styles...');
  
  const clonedSvg = svgElement.cloneNode(true);
  
  // Projít všechny elementy a aplikovat computed styles
  function applyComputedStyles(element, originalElement) {
    if (!originalElement || !element) return;
    
    try {
      const computed = window.getComputedStyle(originalElement);
      const importantStyles = ['fill', 'stroke', 'stroke-width', 'opacity', 'transform', 'color'];
      
      importantStyles.forEach(prop => {
        let value = computed[prop];
        if (!value || value === 'none' || value === 'rgba(0, 0, 0, 0)') return;
        
        // Konvertovat CSS variables na skutečné hodnoty
        if (value.includes('var(')) {
          const computedValue = computed.getPropertyValue(prop);
          if (computedValue) value = computedValue;
        }
        
        // Aplikovat jako atribut (ne inline style)
        element.setAttribute(prop, value);
      });
    } catch (error) {
      console.debug('[svag v1.3.0] Error applying computed styles:', error);
    }
    
    // Rekurzivně pro děti
    Array.from(element.children).forEach((child, i) => {
      if (originalElement.children[i]) {
        applyComputedStyles(child, originalElement.children[i]);
      }
    });
  }
  
  applyComputedStyles(clonedSvg, svgElement);
  return clonedSvg.outerHTML;
}

// Helper funkce pro resolving <use> elementů s interními referencemi (vylepšená v1.1.2)
function resolveUseElement(useElement) {
  const href = useElement.getAttribute('href') || useElement.getAttribute('xlink:href');
  
  if (!href || !href.startsWith('#')) {
    return null;
  }
  
  // Získat ID bez #
  const symbolId = href.substring(1);
  
  // Najít symbol/element podle ID v celém dokumentu
  let referencedElement = document.getElementById(symbolId);
  
  // Pokud nenajdeme v main document, zkusit shadow DOM
  if (!referencedElement) {
    console.log(`[svag] Symbol "${symbolId}" not found in main document, searching shadow DOM...`);
    referencedElement = findElementInShadowDOM(symbolId);
  }
  
  // Pokud stále není nalezen, zkusit najít v defs/svg elementech
  if (!referencedElement) {
    console.log(`[svag] Searching for symbol "${symbolId}" in <defs> and <svg> elements...`);
    const allDefs = document.querySelectorAll('defs, svg');
    for (const def of allDefs) {
      try {
        const found = def.querySelector(`#${CSS.escape(symbolId)}`);
        if (found) {
          referencedElement = found;
          console.log(`[svag] Found symbol in <defs>/<svg>`);
          break;
        }
      } catch (error) {
        // CSS.escape může selhat na některých ID
        console.debug('[svag] Error with CSS.escape:', error);
      }
    }
  }
  
  if (!referencedElement) {
    console.warn(`[svag v1.3.0] Symbol/element with id "${symbolId}" not found in DOM`);
    
    // Vypsat dostupné symboly pro debugging
    const allSymbols = document.querySelectorAll('symbol');
    if (allSymbols.length > 0) {
      console.log(`[svag v1.3.0] Available symbols in DOM (${allSymbols.length}):`, 
        Array.from(allSymbols).slice(0, 10).map(s => s.id).filter(id => id));
    }
    
    // 🆕 STRATEGIE 1: Zkusit extrahovat rendered SVG (nejrychlejší)
    const parentSvg = useElement.closest('svg');
    if (parentSvg) {
      console.log('[svag v1.3.0] Attempting to extract rendered SVG...');
      const renderedSvg = extractRenderedSvgFromUse(parentSvg);
      if (renderedSvg) {
        console.log('[svag v1.3.0] ✅ Successfully extracted rendered SVG');
        return renderedSvg;
      }
    }
    
    // 🆕 STRATEGIE 2: Pokusit se najít a stáhnout sprite soubor (asynchronní)
    console.log('[svag v1.3.0] Attempting to fetch external sprite file...');
    fetchSpriteSymbol(symbolId).then(result => {
      if (result) {
        console.log('[svag v1.3.0] ✅ Symbol found in external sprite:', result.spriteUrl);
        // Symbol byl nalezen - mohli bychom ho cachovat pro budoucí použití
        // Pro teď jen logujeme úspěch
      } else {
        console.log('[svag v1.3.0] ℹ️ Symbol not found in any external sprite');
      }
    }).catch(error => {
      console.debug('[svag v1.3.0] Error fetching sprite:', error);
    });
    
    // 🆕 STRATEGIE 3: Fallback - serializovat se všemi computed styles
    if (parentSvg) {
      console.log('[svag v1.3.0] Using fallback: serializing with computed styles...');
      const serialized = serializeSvgWithComputedStyles(parentSvg);
      if (serialized) {
        console.log('[svag v1.3.0] ✅ Fallback serialization successful');
        return serialized;
      }
    }
    
    console.error('[svag v1.3.0] ❌ All extraction strategies failed');
    return null;
  }
  
  console.log(`[svag] Found symbol: #${symbolId} (${referencedElement.tagName})`);
  
  // Vytvořit nový SVG element
  const parentSvg = useElement.closest('svg');
  const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  
  // NOVÉ: Přidat XML namespace definice (oprava xlink:href error)
  newSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  newSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  
  // Zkopírovat důležité atributy z původního SVG
  if (parentSvg) {
    ['viewBox', 'width', 'height', 'preserveAspectRatio'].forEach(attr => {
      const value = parentSvg.getAttribute(attr);
      if (value) {
        newSvg.setAttribute(attr, value);
      }
    });
  }
  
  // Zkopírovat viewBox ze symbolu/referencovaného elementu, pokud existuje (má přednost)
  const tagName = referencedElement.tagName.toLowerCase();
  if (tagName === 'symbol' || tagName === 'svg') {
    const symbolViewBox = referencedElement.getAttribute('viewBox');
    if (symbolViewBox) {
      newSvg.setAttribute('viewBox', symbolViewBox);
    }
    
    // Zkopírovat width/height ze symbolu
    ['width', 'height'].forEach(attr => {
      const value = referencedElement.getAttribute(attr);
      if (value) {
        newSvg.setAttribute(attr, value);
      }
    });
  }
  
  // NOVÉ v1.2.0: Použití nového extraction layeru
  console.log('[svag v1.2.0] resolveUseElement: Začínám extrakci shapes...');
  
  const extractedShapes = extractShapes(referencedElement);
  
  // Přidat extrahované shapes do nového SVG
  extractedShapes.forEach(shape => {
    newSvg.appendChild(shape);
  });
  
  console.log(`[svag v1.2.0] resolveUseElement: Extrahovano ${extractedShapes.length} shapes`);
  
  // Zkopírovat inline styly z <use> nebo parent <svg> (fill, stroke, atd.)
  const useStyles = window.getComputedStyle(useElement);
  const parentStyles = parentSvg ? window.getComputedStyle(parentSvg) : null;
  
  // Aplikovat fill pokud je definovaný
  const fill = useStyles.fill || (parentStyles && parentStyles.fill);
  if (fill && fill !== 'rgb(0, 0, 0)' && fill !== 'none') {
    // Pokud fill je CSS variable, použít computed hodnotu
    if (fill.startsWith('var(')) {
      const computedFill = useStyles.fill;
      if (computedFill && computedFill !== 'rgb(0, 0, 0)') {
        // OPRAVA: Ošetřit případný dvojitý # (##ff0000 -> #ff0000)
        const cleanFill = computedFill.replace(/^#+/, '#');
        newSvg.setAttribute('fill', cleanFill);
      }
    } else {
      // OPRAVA: Ošetřit případný dvojitý # (##ff0000 -> #ff0000)
      const cleanFill = fill.replace(/^#+/, '#');
      newSvg.setAttribute('fill', cleanFill);
    }
  }
  
  // Aplikovat stroke pokud je definovaný
  const stroke = useStyles.stroke || (parentStyles && parentStyles.stroke);
  if (stroke && stroke !== 'none') {
    // OPRAVA: Ošetřit případný dvojitý #
    const cleanStroke = stroke.replace(/^#+/, '#');
    newSvg.setAttribute('stroke', cleanStroke);
  }
  
  console.log(`[svag] Resolved <use> reference: #${symbolId}`);
  return newSvg.outerHTML;
}

// Helper funkce pro skenování Shadow DOM
function scanShadowRoots(element) {
  const svgs = [];
  
  // Zkontrolovat shadow root na tomto elementu
  if (element.shadowRoot) {
    try {
      const shadowSvgs = element.shadowRoot.querySelectorAll('svg, img[src*=".svg"], img[src^="data:image/svg"]');
      svgs.push(...Array.from(shadowSvgs));
    } catch (error) {
      console.debug('[svag] Cannot access shadow root:', error);
    }
  }
  
  // Rekurzivně prohledat všechny potomky
  try {
    const children = element.querySelectorAll('*');
    children.forEach(child => {
      if (child.shadowRoot) {
        const childSvgs = scanShadowRoots(child);
        svgs.push(...childSvgs);
      }
    });
  } catch (error) {
    console.debug('[svag] Error scanning shadow roots:', error);
  }
  
  return svgs;
}

// Helper funkce pro nalezení SVG v elementu nebo jeho potomcích (opravená v1.1.3)
function findSvgInElement(element, mouseX, mouseY) {
  if (!element) return null;
  
  // PRIORITA 1: Element JE přímo <svg> tag
  if (element.tagName && element.tagName.toLowerCase() === 'svg') {
    return element;
  }
  
  // PRIORITA 2: SVG je parent tohoto elementu (např. klik na <use> nebo <path>)
  const closestSvg = element.closest('svg');
  if (closestSvg) {
    return closestSvg;
  }
  
  // PRIORITA 3: Použít elementFromPoint pro NEJPŘESNĚJŠÍ detekci
  // (najde element přímo pod kurzorem, ignoruje pointer-events)
  if (mouseX !== undefined && mouseY !== undefined) {
    try {
      // Dočasně skrýt current element
      const originalPointerEvents = element.style.pointerEvents;
      element.style.pointerEvents = 'none';
      
      // Získat element pod kurzorem
      const elementBelow = document.elementFromPoint(mouseX, mouseY);
      
      // Obnovit pointer-events
      element.style.pointerEvents = originalPointerEvents;
      
      if (elementBelow && elementBelow !== element) {
        // Zkontrolovat jestli element pod je SVG
        if (elementBelow.tagName && elementBelow.tagName.toLowerCase() === 'svg') {
          console.log('[svag] Found SVG using elementFromPoint');
          return elementBelow;
        }
        // Nebo má SVG jako parent
        const svgParent = elementBelow.closest('svg');
        if (svgParent) {
          console.log('[svag] Found SVG parent using elementFromPoint');
          return svgParent;
        }
      }
    } catch (error) {
      console.debug('[svag] Error using elementFromPoint:', error);
    }
  }
  
  // PRIORITA 4: SVG je direct child tohoto elementu (např. button > svg)
  const svgChild = element.querySelector('svg');
  if (svgChild) {
    return svgChild;
  }
  
  // PRIORITA 5: IMG s SVG jako child
  const imgSvg = element.querySelector('img[src*=".svg"], img[src^="data:image/svg"]');
  if (imgSvg) {
    return imgSvg;
  }
  
  // PRIORITA 6: Hledat SVG v siblings (sourozence)
  try {
    const parent = element.parentElement;
    if (parent) {
      const siblings = parent.children;
      for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (sibling !== element && sibling.tagName && sibling.tagName.toLowerCase() === 'svg') {
          return sibling;
        }
      }
    }
  } catch (error) {
    console.debug('[svag] Error searching siblings:', error);
  }
  
  // PRIORITA 7: Hledat jakýkoliv SVG element v children (rekurzivně)
  try {
    const allChildren = element.querySelectorAll('*');
    // Omezit na prvních 50 elementů pro performance
    for (let i = 0; i < Math.min(allChildren.length, 50); i++) {
      const child = allChildren[i];
      if (child.tagName && child.tagName.toLowerCase() === 'svg') {
        return child;
      }
    }
  } catch (error) {
    console.debug('[svag] Error searching for SVG in children:', error);
  }
  
  // PRIORITA 8: Teprve teď zkontrolovat isSvgElement() pro elementy s SVG vlastnostmi
  // (background, mask, atd.) - POUZE pokud jsme nenašli skutečný SVG element
  if (isSvgElement(element)) {
    // Vrátit element s SVG vlastnostmi (background, mask, etc)
    return element;
  }
  
  return null;
}

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
        // NOVÉ v1.2.0: Použití nového extraction layeru
        console.log('[svag v1.2.0] galleryBtn: Extrakce čistého SVG...');
        
        // Najít skutečný SVG element z objektu currentHoveredSvg
        let svgElement = currentHoveredSvg.element;
        
        // Pokud to není přímo <svg>, najít SVG uvnitř
        if (svgElement && svgElement.tagName.toLowerCase() !== 'svg') {
          svgElement = svgElement.querySelector('svg');
        }
        
        if (svgElement) {
          const cleanData = extractCleanSvg(svgElement);
          sendToGallery(cleanData, currentHoveredSvg.element);
        } else {
          console.error('[svag v1.2.0] SVG element nenalezen pro gallery');
        }
        
        hideActionPopup();
      }
    });
  }
  
  if (downloadBtn) {
    downloadBtn.addEventListener('mouseenter', () => {
      if (currentHoveredSvg) {
        // NOVÉ v1.2.0: Použití nového extraction layeru
        console.log('[svag v1.2.0] downloadBtn: Extrakce čistého SVG...');
        
        // Najít skutečný SVG element z objektu currentHoveredSvg
        let svgElement = currentHoveredSvg.element;
        
        // Pokud to není přímo <svg>, najít SVG uvnitř
        if (svgElement && svgElement.tagName.toLowerCase() !== 'svg') {
          svgElement = svgElement.querySelector('svg');
        }
        
        if (svgElement) {
          const cleanData = extractCleanSvg(svgElement);
          downloadSvg(cleanData, currentHoveredSvg.element);
        } else {
          console.error('[svag v1.2.0] SVG element nenalezen pro download');
        }
        
        hideActionPopup();
      }
    });
  }
  
  return popup;
}

// Získání SVG dat z různých zdrojů (vylepšená verze)
function getSvgData(element) {
  if (!element) return null;
  
  const tagName = element.tagName?.toLowerCase();
  
  // Případ 1: Inline SVG - ALE NEJPRVE zkontrolovat <use> elementy!
  if (tagName === 'svg') {
    // NOVÉ: Zkontrolovat, zda SVG obsahuje <use> element s interní referencí
    const useElement = element.querySelector('use[href^="#"], use[xlink\\:href^="#"]');
    if (useElement) {
      console.log('[svag] SVG obsahuje <use> element, resolving...');
      const href = useElement.getAttribute('href') || useElement.getAttribute('xlink:href');
      
      // Pokud je to interní reference, vyřešit ji
      if (href && href.startsWith('#')) {
        const resolvedContent = resolveUseElement(useElement);
        if (resolvedContent) {
          console.log('[svag] <use> element úspěšně vyřešen');
          return {
            type: 'use-resolved',
            content: resolvedContent,
            element: element
          };
        }
      }
    }
    
    // Standardní inline SVG (bez <use> nebo pokud se nepodařilo vyřešit)
    return {
      type: 'inline',
      content: element.outerHTML,
      element: element
    };
  }
  
  // Případ 2: IMG s SVG (včetně data URI)
  if (tagName === 'img' && element.src) {
    // Data URI SVG
    if (element.src.startsWith('data:image/svg+xml')) {
      const content = decodeSvgDataUri(element.src);
      if (content) {
        return {
          type: 'data-uri',
          content: content,
          element: element
        };
      }
    }
    // Běžné .svg soubory
    if (element.src.includes('.svg') || element.src.match(/\.svg[?#]/)) {
      return {
        type: 'img',
        url: element.src,
        element: element
      };
    }
  }
  
  // Případ 3: OBJECT element
  if (tagName === 'object') {
    const data = element.getAttribute('data');
    const type = element.getAttribute('type');
    if ((type === 'image/svg+xml' || (data && data.includes('.svg')))) {
      return {
        type: 'object',
        url: data,
        element: element
      };
    }
  }
  
  // Případ 4: EMBED element
  if (tagName === 'embed') {
    const src = element.getAttribute('src');
    const type = element.getAttribute('type');
    if ((type === 'image/svg+xml' || (src && src.includes('.svg')))) {
      return {
        type: 'embed',
        url: src,
        element: element
      };
    }
  }
  
  // Případ 5: Element s SVG background (včetně data URI)
  const styles = window.getComputedStyle(element);
  const bgImage = styles.backgroundImage;
  
  if (bgImage && bgImage !== 'none') {
    // Data URI v background
    if (bgImage.includes('data:image/svg+xml')) {
      const dataUriMatch = bgImage.match(/url\(['"]?(data:image\/svg\+xml[^'"')]+)['"]?\)/);
      if (dataUriMatch) {
        const content = decodeSvgDataUri(dataUriMatch[1]);
        if (content) {
          return {
            type: 'background-data-uri',
            content: content,
            element: element
          };
        }
      }
    }
    // Běžné .svg v background
    if (bgImage.includes('.svg')) {
      const urlMatch = bgImage.match(/url\(['"]?(.*?\.svg[^'"')]*?)['"]?\)/);
      if (urlMatch) {
        return {
          type: 'background',
          url: urlMatch[1],
          element: element
        };
      }
    }
  }
  
  // Případ 6: CSS mask
  const mask = styles.mask || styles.webkitMask;
  if (mask && mask.includes('.svg')) {
    const urlMatch = mask.match(/url\(['"]?(.*?\.svg[^'"')]*?)['"]?\)/);
    if (urlMatch) {
      return {
        type: 'mask',
        url: urlMatch[1],
        element: element
      };
    }
  }
  
  // Případ 7: CSS clip-path
  const clipPath = styles.clipPath || styles.webkitClipPath;
  if (clipPath && clipPath.includes('.svg')) {
    const urlMatch = clipPath.match(/url\(['"]?(.*?\.svg[^'"')]*?)['"]?\)/);
    if (urlMatch) {
      return {
        type: 'clip-path',
        url: urlMatch[1],
        element: element
      };
    }
  }
  
  // Případ 8: USE element s externím sprite nebo interní referencí
  if (tagName === 'use') {
    const href = element.getAttribute('href') || element.getAttribute('xlink:href');
    const svg = element.closest('svg');
    
    if (href && href.includes('.svg')) {
      // Externí sprite
      return {
        type: 'sprite',
        url: href,
        element: svg || element
      };
    } else if (href && href.startsWith('#')) {
      // Interní use - vyřešit referenci na symbol
      const resolvedContent = resolveUseElement(element);
      if (resolvedContent) {
        return {
          type: 'use-resolved',
          content: resolvedContent,
          element: svg || element
        };
      }
      // Fallback na původní SVG pokud se nepodařilo vyřešit
      return {
        type: 'use',
        content: svg ? svg.outerHTML : element.outerHTML,
        element: svg || element
      };
    } else if (svg) {
      // Interní use bez href
      return {
        type: 'use',
        content: svg.outerHTML,
        element: svg
      };
    }
  }
  
  // Případ 9: PICTURE element
  if (tagName === 'picture') {
    const sources = element.querySelectorAll('source');
    for (const source of sources) {
      const srcset = source.getAttribute('srcset');
      const type = source.getAttribute('type');
      if ((type === 'image/svg+xml' || (srcset && srcset.includes('.svg')))) {
        return {
          type: 'picture',
          url: srcset,
          element: element
        };
      }
    }
  }
  
  // Případ 10: IFRAME s SVG
  if (tagName === 'iframe') {
    const src = element.getAttribute('src');
    const srcdoc = element.getAttribute('srcdoc');
    
    if (src && src.includes('.svg')) {
      return {
        type: 'iframe',
        url: src,
        element: element
      };
    }
    
    if (srcdoc && srcdoc.includes('<svg')) {
      return {
        type: 'iframe-srcdoc',
        content: srcdoc,
        element: element
      };
    }
  }
  
  // Případ 11: CSS list-style-image
  const listStyleImage = styles.listStyleImage;
  if (listStyleImage && listStyleImage !== 'none') {
    if (listStyleImage.includes('data:image/svg+xml')) {
      const dataUriMatch = listStyleImage.match(/url\(['"]?(data:image\/svg\+xml[^'"')]+)['"]?\)/);
      if (dataUriMatch) {
        const content = decodeSvgDataUri(dataUriMatch[1]);
        if (content) {
          return {
            type: 'list-style-data-uri',
            content: content,
            element: element
          };
        }
      }
    }
    if (listStyleImage.includes('.svg')) {
      const urlMatch = listStyleImage.match(/url\(['"]?(.*?\.svg[^'"')]*?)['"]?\)/);
      if (urlMatch) {
        return {
          type: 'list-style-image',
          url: urlMatch[1],
          element: element
        };
      }
    }
  }
  
  // Případ 12: CSS cursor
  const cursor = styles.cursor;
  if (cursor && cursor.includes('.svg')) {
    const urlMatch = cursor.match(/url\(['"]?(.*?\.svg[^'"')]*?)['"]?\)/);
    if (urlMatch) {
      return {
        type: 'cursor',
        url: urlMatch[1],
        element: element
      };
    }
  }
  
  // Případ 13: CSS border-image
  const borderImage = styles.borderImage || styles.borderImageSource;
  if (borderImage && borderImage !== 'none' && borderImage.includes('.svg')) {
    const urlMatch = borderImage.match(/url\(['"]?(.*?\.svg[^'"')]*?)['"]?\)/);
    if (urlMatch) {
      return {
        type: 'border-image',
        url: urlMatch[1],
        element: element
      };
    }
  }
  
  // Případ 14: CSS filter
  const filter = styles.filter || styles.webkitFilter;
  if (filter && filter !== 'none' && filter.includes('.svg')) {
    const urlMatch = filter.match(/url\(['"]?(.*?\.svg[^'"')]*?)['"]?\)/);
    if (urlMatch) {
      return {
        type: 'filter',
        url: urlMatch[1],
        element: element
      };
    }
  }
  
  // Případ 15: CSS shape-outside
  const shapeOutside = styles.shapeOutside;
  if (shapeOutside && shapeOutside !== 'none' && shapeOutside.includes('.svg')) {
    const urlMatch = shapeOutside.match(/url\(['"]?(.*?\.svg[^'"')]*?)['"]?\)/);
    if (urlMatch) {
      return {
        type: 'shape-outside',
        url: urlMatch[1],
        element: element
      };
    }
  }
  
  // Případ 16: Zkontrolovat pseudo-elementy (::before, ::after)
  try {
    const beforeContent = window.getComputedStyle(element, '::before').content;
    const afterContent = window.getComputedStyle(element, '::after').content;
    
    for (const content of [beforeContent, afterContent]) {
      if (content && content.includes('.svg')) {
        const urlMatch = content.match(/url\(['"]?(.*?\.svg[^'"')]*?)['"]?\)/);
        if (urlMatch) {
          return {
            type: 'pseudo-element',
            url: urlMatch[1],
            element: element
          };
        }
      }
    }
  } catch (error) {
    // Některé browsery mohou vyhodit chybu při přístupu k pseudo-elementům
    console.debug('[svag] Cannot access pseudo-elements:', error);
  }
  
  // Případ 17: Foreign Object
  if (tagName === 'foreignobject') {
    // Scan obsah foreignObject pro SVG
    const svgInside = element.querySelector('svg, img[src*=".svg"]');
    if (svgInside) {
      return getSvgData(svgInside);
    }
  }
  
  return null;
}

// Kontrola, zda je element SVG nebo obsahuje SVG (kompletně vylepšená verze)
function isSvgElement(element) {
  if (!element || !element.tagName) return false;
  
  const tagName = element.tagName.toLowerCase();
  
  // Inline SVG nebo jeho potomci
  if (tagName === 'svg' || element.closest('svg')) {
    return true;
  }
  
  // IMG s .svg nebo SVG data URI
  if (tagName === 'img' && element.src) {
    if (element.src.startsWith('data:image/svg+xml') || 
        element.src.includes('.svg')) {
      return true;
    }
  }
  
  // OBJECT a EMBED s SVG
  if (tagName === 'object' || tagName === 'embed') {
    const src = element.getAttribute('src') || element.getAttribute('data');
    const type = element.getAttribute('type');
    if (type === 'image/svg+xml' || (src && src.includes('.svg'))) {
      return true;
    }
  }
  
  // PICTURE element s SVG
  if (tagName === 'picture') {
    const sources = element.querySelectorAll('source');
    for (const source of sources) {
      const srcset = source.getAttribute('srcset');
      const type = source.getAttribute('type');
      if (type === 'image/svg+xml' || (srcset && srcset.includes('.svg'))) {
        return true;
      }
    }
  }
  
  // IFRAME s SVG
  if (tagName === 'iframe') {
    const src = element.getAttribute('src');
    const srcdoc = element.getAttribute('srcdoc');
    if ((src && src.includes('.svg')) || (srcdoc && srcdoc.includes('<svg'))) {
      return true;
    }
  }
  
  // Foreign Object
  if (tagName === 'foreignobject') {
    const svgInside = element.querySelector('svg, img[src*=".svg"]');
    if (svgInside) {
      return true;
    }
  }
  
  // Computed styles
  const styles = window.getComputedStyle(element);
  
  // Background s SVG (včetně data URI)
  const bgImage = styles.backgroundImage;
  if (bgImage && (bgImage.includes('.svg') || bgImage.includes('data:image/svg+xml'))) {
    return true;
  }
  
  // CSS mask
  const mask = styles.mask || styles.webkitMask;
  if (mask && mask.includes('.svg')) {
    return true;
  }
  
  // CSS clip-path
  const clipPath = styles.clipPath || styles.webkitClipPath;
  if (clipPath && clipPath.includes('.svg')) {
    return true;
  }
  
  // CSS list-style-image
  const listStyleImage = styles.listStyleImage;
  if (listStyleImage && (listStyleImage.includes('.svg') || listStyleImage.includes('data:image/svg+xml'))) {
    return true;
  }
  
  // CSS cursor
  const cursor = styles.cursor;
  if (cursor && cursor.includes('.svg')) {
    return true;
  }
  
  // CSS border-image
  const borderImage = styles.borderImage || styles.borderImageSource;
  if (borderImage && borderImage.includes('.svg')) {
    return true;
  }
  
  // CSS filter
  const filter = styles.filter || styles.webkitFilter;
  if (filter && filter.includes('.svg')) {
    return true;
  }
  
  // CSS shape-outside
  const shapeOutside = styles.shapeOutside;
  if (shapeOutside && shapeOutside.includes('.svg')) {
    return true;
  }
  
  // Pseudo-elementy
  try {
    const beforeContent = window.getComputedStyle(element, '::before').content;
    const afterContent = window.getComputedStyle(element, '::after').content;
    if ((beforeContent && beforeContent.includes('.svg')) || 
        (afterContent && afterContent.includes('.svg'))) {
      return true;
    }
  } catch (error) {
    // Ignorovat chyby při přístupu k pseudo-elementům
    console.debug('[svag] Cannot access pseudo-elements:', error);
  }
  
  // Zkontrolovat Shadow DOM (pokud je dostupný)
  if (element.shadowRoot) {
    try {
      const shadowSvgs = element.shadowRoot.querySelectorAll('svg, img[src*=".svg"]');
      if (shadowSvgs.length > 0) {
        return true;
      }
    } catch (error) {
      console.debug('[svag] Cannot access shadow root:', error);
    }
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
  
  // NOVÉ: Pokud element není SVG, zkusit najít SVG uvnitř
  const tagName = svgElement.tagName?.toLowerCase();
  if (tagName !== 'svg' && tagName !== 'img') {
    const svgChild = svgElement.querySelector('svg');
    if (svgChild) {
      console.log('[svag] extractIconName: Našel jsem SVG uvnitř wrapperu, používám SVG element');
      svgElement = svgChild;
    }
  }
  
  // Získat všechny možné zdroje názvu
  const className = svgElement.getAttribute('class') || '';
  const id = svgElement.getAttribute('id') || '';
  const ariaLabel = svgElement.getAttribute('aria-label') || '';
  const dataIcon = svgElement.getAttribute('data-icon') || '';
  const dataName = svgElement.getAttribute('data-name') || '';
  const dataDssvgid = svgElement.getAttribute('data-dssvgid') || ''; // NOVÉ: Podpora pro data-dssvgid
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
  
  // Zkusit všechny zdroje (PRIORITA!)
  const sources = [
    { value: dataDssvgid, priority: 0, name: 'data-dssvgid' }, // NEJVYŠŠÍ priorita
    { value: dataIcon, priority: 1, name: 'data-icon' },
    { value: dataName, priority: 1, name: 'data-name' },
    { value: id, priority: 2, name: 'id' },
    { value: ariaLabel, priority: 3, name: 'aria-label' },
    { value: title, priority: 4, name: 'title' },
    { value: className, priority: 5, name: 'class' } // NEJNIŽŠÍ priorita
  ];
  
  for (const source of sources) {
    if (!source.value) continue;
    
    // Pokud máme data-dssvgid, data-icon nebo data-name, použij PŘÍMO (nejvyšší priorita)
    if (source.name === 'data-dssvgid' || source.name === 'data-icon' || source.name === 'data-name') {
      const sanitized = sanitizeFilename(source.value);
      if (sanitized) {
        console.log(`[svag] Název extrahován z ${source.name}: ${sanitized}`);
        return sanitized;
      }
    }
    
    // Zkusit všechny patterns
    for (const pattern of patterns) {
      const match = source.value.match(pattern);
      if (match && match[1]) {
        const sanitized = sanitizeFilename(match[1]);
        console.log(`[svag] Název extrahován z ${source.name} (pattern): ${sanitized}`);
        return sanitized;
      }
    }
    
    // Pokud máme title kratší než 30 znaků, použij ho
    if (source.name === 'title' && source.value.length > 0 && source.value.length < 30) {
      const sanitized = sanitizeFilename(source.value);
      console.log(`[svag] Název extrahován z title: ${sanitized}`);
      return sanitized;
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

// NOVÉ v1.2.0: Zjednodušené stažení SVG (vždy máme čistý content z extractCleanSvg)
async function downloadSvg(cleanData, element) {
  console.log('[svag v1.2.0] downloadSvg: Začínám stahování...');
  
  const content = cleanData.content;
  const iconName = cleanData.name;
  
  if (!content) {
    showNotification('no content', popupPosition);
    return;
  }
  
  // Vytvoření blob a stažení
  const blob = new Blob([content], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const sizeKB = (blob.size / 1024).toFixed(1);
  
  // Použít název z cleanData
  const filename = `${iconName}.svg`;
  console.log(`[svag v1.2.0] downloadSvg: Název souboru: ${filename} (${sizeKB}kb)`);
  
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

// NOVÉ v1.2.0: Zjednodušené odeslání do galerie (vždy máme čistý content z extractCleanSvg)
async function sendToGallery(cleanData, element) {
  console.log('[svag v1.2.0] sendToGallery: Začínám odesílání...');
  console.log('[svag v1.2.0] sendToGallery: cleanData:', cleanData);
  
  if (!cleanData || typeof cleanData !== 'object') {
    console.error('[svag v1.2.0] sendToGallery: Neplatný cleanData:', cleanData);
    showNotification('extraction error', popupPosition);
    hideActionPopup();
    return;
  }
  
  const content = cleanData.content;
  const iconName = cleanData.name;
  
  if (!content) {
    console.error('[svag v1.2.0] sendToGallery: Chybí content v cleanData');
    showNotification('no content', popupPosition);
    hideActionPopup();
    return;
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
    hideActionPopup();
    return;
  }
  
  try {
    // Získat API URL
    const result = await chrome.storage.sync.get(['apiUrl']);
    const apiUrl = `${result.apiUrl || 'https://www.svag.pro'}/api/gallery`;
    
    console.log('[svag v1.2.0] sendToGallery: Odesílám do API...');
    
    // Přímý fetch (content script context umožňuje CORS s host_permissions)
    const response = await fetch(apiUrl, {
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
      console.log('[svag v1.2.0] sendToGallery: Úspěšně uloženo do galerie');
      showNotification('saved to gallery', popupPosition);
      hideActionPopup();
    } else if (response.status === 401) {
      // Token není validní - vyžaduje re-login
      console.error('[svag v1.2.0] Gallery API error 401: Unauthorized - please re-login');
      showNotification('not logged in - please re-login', popupPosition);
      chrome.runtime.sendMessage({ action: 'openPopup' });
      hideActionPopup();
    } else if (response.status === 400) {
      // Zkontrolovat, zda je to limit error
      const errorData = await response.json();
      if (errorData.error === 'Icon limit reached' && errorData.tier === 'free') {
        showNotification('⚠️ Limit dosažen! Upgradujte na Pro pro 1000 ikon ($9.99/měsíc)', popupPosition);
      } else {
        console.error('[svag v1.2.0] Gallery API error 400:', errorData);
        showNotification('save failed', popupPosition);
      }
      hideActionPopup();
    } else {
      console.error('[svag v1.2.0] Gallery API error:', response.status);
      showNotification('save failed', popupPosition);
      hideActionPopup();
    }
  } catch (error) {
    console.error('[svag v1.2.0] Chyba při odesílání do galerie:', error);
    showNotification('connection error', popupPosition);
    hideActionPopup();
  }
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
  
  // Najít SVG element - předat souřadnice myši pro elementFromPoint
  const svgElement = findSvgInElement(element, e.clientX, e.clientY);
  
  if (svgElement) {
    const svgData = getSvgData(svgElement);
    // Zobrazit popup pouze pokud není viditelný a máme platná data
    if (svgData && !popupVisible) {
      currentHoveredSvg = svgData;
      showActionPopup(svgData, e.clientX, e.clientY);
    }
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
  
  // Najít SVG element s mouse souřadnicemi
  const svgElement = findSvgInElement(e.target, e.clientX, e.clientY);
  
  if (!svgElement) return;
  
  const svgData = getSvgData(svgElement);
  if (!svgData) return;
  
  // Command + klik zobrazí popup menu s výběrem akce
  e.preventDefault();
  e.stopPropagation();
  
  currentHoveredSvg = svgData;
  popupPosition = { x: e.clientX, y: e.clientY };
  showActionPopup(svgData, e.clientX, e.clientY);
});

// MutationObserver pro sledování dynamicky přidaných SVG
let mutationObserverEnabled = true;
let mutationDebounceTimer = null;

const svgMutationObserver = new MutationObserver((mutations) => {
  if (!mutationObserverEnabled) return;
  
  // Debouncing - čekat 500ms před zpracováním
  if (mutationDebounceTimer) {
    clearTimeout(mutationDebounceTimer);
  }
  
  mutationDebounceTimer = setTimeout(() => {
    mutations.forEach((mutation) => {
      // Zkontrolovat přidané nody
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Pokud je to SVG nebo element obsahující SVG
          if (isSvgElement(node)) {
            console.log('[svag] New SVG element detected:', node.tagName);
          }
          
          // Zkontrolovat děti
          if (node.querySelectorAll) {
            const svgs = node.querySelectorAll('svg, img[src*=".svg"], img[src^="data:image/svg"]');
            if (svgs.length > 0) {
              console.log(`[svag] ${svgs.length} new SVG element(s) detected in added subtree`);
            }
          }
        }
      });
    });
  }, 500);
});

// Spustit observer
svgMutationObserver.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('svag extension loaded - extraction layer rewrite v1.2.0');
console.log('Supported SVG types: inline, img, data-uri, object, embed, background, sprite, mask, clip-path, pseudo-elements, picture, iframe, css-cursor, css-list-style, css-border-image, css-filter, css-shape-outside, foreign-object, shadow-dom, use-resolved');
console.log('MutationObserver: active - tracking dynamic SVG additions');
console.log('🚀 EXTRACTION LAYER REWRITE v1.2.0:');
console.log('  ✅ Nový jednoduchý extraction systém (extractCleanSvg + extractShapes)');
console.log('  ✅ VŽDY extrahuje čisté SVG bez class atributů');
console.log('  ✅ VŽDY aplikuje computed fill/stroke z CSS');
console.log('  ✅ Automaticky expanduje <use> elementy inline');
console.log('  ✅ Fallback na currentColor pokud fill není definován');
console.log('  🎯 Výsledek: Jednodušší kód, robustnější extrakce, 100% čistý SVG!');


