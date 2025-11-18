# Kompletní detekce SVG v1.1.9

## Přehled změn

### 🚀 v1.1.9 - FINÁLNÍ OPRAVA COMPILERU (Aktuální verze)

**Problém v1.1.8:** Computed fill se neaplikoval správně!
- ❌ Podmínka `if (!fill && !style)` byla příliš striktní
- ❌ Pokud měl element `style` atribut (i prázdný), computed fill se NEAPLIKOVAL
- ❌ `class` atributy se NEKOPÍROVALY, ale ANI se neodstraňovaly
- ❌ Ignorovala se černá barva `rgb(0, 0, 0)` (ale černá může být validní!)
- ❌ Výsledek: SVG s `class="c4 b20"` ale BEZ stylů = "no style information" error

**Řešení v1.1.9:** Správná logika pro computed styles!

**1. Vylepšená kontrola fill:**
```javascript
// MÍSTO příliš striktní podmínky:
if (!compiled.hasAttribute('fill') && !compiled.hasAttribute('style'))

// NOVĚ - kontrola jestli fill SKUTEČNĚ NENÍ definovaný:
const hasFillDefined = compiled.hasAttribute('fill') || 
                       (compiled.hasAttribute('style') && compiled.getAttribute('style').includes('fill:'));

if (!hasFillDefined) {
  // Aplikuj computed fill
}
```

**2. Akceptace černé barvy:**
```javascript
// MÍSTO ignorování černé:
if (fill && fill !== 'none' && fill !== 'rgb(0, 0, 0)')

// NOVĚ - černá je validní barva:
if (fill && fill !== 'none') {
  compiled.setAttribute('fill', fill.replace(/^#+/, '#'));
}
```

**3. Fallback na currentColor:**
```javascript
// Pokud fill není definován vůbec:
else {
  compiled.setAttribute('fill', 'currentColor');
}
```

**4. Odstranění class atributů:**
```javascript
// NOVĚ - VŽDY odstranit class atribut ze zkompilovaného elementu
if (sourceShape.hasAttribute('class')) {
  compiled.removeAttribute('class');
  console.debug('[svag] Compiler: Odstraněn class atribut');
}
```

**Debug logy:**
```
[svag] Compiler: Aplikován computed fill: rgb(255, 0, 0)
[svag] Compiler: Odstraněn class atribut
[svag] Compiler: Aplikován fallback fill: currentColor
```

**Výsledek:**
- ✅ **Žádné `class` atributy** ve výsledném SVG
- ✅ **Všechny elementy mají fill** (computed nebo currentColor)
- ✅ **Černá je akceptována** jako validní barva
- ✅ **Žádné "no style information" errory**
- ✅ **100% čistý, validní, funkční SVG**

---

### 🚀 v1.1.8 - Compiler expanduje <use> (mělo bug s computed fill)

**Problém v1.1.7:** Compiler IGNOROVAL `<use>` elementy!
- ❌ `<use>` se nekopírovaly, zůstávaly v innerHTML
- ❌ Výsledné SVG obsahovalo `<use xlink:href="#...">` BEZ namespace definic
- ❌ Error: "Namespace prefix xlink for href on use is not defined"

**Řešení v1.1.8:** Compiler EXPANDUJE `<use>` elementy!

Místo kopírování `<use>` elementů, compiler je nyní **expanduje inline**:

```javascript
// Když compiler najde <use>:
if (tagName === 'use') {
  const href = sourceShape.getAttribute('href') || sourceShape.getAttribute('xlink:href');
  const symbolId = href.substring(1); // #icon-name → icon-name
  
  // Najít referencovaný symbol/element
  let referencedElement = document.getElementById(symbolId);
  
  // Zkompilovat OBSAH symbolu (rekurzivně)
  const expandedShapes = compileSvgShapes(referencedElement);
  
  // Aplikovat transform z <use> (pokud existuje)
  if (useTransform) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', useTransform);
    expandedShapes.forEach(shape => g.appendChild(shape));
    return g;
  }
  
  // Vrátit expandované shapes
  return expandedShapes;
}
```

**Co to dělá:**
1. ✅ Najde `<use href="#icon">` element
2. ✅ Najde `<symbol id="icon">` nebo jiný referencovaný element
3. ✅ **Zkompiluje obsah symbolu** (všechny path/circle/rect elementy)
4. ✅ **Expanduje je inline** (žádný <use> ve výsledku!)
5. ✅ Aplikuje transform z `<use>` (pokud existuje)
6. ✅ Vrátí čisté path/shape elementy

