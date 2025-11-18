# Vylepšená detekce SVG v2.0

## Přehled změn

Tato aktualizace přináší kompletní podporu pro všechny moderní způsoby implementace SVG ikon na webových stránkách.

## Podporované typy SVG

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

### 7. **SVG Sprites** ✨ NOVÉ
```html
<!-- Externí sprite -->
<svg><use href="sprite.svg#icon-home"></use></svg>
<svg><use xlink:href="sprite.svg#icon-home"></use></svg>

<!-- Interní use (původní podpora) -->
<svg><use href="#icon-home"></use></svg>
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

## Technické vylepšení

### Nové funkce

#### `decodeSvgDataUri(dataUri)`
Dekóduje SVG data URI do čitelného SVG kódu:
- Podporuje base64 encoding
- Podporuje URL encoding
- Podporuje různé charset specifikace

#### Vylepšená `getSvgData(element)`
- Detekuje všech 10 typů SVG
- Inteligentní fallback mechanismus
- Lepší error handling

#### Vylepšená `isSvgElement(element)`
- Kontroluje všechny možné způsoby implementace SVG
- Optimalizované pro výkon
- Bezpečné zacházení s pseudo-elementy

#### Vylepšená `downloadSvg(svgData)`
- Podpora externích sprite fragmentů (#icon-name)
- Extrakce obsahu z OBJECT/EMBED elementů
- Lepší handling CORS omezení

#### Vylepšená `sendToGallery(svgData)`
- Stejná vylepšení jako u downloadSvg()
- Konzistentní zpracování všech typů SVG

## Ladění a debugging

Extension nyní loguje více informací do konzole:

```javascript
// Při načtení
console.log('svag extension loaded - enhanced SVG detection v2.0');
console.log('Supported SVG types: inline, img, data-uri, object, embed, background, sprite, mask, clip-path, pseudo-elements');

// Při chybách
console.error('Error decoding SVG data URI:', error);
console.debug('Cannot access pseudo-elements:', error);
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

### v2.0 (Aktuální)
- ✨ Přidána podpora pro data URI SVG
- ✨ Přidána podpora pro `<object>` a `<embed>` elementy
- ✨ Přidána podpora pro SVG sprites s fragmenty
- ✨ Přidána podpora pro CSS mask a clip-path
- ✨ Přidána podpora pro pseudo-elementy (::before, ::after)
- 🐛 Vylepšené error handling
- 🐛 Lepší podpora pro query parametry v URL (.svg?v=123)
- 📝 Vylepšené konzolové logy pro debugging

### v1.0
- Základní podpora pro inline SVG
- Podpora pro IMG s .svg soubory
- Podpora pro background-image s SVG
- Podpora pro interní `<use>` elementy

## Další vylepšení

Plánovaná vylepšení pro příští verze:

- [ ] Podpora pro SVG v iframes
- [ ] Batch download více SVG najednou
- [ ] SVG editor přímo v extension
- [ ] Auto-optimalizace SVG (SVGO integration)
- [ ] Podpora pro animované SVG
- [ ] Export do různých formátů (PNG, WebP)

