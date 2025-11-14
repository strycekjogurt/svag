# 🎨 svag Landing Page

Nová úvodní stránka pro https://svag.vercel.app/ podle Figma designu.

## 📦 Struktura

```
/
├── index.html           # Hlavní landing page
├── chrome-icon.png      # Chrome ikona
├── iframe/              # Interaktivní demo
│   ├── index.html       # Demo stránka
│   ├── demo.js          # Funkční logika
│   ├── demo.css         # Styly
│   └── svag.svg         # Logo
└── svag-chrome-extension.zip  # Extension ke stažení
```

## ✨ Funkce Landing Page

### 1. **Interaktivní Demo (Iframe)**
- Live ukázka funkcionality
- Uživatel může podržet CMD/Ctrl + najet na logo
- Zobrazí se buttony pro download a gallery
- Plně funkční stahování SVG

### 2. **Hero Sekce**
- Velký nadpis: "Instantly save any SVG you find."
- Chrome extension badge s odkazem
- Moderní typografie (Inter font)

### 3. **Instalační Kroky**
- Box s 5 kroky instalace:
  1. Download svag (button)
  2. Unzip in your computer
  3. chrome://extensions/ (odkaz)
  4. Switch to dev mode
  5. Load unpacked

## 🎨 Design

Design podle Figma: `@https://www.figma.com/design/mGE13N8j6pxq5k4ur2BlIg/svag?node-id=26-109`

### Barevné Schéma
- Pozadí: Bílá `#ffffff`
- Text: `rgba(0, 0, 0, 0.98)`
- Sekundární text: `rgba(0, 0, 0, 0.5)`
- Button: `#1a1a1a`
- Border: `rgba(0, 0, 0, 0.12)`

### Typography
- Font: Inter (Regular 400, Medium 500, Bold 700)
- Hero: 72px / Bold
- Steps: 14px / Regular, Medium

## 📱 Responsivita

Landing page je plně responzivní:

### Desktop (1400px+)
- Hero title: 72px
- Iframe: 360x360px
- Installation box: 1280px max-width

### Tablet (1024px - 1400px)
- Hero title: 56px
- Installation steps: vertikální layout

### Mobile (< 768px)
- Hero title: 36px
- Redukovaný padding
- Stack layout

## 🚀 Deployment

### Lokální Vývoj
```bash
# Spustit server
npm start

# Otevřít v prohlížeči
http://localhost:3000
```

### Vercel
```bash
# Push do git repository
git push origin main

# Automatický deploy na Vercel
# URL: https://svag.vercel.app/
```

## 🔧 Konfigurace Server.js

Landing page je servírována přes Express:

```javascript
// Static middleware pro iframe
app.use('/iframe', express.static('iframe'));

// Static middleware pro root
app.use(express.static('.', { 
  index: false,
  dotfiles: 'ignore'
}));

// Root route
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: '.' });
});
```

## 📝 Úpravy

### Změna textu
Upravte `index.html`:
```html
<h1 class="hero-title">
  Váš text zde
</h1>
```

### Změna barvy buttonu
Upravte CSS v `index.html`:
```css
.step.download-btn {
  background: #YOUR_COLOR;
}
```

### Přidání dalších kroků
Upravte HTML v instalačním boxu:
```html
<span class="step primary">Nový krok</span>
```

## 🎯 Iframe Demo

Iframe demo je samostatná aplikace v složce `/iframe/`:
- Plně funkční SVG download
- Gallery button (demo - pouze notifikace)
- Proximity efekt na buttonech
- Stejné chování jako extension

Více informací: `iframe/README.md`

## 🔗 Odkazy

- [Figma Design](https://www.figma.com/design/mGE13N8j6pxq5k4ur2BlIg/svag?node-id=26-109)
- [Chrome Web Store](https://chrome.google.com/webstore)
- [Vercel Dashboard](https://vercel.com/dashboard)

## 📄 Licence

Open-source projekt svag.

---

Vytvořeno s ❤️ pro svag

