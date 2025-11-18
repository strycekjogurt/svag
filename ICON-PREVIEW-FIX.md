# 🎯 Icon Preview Fix - Implementace

## 🐛 Identifikovaný Problém

Z popup console logu:
```
❌ GET https://www.svag.pro/api/gallery 401 (Unauthorized)
❌ API returned 401: {"error":"No token provided"}
✅ localStorage fallback funguje → ikony se načtou
```

**Root Cause:**
1. **API URL obsahuje `www.svag.pro`** místo `svag.pro`
2. **Server nedostává Authorization header** → CORS pre-flight problém
3. **Token je validní** (localStorage fallback funguje)

---

## ✅ Implementované Opravy

### 1. Server CORS Fix (`server.js`)

**PŘED:**
```javascript
app.use(cors({
  origin: '*',
  credentials: false
}));
```

**PO:**
```javascript
app.use(cors({
  origin: true,  // ✅ Podporuje chrome-extension://
  credentials: true,  // ✅ Povolí Authorization header
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization']
}));

// Explicitní pre-flight handler
app.options('/api/*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});
```

**Proč to pomůže:**
- `origin: true` → dynamicky povolí jakýkoli origin (včetně `chrome-extension://`)
- `credentials: true` → povolí Authorization header v CORS requestech
- Explicitní OPTIONS handler → zajistí že pre-flight requests správně povolí Authorization

---

### 2. Client URL Normalization (`popup.js`)

**Přidáno:**
```javascript
// Normalizovat API URL (odstranit www., zajistit https://)
apiUrl = apiUrl.replace(/^(https?:\/\/)?(www\.)?/, 'https://').replace(/\/$/, '');
console.log('✅ API URL (normalized):', apiUrl);

// Uložit zpět do storage
if (apiUrl !== result.apiUrl) {
  await chrome.storage.sync.set({ apiUrl: apiUrl });
  console.log('💾 Saved normalized URL to storage');
}
```

**Transformace:**
- `www.svag.pro` → `https://svag.pro`
- `http://svag.pro` → `https://svag.pro`
- `https://svag.pro/` → `https://svag.pro`

**Proč to pomůže:**
- Zajistí konzistentní API URL napříč celou aplikací
- `www.` subdoména může mít jiný CORS config

---

### 3. Enhanced Server Logging (`server.js`)

Authenticate middleware nyní loguje:
```javascript
console.log('🔍 [AUTH] Request headers:', {
  authorization: req.headers.authorization ? 'present' : 'MISSING',
  origin: req.headers.origin
});

if (token) {
  console.log('🔑 [AUTH] Token received, length:', token.length);
}
```

**Proč to pomůže:**
- Uvidíme zda server skutečně dostává Authorization header
- Identifikujeme zda problém je na client nebo server straně

---

## 🧪 Jak Otestovat

### Step 1: Restart Server
```bash
# Zastavte současný server (Ctrl+C)
npm run dev
```

**Očekávaný output:**
```
Server running on port 3000
```

---

### Step 2: Reload Extension
```
1. Otevřete: chrome://extensions/
2. Najděte "svag"
3. Klikněte "Reload" button
```

---

### Step 3: Clear Storage & Re-Login

**V popup console** (Inspect popup):
```javascript
// Vyčistit storage
chrome.storage.sync.clear(() => {
  console.log('✅ Storage cleared');
  location.reload();
});
```

Pak se **znovu přihlaste** → získáte fresh token a správnou API URL.

---

### Step 4: Ověřte Logy

**✅ ÚSPĚCH - Popup Console:**
```
🔄 Loading recent icons...
📍 API URL from storage (raw): https://www.svag.pro
✅ API URL (normalized): https://svag.pro
💾 Saved normalized URL to storage
🔑 Token length: 762
📤 Sending request with Authorization header
📥 API responses: { icons: 200, stats: 200 }
✅ Loaded 3 icons from API
```

