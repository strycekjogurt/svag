# 🎨 svag - Chrome Extension

Chrome extension pro snadné stahování a správu SVG ikon z webových stránek.

## ✨ Funkce

- **⌘ + hover** - Zobrazí náhled SVG ikony
- **⌘ + klik** - Zobrazí menu s výběrem akce (stáhnout nebo poslat do galerie)
- Krásný moderní design s gradientovými barvami
- Podpora různých formátů SVG:
  - Inline `<svg>` elementy
  - `<img src="*.svg">` obrázky
  - `background-image: url(*.svg)` pozadí
  - `<use>` elementy uvnitř SVG

## 📦 Instalace

### 1. Připravte ikony

Vytvořte 3 PNG obrázky pro ikonu extension:
- `icons/icon16.png` (16x16 px)
- `icons/icon48.png` (48x48 px)
- `icons/icon128.png` (128x128 px)

Můžete použít jakýkoliv grafický editor nebo online nástroj.

### 2. Načtěte extension v Chrome

1. Otevřete Chrome a přejděte na `chrome://extensions/`
2. Zapněte **Developer mode** (přepínač vpravo nahoře)
3. Klikněte na **Load unpacked**
4. Vyberte složku `svag` s tímto projektem

### 3. Extension je připravena!

Ikona extension se objeví v pravém horním rohu Chrome.

## 🎯 Jak používat

1. **Jděte na jakoukoliv webovou stránku** s SVG ikonami
2. **Stiskněte a podržte klávesu ⌘ (Command)** na Mac nebo Ctrl na Windows/Linux
3. **Najeďte myší na SVG ikonu** - objeví se náhled
4. **Klikněte na ikonu** zatímco držíte ⌘ - zobrazí se popup menu
5. **Najeďte na akci** v menu:
   - 💾 **Stáhnout** - stáhne SVG soubor
   - 🖼️ **Do galerie** - pošle SVG do vaší online galerie (vyžaduje přihlášení)

## 🌐 Webová galerie (volitelné)

Pro použití funkce webové galerie potřebujete backend server.

### Rychlý start s Node.js

1. **Vytvořte nový projekt:**

\`\`\`bash
mkdir svag-backend
cd svag-backend
npm init -y
\`\`\`

2. **Nainstalujte závislosti:**

\`\`\`bash
npm install express cors jsonwebtoken bcrypt
\`\`\`

3. **Vytvořte `server.js`:**

\`\`\`javascript
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = 'your-secret-key-change-this';
const users = [];
const gallery = [];

// Registrace
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ email, password: hashedPassword });
  res.json({ message: 'Registered successfully' });
});

// Přihlášení
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ email }, SECRET);
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Přidat do galerie
app.post('/api/gallery', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, SECRET);
    const item = {
      id: Date.now(),
      ...req.body,
      user: decoded.email,
      createdAt: new Date()
    };
    gallery.push(item);
    res.json({ message: 'Added to gallery', item });
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// Získat galerii
app.get('/api/gallery', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, SECRET);
    const userGallery = gallery.filter(item => item.user === decoded.email);
    res.json(userGallery);
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// Smazat z galerie
app.delete('/api/gallery/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, SECRET);
    const index = gallery.findIndex(
      item => item.id == req.params.id && item.user === decoded.email
    );
    
    if (index !== -1) {
      gallery.splice(index, 1);
      res.json({ message: 'Deleted from gallery' });
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// Jednoduchá HTML stránka pro galerii
app.get('/gallery', (req, res) => {
  res.send(\`
    <!DOCTYPE html>
    <html lang="cs">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SVG Galerie</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 40px 20px;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        h1 {
          color: white;
          text-align: center;
          margin-bottom: 40px;
          font-size: 36px;
        }
        .gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
        }
        .gallery-item {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .svg-preview {
          width: 100%;
          height: 200px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #f9f9f9;
          border-radius: 8px;
          margin-bottom: 15px;
        }
        .svg-preview svg {
          max-width: 100%;
          max-height: 180px;
        }
        .item-info {
          width: 100%;
          font-size: 12px;
          color: #666;
          margin-bottom: 10px;
        }
        .btn-delete {
          background: #f5576c;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }
        .btn-delete:hover {
          background: #e04858;
        }
        .login-form {
          background: white;
          border-radius: 12px;
          padding: 30px;
          max-width: 400px;
          margin: 0 auto;
        }
        .login-form input {
          width: 100%;
          padding: 12px;
          margin-bottom: 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
        }
        .login-form button {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
        .login-form button:hover {
          opacity: 0.9;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎨 SVG Galerie</h1>
        <div id="loginSection" class="login-form">
          <h2 style="margin-bottom: 20px;">Přihlášení</h2>
          <input type="email" id="email" placeholder="Email" />
          <input type="password" id="password" placeholder="Heslo" />
          <button onclick="login()">Přihlásit se</button>
        </div>
        <div id="gallerySection" style="display: none;">
          <div class="gallery" id="gallery"></div>
        </div>
      </div>
      
      <script>
        let token = localStorage.getItem('token');
        if (token) {
          loadGallery();
        }
        
        async function login() {
          const email = document.getElementById('email').value;
          const password = document.getElementById('password').value;
          
          try {
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });
            
            if (response.ok) {
              const data = await response.json();
              token = data.token;
              localStorage.setItem('token', token);
              loadGallery();
            } else {
              alert('Chyba při přihlašování');
            }
          } catch (error) {
            alert('Chyba připojení');
          }
        }
        
        async function loadGallery() {
          document.getElementById('loginSection').style.display = 'none';
          document.getElementById('gallerySection').style.display = 'block';
          
          try {
            const response = await fetch('/api/gallery', {
              headers: { 'Authorization': \\\`Bearer \\\${token}\\\` }
            });
            
            if (response.ok) {
              const items = await response.json();
              displayGallery(items);
            } else {
              localStorage.removeItem('token');
              location.reload();
            }
          } catch (error) {
            alert('Chyba při načítání galerie');
          }
        }
        
        function displayGallery(items) {
          const gallery = document.getElementById('gallery');
          gallery.innerHTML = items.map(item => \\\`
            <div class="gallery-item">
              <div class="svg-preview">\\\${item.svg}</div>
              <div class="item-info">
                <div>Zdroj: \\\${new URL(item.source).hostname}</div>
                <div>Datum: \\\${new Date(item.timestamp).toLocaleDateString('cs-CZ')}</div>
              </div>
              <button class="btn-delete" onclick="deleteItem(\\\${item.id})">Smazat</button>
            </div>
          \\\`).join('');
        }
        
        async function deleteItem(id) {
          if (!confirm('Opravdu chcete smazat tuto ikonu?')) return;
          
          try {
            const response = await fetch(\\\`/api/gallery/\\\${id}\\\`, {
              method: 'DELETE',
              headers: { 'Authorization': \\\`Bearer \\\${token}\\\` }
            });
            
            if (response.ok) {
              loadGallery();
            }
          } catch (error) {
            alert('Chyba při mazání');
          }
        }
      </script>
    </body>
    </html>
  \`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server běží na http://localhost:\${PORT}\`);
  console.log(\`Galerie: http://localhost:\${PORT}/gallery\`);
  console.log(\`Produkce: https://svag.pro\`);
});
\`\`\`

4. **Spusťte server:**

\`\`\`bash
node server.js
\`\`\`

5. **V extension nastavte API URL:**
   - Klikněte na ikonu extension
   - V poli "API URL" zadejte: 
     - Produkce: `https://svag.pro`
     - Lokální development: `http://localhost:3000`
   - Klikněte "Uložit"