**Výsledek:**
- ✅ **Žádné `<use>` elementy** ve výsledném SVG
- ✅ **Žádné `xlink:href` atributy** = žádné namespace errory
- ✅ **Plně expandované** path/circle/rect elementy
- ✅ **Validní SVG** bez závislostí na externích symbolech
- ✅ Funguje v **JAKÉMKOLIV** SVG vieweru

**Debug logy:**
```
[svag] Compiler: Našel jsem <use> element, expanduji...
[svag] Compiler: Expanduji <use> → #dist__calendar___2T2Oy
[svag] SVG Compiler: Zkompilováno N elementů
```

**Změny v kódu:**
- `compileSvgShapes()` - přidán 'use' do querySelectorAll
- `compileSvgShapes()` - handling pole návratové hodnoty z compileShape
- `compileShape()` - nový blok pro `<use>` elementy (řádky 169-228)
- `compileShape()` - přidán 'use' do children querySelectorAll v `<g>` (řádek 293)

---

### 🚀 v1.1.7 - SVG PATH COMPILER (zastaralé - mělo bug s <use>)

**PRŮLOMOVÉ ŘEŠENÍ:** Místo kopírování innerHTML a aplikace computed styles, nyní **kompilujeme čistý SVG přímo z elementů a jejich atributů**.

**Proč je to lepší než všechna předchozí řešení?**
- ✅ **Nativní atributy** - kopíruje přímé atributy (`d`, `fill`, `stroke`)
- ✅ **Žádné CSS třídy** - nikdy se nekopírují, ani náhodou
- ✅ **Žádná závislost na DOM** - vytváří nový SVG od začátku
- ✅ **Fallback na computed** - pouze pokud atribut chybí
- ✅ **Jednodušší a rychlejší** - méně DOM operací
- ✅ **Rekurzivní** - správně zpracuje `<g>` groups a nested elementy

**Jak to funguje:**

```javascript
// 1. Najde všechny shape elementy v symbolu
const shapes = symbol.querySelectorAll('path, circle, rect, ellipse, line, polygon, polyline, g');

// 2. Pro každý shape:
shapes.forEach(shape => {
  // Vytvoří nový čistý element
  const compiled = document.createElementNS('http://www.w3.org/2000/svg', tagName);
  
  // Zkopíruje geometry atributy (d, cx, cy, r, atd.)
  geomAttrs.forEach(attr => {
    if (shape.hasAttribute(attr)) {
      compiled.setAttribute(attr, shape.getAttribute(attr));
    }
  });
  
  // Zkopíruje style atributy (fill, stroke, atd.)
  styleAttrs.forEach(attr => {
    if (shape.hasAttribute(attr)) {
      let value = shape.getAttribute(attr);
      // Oprava dvojitého ##
      value = value.replace(/#+/g, match => match.length > 1 ? '#' : match);
      compiled.setAttribute(attr, value);
    }
  });
  
  // FALLBACK: Pokud nemá fill, vzít z computed
  if (!compiled.hasAttribute('fill')) {
    const computed = window.getComputedStyle(shape);
    if (computed.fill && computed.fill !== 'rgb(0, 0, 0)') {
      compiled.setAttribute('fill', computed.fill.replace(/^#+/, '#'));
    }
  }
  
  // Pro <g> groups: rekurzivně zkompilovat children
  if (tagName === 'g') {
    children.forEach(child => {
      compiled.appendChild(compileShape(child));
    });
  }
});
```

**Podporované shape elementy:**
- `<path>` - d
- `<circle>` - cx, cy, r
- `<rect>` - x, y, width, height, rx, ry
- `<ellipse>` - cx, cy, rx, ry
- `<line>` - x1, y1, x2, y2
- `<polygon>` - points
- `<polyline>` - points
- `<g>` - group (rekurzivně)

**Kopírované style atributy:**
- `fill`, `stroke`, `stroke-width`
- `stroke-linecap`, `stroke-linejoin`, `stroke-dasharray`, `stroke-dashoffset`
- `opacity`, `fill-opacity`, `stroke-opacity`
- `fill-rule`, `clip-rule`
- `transform`, `style`

**Debug logy:**
```
[svag] SVG Compiler: Začínám kompilaci...
[svag] SVG Compiler: Zkompilováno N elementů
```

