# svag - iframe Demo

Interaktivní demo pro ukázku funkcionality svag rozšíření.

## 🎯 Použití

1. **Otevřete `index.html` v prohlížeči**
2. **Podržte klávesu ⌘ (CMD) nebo Ctrl**
3. **Najeďte myší na logo svag**
4. **Zobrazí se tlačítko pro stažení**
5. **Najeďte na tlačítko** - logo se automaticky stáhne!

## 📦 Integrace na web

### Jako iframe

```html
<iframe 
  src="iframe/index.html" 
  width="100%" 
  height="800px" 
  frameborder="0"
  title="svag Demo"
></iframe>
```

### Jako standalone stránka

Jednoduše nahrajte celou složku `iframe/` na váš webhosting a odkažte na ni.

## ⚙️ Přizpůsobení

### Změna barevného schématu

V `demo.css` upravte CSS proměnné:

```css
:root {
  --svag-bg: #ffffff;        /* Pozadí buttonů */
  --svag-border: #000000;    /* Ohraničení a barva ikon */
  --svag-icon: #000000;      /* Barva ikon */
}
```

### Přidání vlastních ikon

V `index.html` můžete nahradit SVG logo vlastním:

```html
<div class="logo-container">
  <svg data-icon="your-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 124 124">
    <!-- Váš SVG kód -->
  </svg>
</div>
```

### Změna velikosti iframe

V `index.html` v `<style>` sekci upravte:

```css
.iframe-container {
  width: 360px;  /* Změňte šířku */
  height: 360px; /* Změňte výšku */
}
```

## 🔧 Funkce

- ✅ Detekce SVG elementů při držení CMD/Ctrl
- ✅ Automatické pojmenování souborů podle `data-icon` atributu
- ✅ Proximity efekt na tlačítkách (vyplňování při přiblížení myši)
- ✅ Plynulé animace
- ✅ Notifikace o stažení s velikostí souboru
- ✅ Minimalistický design podle Figma prototypu
- ✅ Logo svag jako ukázková ikona

## 📝 Technické detaily

### Podporované formáty SVG

- Inline `<svg>` elementy
- `<img src="*.svg">` obrázky
- `background-image: url(*.svg)` pozadí
- `<use>` elementy uvnitř SVG

### Pojmenování souborů

Demo automaticky detekuje název ikony z:
1. `data-icon` atribut (nejvyšší priorita)
2. `data-name` atribut
3. `id` atribut
4. `class` atribut (detekce Font Awesome, Lucide, Bootstrap Icons atd.)
5. `aria-label` atribut
6. `<title>` element uvnitř SVG

Pokud nenajde žádný identifikátor, použije timestamp: `svg-icon-1699564123456.svg`

## 🚀 Nasazení na web

### Vercel

1. Vytvořte nový projekt na [vercel.com](https://vercel.com)
2. Nahrajte složku `iframe/`
3. Deploy!

### Netlify

1. Vytvořte nový projekt na [netlify.com](https://netlify.com)
2. Drag & drop složku `iframe/`
3. Deploy!

### GitHub Pages

1. Vytvořte nový repository
2. Nahrajte obsah složky `iframe/`
3. Zapněte GitHub Pages v nastavení
4. Hotovo!

## 🎨 Příklady použití

### Na landing page

```html
<section id="demo">
  <h2>Vyzkoušejte si to!</h2>
  <iframe 
    src="https://your-domain.com/iframe/" 
    width="100%" 
    height="800px"
    style="border: none; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);"
  ></iframe>
</section>
```

### Jako plnoobrazovkové demo

```html
<iframe 
  src="https://your-domain.com/iframe/" 
  style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; border: none;"
></iframe>
```

## 📊 Omezení

- Demo obsahuje pouze funkci stahování (bez galerie)
- Nefunguje jako Chrome Extension (pouze standalone demo)
- Některé pokročilé funkce z plné verze nejsou k dispozici:
  - Synchronizace s backendem
  - Uložení do galerie
  - Nastavení barevných schémat
  - Přepínání pořadí tlačítek

## 🚀 Produkční verze

Pro plnou funkcionalitu (galerie, synchronizace, backend integrace) nainstalujte celé Chrome rozšíření z hlavní složky projektu.

## 📞 Podpora

Máte problémy nebo otázky? Otevřete issue na GitHubu nebo nás kontaktujte.

---

Vytvořeno s ❤️ pomocí svag