6. **Zaregistrujte se a přihlaste se**

7. **Otevřete galerii:**
   - Landing page: `https://svag.pro/` (produkce) nebo `http://localhost:3000/` (lokální)
   - Vaše galerie: `https://svag.pro/gallery` (produkce) nebo `http://localhost:3000/gallery` (lokální)

## 🎨 Přizpůsobení designu

Všechny styly najdete v souborech:
- `content.css` - styling náhledu na webových stránkách
- `popup.css` - styling popup okna extension

Můžete změnit barvy gradientů, velikosti, zaoblení rohů atd.

## 🔧 Struktura projektu

\`\`\`
svag/
├── manifest.json         # Konfigurace extension
├── content.js           # Detekce SVG a interakce na stránkách
├── content.css          # Styling náhledu
├── background.js        # Service worker pro stahování
├── popup.html           # UI popup okna
├── popup.js            # Logika popup okna
├── popup.css           # Styling popup okna
├── icons/              # Ikony extension
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── Gallery/            # Webová galerie (oddělená struktura)
│   ├── login.ejs       # Login stránka
│   ├── gallery.ejs     # Galerie ikon
│   ├── styles.css      # CSS styly
│   ├── script.js       # JavaScript logika
│   └── README.md       # Dokumentace galerie
├── pages/              # EJS templates pro aktivaci
│   ├── activate-success.ejs
│   ├── activate-error.ejs
│   └── activate-already.ejs
├── server.js           # Backend server (Express + Supabase)
└── README.md           # Tento soubor
\`\`\`

## 📝 Poznámky

- Extension funguje na všech webových stránkách
- Pro stahování SVG z externích zdrojů může být potřeba CORS
- Data v popup jsou ukládána v Chrome Storage
- Backend používá JWT tokeny pro autentizaci
- V produkčním prostředí použijte databázi místo paměťových polí

## 🐛 Řešení problémů

### Extension se nenačítá
- Zkontrolujte, zda jsou všechny soubory na správných místech
- Zkontrolujte Developer Tools v Chrome pro chybové hlášky

### SVG se nestahuje
- Zkontrolujte, zda máte povolené stahování v Chrome
- Některé stránky mohou blokovat přístup k SVG

### Nelze se připojit k serveru
- Zkontrolujte, zda backend server běží
- Zkontrolujte API URL v nastavení extension
- Zkontrolujte CORS nastavení na serveru

## 📄 Licence

Tento projekt je open-source a volně dostupný pro použití a modifikaci.

## 🤝 Přispívání

Budu rád za jakékoliv návrhy na vylepšení nebo hlášení chyb!