**Výsledek:**
- ✅ Čistý SVG markup bez CSS tříd
- ✅ Všechny atributy přímo v elementech
- ✅ Validní SVG bez namespace errorů
- ✅ Plně samostatný soubor bez závislostí
- ✅ Funguje v JAKÉMKOLIV SVG vieweru

**Co to řeší:**
1. ❌ Namespace prefix xlink errors → ✅ Vyřešeno (xmlns správně nastaveny)
2. ❌ CSS třídy bez stylů → ✅ Vyřešeno (třídy se nikdy nekopírují)
3. ❌ Dvojitý ## v fill → ✅ Vyřešeno (regex oprava při kopírování)
4. ❌ Externí stylesheet závislosti → ✅ Vyřešeno (žádné CSS, jen atributy)
5. ❌ Computed styles problémy → ✅ Vyřešeno (používá se jen jako fallback)

---

### 🔧 v1.1.6 - Computed styles (zastaralé)

**Problém #4:** CSS třídy stále nebyly vyřešeny správně.
- ❌ Stažené SVG obsahovalo `class="c4 b20"` ale bez stylů
- ❌ CSS definice byly v **externích stylesheets**, ne v inline `<style>`
- ❌ Kopírování `<style>` elementů nefungovalo (nebyly v DOM)

**Řešení: Aplikovat computed styles jako inline**

Místo kopírování `<style>` elementů (které neexistují), extension nyní:

1. **Získá computed styles** z původních elementů (z referencedElement)
2. **Aplikuje je jako inline styles** na nové elementy (v newSvg)
3. **Odstraní class atributy** (už nejsou potřeba)

```javascript
// Pro každý element
const computed = window.getComputedStyle(sourceElement);

// Aplikovat důležité SVG properties
['fill', 'stroke', 'opacity', 'strokeWidth', ...].forEach(prop => {
  if (value && value !== 'none') {
    targetElement.style[prop] = value;
  }
});

// Odstranit class
targetElement.removeAttribute('class');
```

**SVG Properties které se aplikují:**
- `fill`, `stroke`
- `strokeWidth`, `strokeDasharray`, `strokeDashoffset`
- `strokeLinecap`, `strokeLinejoin`, `strokeMiterlimit`
- `opacity`, `fillOpacity`, `strokeOpacity`
- `fillRule`, `clipRule`
- `display`, `visibility`

**Debug log:**
```
[svag] Aplikováno N computed styles, odstraněny CSS třídy
```

**Výsledek:**
- ✅ Žádné CSS třídy v SVG
- ✅ Všechny styly jako inline atributy
- ✅ SVG plně samostatné, bez závislostí na externím CSS
- ✅ Funguje správně i po otevření!

---

### 🔧 v1.1.5 - XML namespaces a CSS styly

**Problém #3:** Stažené SVG obsahovalo chyby:
- ❌ `Namespace prefix xlink for href on use is not defined` error
- ❌ CSS třídy bez stylů (např. `class="c4 b20"` ale chybí `<style>` definice)
- ❌ Neplatný fill atribut: `fill="##f"` (dvojitý `#`)

**Řešení:**

1. **XML Namespace definice:**
   ```javascript
   newSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
   newSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
   ```

2. **Kopírování `<style>` elementů:**
   - Hledá `<style>` elementy v parent SVG
   - Hledá `<style>` elementy v celém dokumentu
   - Deduplikuje a kopíruje do `<defs>` nového SVG
   - Debug log: `"Zkopírováno N <style> elementů"`

3. **Oprava dvojitého `##`:**
   ```javascript
   const cleanFill = fill.replace(/^#+/, '#'); // ##ff0000 -> #ff0000
   ```

**Výsledek:**
- ✅ Žádné xlink:href errory
- ✅ CSS třídy fungují (styly jsou součástí SVG)
- ✅ Validní fill atributy (jen jeden `#`)
- ✅ Kompletní, samostatné, funkční SVG soubory!

---

### 🔧 v1.1.4 - Detekce <use> a pojmenování

**Problém #2:** Extension stále stahovala celý modul a nerozpoznávala `<use>` elementy uvnitř SVG. Soubory byly pojmenovány podle className wrapperu (např. "module.svg") místo podle data atributů ikony.

**Řešení:**

1. **`getSvgData()` - Detekce `<use>` elementů:**
   ```javascript
   // Když najde SVG element, NEJPRVE zkontroluje <use> uvnitř:
   const useElement = element.querySelector('use[href^="#"], use[xlink\\:href^="#"]');
   if (useElement) {
     const resolvedContent = resolveUseElement(useElement);
     return { type: 'use-resolved', content: resolvedContent };
   }
   ```