**✅ ÚSPĚCH - Server Console:**
```
🔍 [AUTH] Request headers: { authorization: 'present', origin: 'chrome-extension://...' }
🔑 [AUTH] Token received, length: 762
    Token preview: eyJhbGciOiJIUzI1NiIs...
✅ [AUTH] Authentication successful: user@example.com
```

**✅ ÚSPĚCH - UI:**
- Icon preview zobrazuje 3 nejnovější ikony
- Žádné error messages
- Žádný localStorage fallback

---

## ❌ Pokud Stále Nefunguje

### Scenario A: Server stále nevidí Authorization header

**Popup Console:**
```
📥 API responses: { icons: 401, stats: 401 }
```

**Server Console:**
```
🔍 [AUTH] Request headers: { authorization: 'MISSING' }
```

**Diagnóza:** CORS pre-flight stále blokuje Authorization header

**Řešení:**
1. Ověřte že server běží s **novým kódem** (restart po git pull)
2. Test CORS pomocí curl:
```bash
curl -X OPTIONS https://svag.pro/api/gallery \
  -H "Origin: chrome-extension://abc123" \
  -H "Access-Control-Request-Headers: authorization" \
  -v
```

Hledejte v response:
```
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

3. Pokud chybí, zkontrolujte že `app.options('/api/*', ...)` handler je **před** ostatními route handlery

---

### Scenario B: Token je expirovaný

**Popup Console:**
```
⚠️ Token expires in: -5 minutes  (← záporné číslo)
```

**Server Console:**
```
⚠️ [AUTH] Supabase validation failed: JWT expired
```

**Řešení:**
1. Logout z extension popup
2. Login znovu → získáte fresh token

---

### Scenario C: API URL se stále normalizuje na špatnou hodnotu

**Popup Console:**
```
✅ API URL (normalized): https://wrong-domain.com
```

**Řešení:**
```javascript
// V popup console:
chrome.storage.sync.set({ apiUrl: 'https://svag.pro' }, () => {
  console.log('✅ Fixed');
  location.reload();
});
```

---

## 📊 Checklist

Před hlášením problému ověřte:

- [ ] Server běží (`npm run dev` output: "Server running...")
- [ ] Extension je reloadovaná (`chrome://extensions/` → Reload)
- [ ] Storage je vyčištěné + znovu přihlášené (fresh token)
- [ ] Popup console ukazuje: `✅ API URL (normalized): https://svag.pro`
- [ ] Popup console ukazuje: `🔑 Token length: 762`
- [ ] Server console ukazuje: `🔍 [AUTH] Request headers: { authorization: 'present' }`

Pokud všechny checkpoints ✅ ale stále 401:
→ Pošlete **celé logy** (popup + server console)

---

## 🔧 Quick Fixes

### Fix 1: Vyčistit Storage
```javascript
// Popup console:
chrome.storage.sync.clear(() => location.reload());
```

### Fix 2: Nastavit správnou API URL
```javascript
// Popup console:
chrome.storage.sync.set({ apiUrl: 'https://svag.pro' });
```

### Fix 3: Získat aktuální token
```javascript
// Popup console:
chrome.storage.sync.get(['apiToken', 'apiUrl'], r => console.log(r));
```

### Fix 4: Test API manuálně
```bash
# V terminálu (nahraďte YOUR_TOKEN):
node test-server-auth.js YOUR_TOKEN
```

---

## 🎯 Očekávaný Výsledek

Po všech opravách:
1. ✅ API URL je `https://svag.pro` (bez www.)
2. ✅ Server dostává Authorization header
3. ✅ API vrací 200 OK
4. ✅ Icon preview načítá ikony **přímo z API** (ne localStorage fallback)
5. ✅ Popup zobrazuje 3 nejnovější ikony
6. ✅ Žádné error messages v console

**Icon preview bude fungovat okamžitě bez fallbacku!**

