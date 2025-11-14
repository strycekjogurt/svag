/**
 * Příklad backend serveru pro svag extension
 * 
 * Pro spuštění:
 * 1. npm init -y
 * 2. npm install express cors jsonwebtoken bcrypt
 * 3. node server-example.js
 * 
 * POZOR: Toto je pouze demonstrační verze!
 * Pro produkční použití implementujte:
 * - Databázi (PostgreSQL, MongoDB, atd.)
 * - Správné ukládání hesel (salt + hash)
 * - Validaci vstupů
 * - Rate limiting
 * - HTTPS
 * - Logování
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Pro větší SVG soubory

// ZMĚŇTE TENTO SECRET V PRODUKCI!
const SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// V produkci použijte databázi
const users = [];
const gallery = [];

// Middleware pro autentizaci
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ===== API ENDPOINTY =====

// Registrace nového uživatele
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validace
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Kontrola, zda uživatel již existuje
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash hesla
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ 
      email, 
      password: hashedPassword,
      createdAt: new Date()
    });
    
    console.log(`✅ Nový uživatel zaregistrován: ${email}`);
    res.json({ message: 'Registered successfully' });
  } catch (error) {
    console.error('Chyba při registraci:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Přihlášení
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const user = users.find(u => u.email === email);
    
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ email }, SECRET, { expiresIn: '7d' });
      console.log(`✅ Uživatel přihlášen: ${email}`);
      res.json({ token, email });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Chyba při přihlášení:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Přidat SVG do galerie
app.post('/api/gallery', authenticate, (req, res) => {
  try {
    const { svg, source, timestamp, name, size } = req.body;
    
    if (!svg) {
      return res.status(400).json({ error: 'SVG content is required' });
    }
    
    // Extrahovat název z URL pokud není poskytnut
    let iconName = name;
    if (!iconName && source) {
      try {
        const url = new URL(source);
        const pathname = url.pathname;
        iconName = pathname.split('/').pop().replace(/\.(svg|png|jpg|jpeg)$/i, '') || 'Bez názvu';
      } catch {
        iconName = 'Bez názvu';
      }
    }
    
    // Vypočítat velikost SVG v KB pokud není poskytnut
    let iconSize = size;
    if (!iconSize) {
      iconSize = (new Blob([svg]).size / 1024).toFixed(2); // KB
    }
    
    const item = {
      id: Date.now(),
      svg,
      source: source || 'unknown',
      timestamp: timestamp || new Date().toISOString(),
      name: iconName || 'Bez názvu',
      size: iconSize,
      user: req.user.email,
      createdAt: new Date()
    };
    
    gallery.push(item);
    console.log(`✅ SVG přidáno do galerie uživatele: ${req.user.email}`);
    res.json({ message: 'Added to gallery', item });
  } catch (error) {
    console.error('Chyba při přidávání do galerie:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Získat galerii uživatele
app.get('/api/gallery', authenticate, (req, res) => {
  try {
    const userGallery = gallery
      .filter(item => item.user === req.user.email)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(userGallery);
  } catch (error) {
    console.error('Chyba při načítání galerie:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Smazat SVG z galerie
app.delete('/api/gallery/:id', authenticate, (req, res) => {
  try {
    const index = gallery.findIndex(
      item => item.id == req.params.id && item.user === req.user.email
    );
    
    if (index !== -1) {
      gallery.splice(index, 1);
      console.log(`✅ SVG smazáno z galerie uživatele: ${req.user.email}`);
      res.json({ message: 'Deleted from gallery' });
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    console.error('Chyba při mazání z galerie:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// HTML stránka galerie
app.get('/gallery', (req, res) => {
  res.send(`
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
        .container { max-width: 1400px; margin: 0 auto; }
        h1 {
          color: white;
          text-align: center;
          margin-bottom: 30px;
          font-size: 36px;
        }
        .user-info {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          padding: 15px 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .btn-logout {
          background: rgba(255, 255, 255, 0.3);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }
        .btn-logout:hover { background: rgba(255, 255, 255, 0.4); }
        
        /* Toolbar pro search a sortování */
        .toolbar {
          background: rgba(255, 255, 255, 0.95);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 30px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          align-items: center;
        }
        .search-box {
          flex: 1;
          min-width: 250px;
        }
        .search-box input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        .search-box input:focus {
          outline: none;
          border-color: #667eea;
        }
        .sort-controls {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .sort-label {
          font-size: 14px;
          font-weight: 600;
          color: #666;
        }
        .sort-btn {
          background: #f0f0f0;
          color: #333;
          border: 2px solid transparent;
          padding: 10px 18px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s;
        }
        .sort-btn:hover {
          background: #e0e0e0;
        }
        .sort-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-color: #667eea;
        }
        .gallery-stats {
          color: #666;
          font-size: 14px;
          padding: 0 5px;
        }
        
        /* Gallery grid */
        .gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }
        
        @media (max-width: 768px) {
          .gallery {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 16px;
          }
        }
        
        .gallery-item {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .gallery-item:hover { 
          transform: translateY(-5px); 
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        .svg-preview {
          width: 100%;
          height: 200px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: white;
          border: 2px solid #f0f0f0;
          border-radius: 8px;
          margin-bottom: 15px;
          padding: 20px;
        }
        .svg-preview svg {
          max-width: 100%;
          max-height: 100%;
        }
        .item-header {
          margin-bottom: 12px;
        }
        .item-name {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
          word-break: break-word;
        }
        .item-meta {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          color: #666;
          margin-bottom: 15px;
        }
        .meta-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .meta-icon {
          font-size: 14px;
        }
        .item-actions {
          display: flex;
          gap: 8px;
          margin-top: auto;
        }
        .btn-download {
          flex: 1;
          background: #667eea;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: background 0.2s;
        }
        .btn-download:hover { background: #5568d3; }
        .btn-delete {
          background: #f5576c;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: background 0.2s;
        }
        .btn-delete:hover { background: #e04858; }
        
        /* Login form */
        .login-form {
          background: white;
          border-radius: 12px;
          padding: 30px;
          max-width: 400px;
          margin: 0 auto;
        }
        .login-form h2 { margin-bottom: 20px; color: #667eea; }
        .login-form input {
          width: 100%;
          padding: 12px;
          margin-bottom: 15px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
        }
        .login-form input:focus {
          outline: none;
          border-color: #667eea;
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
          transition: opacity 0.2s;
        }
        .login-form button:hover { opacity: 0.9; }
        
        /* Empty state */
        .empty-state {
          text-align: center;
          color: white;
          padding: 80px 20px;
        }
        .empty-state h2 { 
          font-size: 28px; 
          margin-bottom: 15px;
        }
        .empty-state p { 
          opacity: 0.9;
          font-size: 16px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎨 SVG Galerie</h1>
        
        <div id="loginSection" class="login-form">
          <h2>Přihlášení</h2>
          <input type="email" id="email" placeholder="Email" />
          <input type="password" id="password" placeholder="Heslo" />
          <button onclick="login()">Přihlásit se</button>
        </div>
        
        <div id="gallerySection" style="display: none;">
          <div class="user-info">
            <span>Přihlášen jako: <strong id="userEmail"></strong></span>
            <button class="btn-logout" onclick="logout()">Odhlásit se</button>
          </div>
          
          <div class="toolbar">
            <div class="search-box">
              <input 
                type="text" 
                id="searchInput" 
                placeholder="🔍 Hledat podle názvu..." 
                oninput="filterGallery()"
              />
            </div>
            <span class="sort-label">Řadit:</span>
            <div class="sort-controls">
              <button class="sort-btn active" data-sort="date" onclick="sortGallery('date')">
                📅 Podle data
              </button>
              <button class="sort-btn" data-sort="name" onclick="sortGallery('name')">
                🔤 Podle názvu
              </button>
            </div>
            <span class="gallery-stats" id="galleryStats"></span>
          </div>
          
          <div class="gallery" id="gallery"></div>
          <div id="emptyState" class="empty-state" style="display: none;">
            <h2>Zatím tu nic není</h2>
            <p>Použijte Chrome extension pro přidání SVG ikon do galerie</p>
          </div>
        </div>
      </div>
      
      <script>
        let token = localStorage.getItem('token');
        let userEmail = localStorage.getItem('userEmail');
        let allItems = [];
        let currentSort = 'date';
        
        if (token) {
          loadGallery();
        }
        
        async function login() {
          const email = document.getElementById('email').value;
          const password = document.getElementById('password').value;
          
          if (!email || !password) {
            alert('Vyplňte všechna pole');
            return;
          }
          
          try {
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });
            
            if (response.ok) {
              const data = await response.json();
              token = data.token;
              userEmail = data.email;
              localStorage.setItem('token', token);
              localStorage.setItem('userEmail', userEmail);
              loadGallery();
            } else {
              const error = await response.json();
              alert(error.error || 'Chyba při přihlašování');
            }
          } catch (error) {
            alert('Chyba připojení k serveru');
            console.error(error);
          }
        }
        
        function logout() {
          localStorage.removeItem('token');
          localStorage.removeItem('userEmail');
          location.reload();
        }
        
        async function loadGallery() {
          document.getElementById('loginSection').style.display = 'none';
          document.getElementById('gallerySection').style.display = 'block';
          document.getElementById('userEmail').textContent = userEmail;
          
          try {
            const response = await fetch('/api/gallery', {
              headers: { 'Authorization': \`Bearer \${token}\` }
            });
            
            if (response.ok) {
              allItems = await response.json();
              displayGallery(allItems);
            } else {
              localStorage.removeItem('token');
              localStorage.removeItem('userEmail');
              location.reload();
            }
          } catch (error) {
            alert('Chyba při načítání galerie');
            console.error(error);
          }
        }
        
        function sortGallery(sortType) {
          currentSort = sortType;
          
          // Update active button
          document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.classList.remove('active');
          });
          document.querySelector(\`[data-sort="\${sortType}"]\`).classList.add('active');
          
          // Sort items
          const sorted = [...allItems];
          if (sortType === 'name') {
            sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          } else {
            sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          }
          
          displayGallery(sorted);
        }
        
        function filterGallery() {
          const searchTerm = document.getElementById('searchInput').value.toLowerCase();
          const filtered = allItems.filter(item => 
            (item.name || '').toLowerCase().includes(searchTerm)
          );
          
          // Apply current sort
          if (currentSort === 'name') {
            filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          } else {
            filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          }
          
          displayGallery(filtered);
        }
        
        function displayGallery(items) {
          const gallery = document.getElementById('gallery');
          const emptyState = document.getElementById('emptyState');
          const stats = document.getElementById('galleryStats');
          
          if (items.length === 0) {
            gallery.style.display = 'none';
            emptyState.style.display = 'block';
            stats.textContent = '';
            return;
          }
          
          gallery.style.display = 'grid';
          emptyState.style.display = 'none';
          stats.textContent = \`Zobrazeno \${items.length} z \${allItems.length} ikon\`;
          
          gallery.innerHTML = items.map(item => \`
            <div class="gallery-item">
              <div class="svg-preview">\${item.svg}</div>
              <div class="item-header">
                <div class="item-name">\${item.name || 'Bez názvu'}</div>
              </div>
              <div class="item-meta">
                <div class="meta-row">
                  <span class="meta-icon">📦</span>
                  <span>\${item.size || '0'} KB</span>
                </div>
                <div class="meta-row">
                  <span class="meta-icon">📅</span>
                  <span>\${new Date(item.timestamp).toLocaleDateString('cs-CZ', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-icon">🌐</span>
                  <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="\${item.source}">\${getHostname(item.source)}</span>
                </div>
              </div>
              <div class="item-actions">
                <button class="btn-download" onclick="downloadItem(\${item.id})">💾 Stáhnout</button>
                <button class="btn-delete" onclick="deleteItem(\${item.id})">🗑️</button>
              </div>
            </div>
          \`).join('');
        }
        
        function getHostname(url) {
          try {
            return new URL(url).hostname;
          } catch {
            return 'Neznámý zdroj';
          }
        }
        
        function downloadItem(id) {
          const item = allItems.find(i => i.id === id);
          if (!item) return;
          
          const blob = new Blob([item.svg], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = \`\${item.name || 'icon'}.svg\`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        
        async function deleteItem(id) {
          if (!confirm('Opravdu chcete smazat tuto ikonu?')) return;
          
          try {
            const response = await fetch(\`/api/gallery/\${id}\`, {
              method: 'DELETE',
              headers: { 'Authorization': \`Bearer \${token}\` }
            });
            
            if (response.ok) {
              loadGallery();
            } else {
              alert('Chyba při mazání');
            }
          } catch (error) {
            alert('Chyba při mazání');
            console.error(error);
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    users: users.length,
    galleryItems: gallery.length
  });
});

// Spuštění serveru
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('🎨  svag Backend Server');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log(`✅  Server běží na:       http://localhost:${PORT}`);
  console.log(`🖼️  Galerie dostupná na:  http://localhost:${PORT}/gallery`);
  console.log(`❤️  Health check:         http://localhost:${PORT}/health`);
  console.log('');
  console.log('📝  API endpointy:');
  console.log('   POST   /api/auth/register  - Registrace');
  console.log('   POST   /api/auth/login     - Přihlášení');
  console.log('   GET    /api/gallery        - Načíst galerii');
  console.log('   POST   /api/gallery        - Přidat SVG');
  console.log('   DELETE /api/gallery/:id    - Smazat SVG');
  console.log('');
  console.log('⚠️  POZOR: Toto je pouze demo verze!');
  console.log('   Pro produkci implementujte databázi a bezpečnostní opatření.');
  console.log('═══════════════════════════════════════════════');
  console.log('');
});