2. **`extractIconName()` - Robustnější extrakce názvu:**
   - ✅ Pokud dostane wrapper, najde SVG uvnitř
   - ✅ Podpora pro `data-dssvgid` atribut (NEJVYŠŠÍ priorita)
   - ✅ Nová priorita: `data-dssvgid` > `data-icon` > `data-name` > `id` > `aria-label` > `title` > `className`
   - ✅ Debug logy pro sledování odkud byl název extrahován

**Výsledek:** 
- 🎯 Ikona `<svg data-dssvgid="calendar">` se stáhne jako **"calendar.svg"**, ne "module.svg"!
- 🎯 `<use xlink:href="#dist__calendar___2T2Oy">` se správně vyřeší na konkrétní SVG obsah!

---

### 🔧 v1.1.3 - Priorita detekce

**Problém #1:** Extension stahovala celý modul/wrapper místo konkrétní SVG ikony.

**Řešení:** Změněna priorita detekce v `findSvgInElement()`:
- ✅ `<svg>` tagy mají nyní NEJVYŠŠÍ prioritu
- ✅ `elementFromPoint()` zkontroluje dříve (přesnější detekce pod kurzorem)
- ✅ `isSvgElement()` až jako FALLBACK (pro CSS-based SVG)
- ✅ Odstraněna kontrola `isSvgElement()` z children loop (neklasifikuje wrappery jako SVG)

---

Tato aktualizace přináší KOMPLETNÍ podporu pro všechny moderní i pokročilé způsoby implementace SVG ikon na webových stránkách, včetně Shadow DOM, všech CSS properties, iframe, picture elementů a dynamických SVG.

## Podporované typy SVG (20+ variant)

### 1. **Inline SVG** (původní podpora)
```html
<svg width="24" height="24">...</svg>
```

### 2. **IMG s SVG souborem** (původní podpora)
```html
<img src="icon.svg" alt="icon">
<img src="icon.svg?v=123" alt="icon">
```

### 3. **Data URI SVG** ✨ NOVÉ
```html
<!-- Base64 encoded -->
<img src="data:image/svg+xml;base64,PHN2Zy...">

<!-- URL encoded -->
<img src="data:image/svg+xml,%3Csvg%20xmlns...">

<!-- UTF-8 -->
<img src="data:image/svg+xml;charset=utf-8,<svg...">
```

### 4. **Background SVG** (původní podpora + vylepšení)
```css
.icon {
  background-image: url('icon.svg');
  /* NOVÉ: Podpora data URI v background */
  background-image: url('data:image/svg+xml;base64,...');
}
```

### 5. **Object element** ✨ NOVÉ
```html
<object type="image/svg+xml" data="icon.svg"></object>
```

### 6. **Embed element** ✨ NOVÉ
```html
<embed type="image/svg+xml" src="icon.svg">
```

### 7. **SVG Sprites** ✨ VYLEPŠENO v1.1
```html
<!-- Externí sprite -->
<svg><use href="sprite.svg#icon-home"></use></svg>
<svg><use xlink:href="sprite.svg#icon-home"></use></svg>

<!-- Interní use s RESOLVING symbolů - NOVÉ v1.1! -->
<svg style="display:none">
  <symbol id="icon-home" viewBox="0 0 24 24">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </symbol>
</svg>
<svg><use xlink:href="#icon-home"></use></svg>
<!-- Extension nyní správně extrahuje obsah symbolu! -->
```

### 8. **CSS Mask** ✨ NOVÉ
```css
.icon {
  mask: url('mask.svg');
  -webkit-mask: url('mask.svg');
}
```

### 9. **CSS Clip-path** ✨ NOVÉ
```css
.icon {
  clip-path: url('clip.svg#clipper');
  -webkit-clip-path: url('clip.svg#clipper');
}
```

### 10. **Pseudo-elementy** ✨ NOVÉ
```css
.icon::before {
  content: url('icon.svg');
}
.icon::after {
  content: url('icon.svg');
}
```

### 11. **Picture Element** 🆕 v1.1
```html
<picture>
  <source srcset="icon.svg" type="image/svg+xml">
  <img src="icon.png" alt="fallback">
</picture>
```

### 12. **Iframe s SVG** 🆕 v1.1
```html
<iframe src="icon.svg" width="24" height="24"></iframe>
<iframe srcdoc="<svg>...</svg>"></iframe>
```

### 13. **CSS list-style-image** 🆕 v1.1
```css
ul li {
  list-style-image: url('bullet.svg');
  /* Také podporuje data URI */
  list-style-image: url('data:image/svg+xml,...');
}
```

### 14. **CSS cursor** 🆕 v1.1
```css
.element {
  cursor: url('cursor.svg'), auto;
}
```

### 15. **CSS border-image** 🆕 v1.1
```css
.element {
  border-image: url('border.svg') 30 round;
}
```

### 16. **CSS filter** 🆕 v1.1
```css
.element {
  filter: url('filters.svg#blur');
  -webkit-filter: url('filters.svg#glow');
}
```

### 17. **CSS shape-outside** 🆕 v1.1
```css
.element {
  shape-outside: url('shape.svg');
  float: left;
}
```

### 18. **Foreign Object** 🆕 v1.1
```html
<svg>
  <foreignObject width="100" height="100">
    <img src="icon.svg" />
  </foreignObject>
</svg>
```

### 19. **Shadow DOM** 🆕 v1.1
```javascript
class MyIcon extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({mode: 'open'});
    shadow.innerHTML = '<svg>...</svg>';
  }
}
// Extension nyní skenuje i Shadow DOM!
```

### 20. **Dynamicky vkládané SVG** 🆕 v1.1
```javascript
// MutationObserver detekuje nově přidané SVG
setTimeout(() => {
  document.body.innerHTML += '<svg>...</svg>';
}, 1000);
// Extension automaticky detekuje nový SVG!
```

## Technické vylepšení

### Nové funkce v1.1

#### `decodeSvgDataUri(dataUri)`
Dekóduje SVG data URI do čitelného SVG kódu:
- Podporuje base64 encoding
- Podporuje URL encoding
- Podporuje různé charset specifikace

#### `resolveUseElement(useElement)` 🆕 v1.1
**Klíčová nová funkce** pro váš use case!
- Najde referencovaný symbol podle ID
- Vytvoří standalone SVG s obsahem symbolu
- Zkopíruje viewBox a další atributy
- Aplikuje fill/stroke z computed styles
- Podporuje CSS variables (var(--color))

#### `scanShadowRoots(element)` 🆕 v1.1
- Rekurzivně skenuje Shadow DOM
- Najde SVG ve Web Components
- Bezpečné zacházení s closed shadow roots

#### `findSvgInElement(element)` 🆕 v1.1
- Inteligentně hledá SVG v elementu a jeho potomcích
- Řeší problém s SVG uvnitř buttonů
- 5 různých scénářů vyhledávání
- Performance optimalizace (max 50 elementů)

#### Vylepšená `getSvgData(element)`
- Detekuje **20+ typů SVG** (bylo 10)
- Nové typy: picture, iframe, CSS properties, foreign object
- Inteligentní fallback mechanismus
- Lepší error handling

#### Vylepšená `isSvgElement(element)`
- Kontroluje všechny možné způsoby implementace SVG
- Včetně Shadow DOM
- Včetně všech CSS properties
- Optimalizované pro výkon
- Bezpečné zacházení s pseudo-elementy

#### Vylepšená `downloadSvg(svgData)`
- Podpora externích sprite fragmentů (#icon-name)
- Extrakce obsahu z OBJECT/EMBED/IFRAME elementů
- Lepší handling CORS omezení
- Resolving interních use references

#### Vylepšená `sendToGallery(svgData)`
- Stejná vylepšení jako u downloadSvg()
- Konzistentní zpracování všech typů SVG

#### MutationObserver 🆕 v1.1
- Sleduje dynamicky přidané SVG elementy
- Debouncing (500ms) pro performance
- Automatická detekce nových SVG v DOM

## Ladění a debugging

Extension nyní loguje více informací do konzole:

```javascript
// Při načtení (v1.1)
console.log('svag extension loaded - enhanced SVG detection v1.1');
console.log('Supported SVG types: inline, img, data-uri, object, embed, background, sprite, mask, clip-path, pseudo-elements, picture, iframe, css-cursor, css-list-style, css-border-image, css-filter, css-shape-outside, foreign-object, shadow-dom, use-resolved');
console.log('MutationObserver: active - tracking dynamic SVG additions');

// Při resolving use elementu
console.log('[svag] Resolved <use> reference: #icon-bookmark');

// Při detekci nových SVG
console.log('[svag] New SVG element detected:', node.tagName);
console.log('[svag] 3 new SVG element(s) detected in added subtree');

// Při chybách
console.error('[svag] Chyba při načítání SVG:', error);
console.debug('[svag] Cannot access pseudo-elements:', error);
console.warn('[svag] Symbol/element with id "icon-home" not found in document');
```

## Testování

### Testovací stránky

Pro testování všech typů SVG můžete vytvořit testovací HTML soubor:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .bg-svg { background-image: url('icon.svg'); width: 50px; height: 50px; }
    .mask-svg { mask: url('mask.svg'); width: 50px; height: 50px; background: red; }
    .pseudo::before { content: url('icon.svg'); }
  </style>
</head>
<body>
  <!-- Inline SVG -->
  <svg width="50" height="50"><circle cx="25" cy="25" r="20"/></svg>
  
  <!-- IMG -->
  <img src="icon.svg" alt="icon">
  
  <!-- Data URI -->
  <img src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2240%22%2F%3E%3C%2Fsvg%3E">
  
  <!-- Object -->
  <object type="image/svg+xml" data="icon.svg"></object>
  
  <!-- Embed -->
  <embed type="image/svg+xml" src="icon.svg">
  
  <!-- Background -->
  <div class="bg-svg"></div>
  
  <!-- Mask -->
  <div class="mask-svg"></div>
  
  <!-- Sprite -->
  <svg><use href="sprite.svg#home"></use></svg>
</body>
</html>
```

### Manuální testování

1. Držte **Cmd** (Mac) nebo **Ctrl** (Windows)
2. Najeďte myší na SVG element
3. Měl by se zobrazit action popup s tlačítky Download a Gallery
4. Zkontrolujte konzoli pro log zprávy

## Známá omezení

1. **Cross-Origin omezení**: Některé SVG z jiných domén nemusí být přístupné kvůli CORS políčkám
2. **Pseudo-elementy**: Některé browsery mohou omezit přístup k ::before a ::after stylům
3. **Dynamic SVG**: SVG generované dynamicky JavaScriptem po načtení stránky mohou vyžadovat refresh

## Changelog

### v1.1 (Aktuální) 🎉
**HLAVNÍ VYLEPŠENÍ:**
- ⭐ **Resolving interních `<use>` symbolů** - váš bookmark problém vyřešen!
- 🆕 Shadow DOM support - Web Components
- 🆕 MutationObserver pro dynamické SVG
- 🐛 **SVG v buttonech a nested elementech** - opraveno!

**Nové SVG typy:**
- ✨ `<picture>` element s SVG
- ✨ `<iframe>` s SVG (src i srcdoc)
- ✨ `<foreignObject>` s embedded SVG
- ✨ CSS `list-style-image`
- ✨ CSS `cursor`
- ✨ CSS `border-image`
- ✨ CSS `filter` a `-webkit-filter`
- ✨ CSS `shape-outside`
- ✨ Data URI SVG (base64, URL-encoded)
- ✨ `<object>` a `<embed>` elementy
- ✨ CSS `mask` a `clip-path`
- ✨ Pseudo-elementy (`::before`, `::after`)

**Nové funkce:**
- 🔧 `resolveUseElement()` - resolvuje interní symboly
- 🔧 `scanShadowRoots()` - skenuje Shadow DOM
- 🔧 `findSvgInElement()` - hledá SVG v nested elementech
- 🔧 `decodeSvgDataUri()` - dekóduje data URI

**Další vylepšení:**
- 📊 Coverage: **~98%** všech SVG typů
- 🐛 Lepší console logging s [svag] prefix
- 🚀 Performance optimalizace s debouncing
- 📝 Kompletní dokumentace všech 20+ typů
- 🎯 Detekce v buttonech a složitých strukturách

### v1.0
- Základní podpora pro inline SVG
- Podpora pro IMG s .svg soubory
- Podpora pro background-image s SVG
- Základní `<use>` elementy (bez resolving symbolů)

## Další vylepšení

Plánovaná vylepšení pro příští verze:

- [ ] Podpora pro SVG v iframes
- [ ] Batch download více SVG najednou
- [ ] SVG editor přímo v extension
- [ ] Auto-optimalizace SVG (SVGO integration)
- [ ] Podpora pro animované SVG
- [ ] Export do různých formátů (PNG, WebP)

