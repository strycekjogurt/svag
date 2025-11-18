# 🔧 Debug Guide - Icon Preview Fix

## ✅ CO JSEM OPRAVIL

### 1. Server Logging (`server.js`)
Přidal jsem **detailní debug logy** do authenticate middleware:

```javascript
// Middleware pro autentizaci (line 205-241)
async function authenticate(req, res, next) {
  // 🔍 Loguje všechny příchozí headers
  console.log('🔍 [AUTH] Request headers:', {
    authorization: req.headers.authorization ? 'present' : 'MISSING',
    contentType: req.headers['content-type'],
    origin: req.headers.origin,
    userAgent: req.headers['user-agent']?.substring(0, 50)
  });
  
  // 🔑 Loguje token pokud je přítomen
  if (token) {
    console.log('🔑 [AUTH] Token received, length:', token.length);
    console.log('    Token preview:', token.substring(0, 30) + '...');
  }
  
  // ⚠️ Loguje přesnou chybu od Supabase
  if (error || !user) {
    console.log('⚠️  [AUTH] Supabase validation failed:', error?.message);
    console.log('    Error details:', JSON.stringify(error, null, 2));
  }
}
```

### 2. Popup Logging (`popup.js`)
Přidal jsem **detailní debug logy** do loadRecentIcons:

```javascript
async function loadRecentIcons(token) {
  console.log('🔄 Loading recent icons...');
  console.log('🔑 Token length:', token?.length);
  console.log('🔑 Token preview:', token?.substring(0, 30) + '...');
  console.log('📍 API URL:', apiUrl);
  console.log('📤 Sending request with Authorization header');
  
  // Po response:
  console.log('📥 API responses:', {
    icons: iconsResponse.status,
    stats: statsResponse.status
  });
  
  // Při 401:
  if (iconsResponse.status === 401) {
    const errorBody = await iconsResponse.clone().text();
    console.error('❌ API returned 401:', errorBody);
    console.log('🔍 Server says token is invalid or missing');
  }
}
```

### 3. Test Script (`test-server-auth.js`)
Vytvořil jsem standalone Node.js script pro testování server API:

```bash
node test-server-auth.js YOUR_TOKEN
```

---

## 🧪 JAK TESTOVAT

### Step 1: Reload Extension
```bash
# V Chrome:
# 1. chrome://extensions/
# 2. Najděte "svag"
# 3. Klikněte "Reload"
```

### Step 2: Otevřete Popup Console
```bash
# 1. Klikněte na extension icon (otevře popup)
# 2. Pravý klik na popup → "Inspect"
# 3. V DevTools console uvidíte všechny logy
```

### Step 3: Server Logy
```bash
# V terminálu kde běží server:
npm run dev

# Sledujte logy začínající [AUTH]:
# 🔍 [AUTH] Request headers: ...
# 🔑 [AUTH] Token received, length: ...
# ✅ [AUTH] Authentication successful: ...
```

### Step 4: Porovnejte Logy

**✅ Očekávaný úspěšný flow:**

```
POPUP CONSOLE:
🔄 Loading recent icons...
🔑 Token length: 762
🔑 Token preview: eyJhbGciOiJIUzI1NiIsInR5cCI6...
📍 API URL: https://svag.pro
📤 Sending request with Authorization header
📥 API responses: { icons: 200, stats: 200 }
✅ Loaded 3 icons from API

SERVER CONSOLE:
🔍 [AUTH] Request headers: { authorization: 'present', ... }
🔑 [AUTH] Token received, length: 762
    Token preview: eyJhbGciOiJIUzI1NiIsInR5cCI6...
✅ [AUTH] Authentication successful: user@example.com
```

**❌ Pokud vidíte 401:**

```
POPUP CONSOLE:
🔄 Loading recent icons...
🔑 Token length: 762
📤 Sending request with Authorization header
📥 API responses: { icons: 401, stats: 401 }
❌ API returned 401: {"error":"No token provided"}
🔍 Server says token is invalid or missing

SERVER CONSOLE:
🔍 [AUTH] Request headers: { authorization: 'MISSING', ... }  ← PROBLÉM!
⚠️  [AUTH] Authentication failed: No token provided
    Authorization header: undefined
```

---

## 🔍 MOŽNÉ PROBLÉMY A ŘEŠENÍ

### Problem 1: Authorization header MISSING on server

**Příznaky:**
- Popup: Token se posílá ✅
- Server: Authorization header = MISSING ❌

**Příčina:** CORS preflight request nepovoluje Authorization header

**Řešení:** Zkontrolujte CORS config v `server.js`:

```javascript
app.use(cors({
  origin: '*',  // ← Nebo specifické domény
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],  // ← MUSÍ být!
  credentials: false  // ← Pokud origin: '*'
}));
```

**Test CORS:**
```bash
curl -X OPTIONS https://svag.pro/api/gallery \
  -H "Origin: chrome-extension://YOUR_EXTENSION_ID" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization" \
  -v
```

Hledejte v response:
```
Access-Control-Allow-Headers: authorization  ← MUST be present
```

---

### Problem 2: Token present but Supabase rejects it

**Příznaky:**
- Popup: Token se posílá ✅
- Server: Token received ✅
- Server: Supabase validation failed ❌

**Příčina:** Token je nevalidní nebo expirovaný

**Řešení:**

1. **Zkontrolujte token expiraci:**
```javascript
// V popup console:
const result = await chrome.storage.sync.get(['apiToken']);
const token = result.apiToken;
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token expires:', new Date(payload.exp * 1000));
console.log('Now:', new Date());
```

2. **Zkuste refresh token:**
```javascript
// V popup: Logout → Login znovu
// Tím získáte fresh token
```

3. **Test s curl:**
```bash
# Získejte token z extension
# Pak:
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://svag.pro/api/gallery
```

---

### Problem 3: CORS error from browser

**Příznaky:**
```
Access to fetch at 'https://svag.pro/api/gallery' from origin 'chrome-extension://...'
has been blocked by CORS policy
```

**Řešení:** Ujistěte se že extension manifest má správné permissions:

```json
// manifest.json
{
  "permissions": [
    "activeTab",
    "storage",
    "https://svag.pro/*"  // ← Přidejte pokud chybí
  ],
  "host_permissions": [
    "https://svag.pro/*"  // ← Manifest v3
  ]
}
```

---

### Problem 4: Server nedostává požadavek vůbec

**Příznaky:**
- Popup: Request odeslaný ✅
- Server: Žádný log ❌

**Možné příčiny:**
1. Server neběží
2. Špatná API URL (www.svag.pro vs https://svag.pro)
3. Request jde na jiný server/port

**Řešení:**

1. **Ověřte že server běží:**
```bash
npm run dev
# Mělo by vypsat: Server running on port 3000
```

2. **Zkontrolujte API URL v popup console:**
```javascript
chrome.storage.sync.get(['apiUrl'], r => console.log(r.apiUrl));
// Mělo by být: https://svag.pro
```

3. **Test ping:**
```bash
curl https://svag.pro/api/gallery
# Měl by vrátit 401 (ne connection refused)
```

---

## 🧪 ADVANCED: Test Script Usage

Pokud chcete testovat přímo z Node.js (obejít browser):

### 1. Získejte Token
```javascript
// V popup console (Inspect popup):
chrome.storage.sync.get(['apiToken'], result => {
  console.log(result.apiToken);
});
// Zkopírujte token
```

### 2. Spusťte Test
```bash
node test-server-auth.js YOUR_TOKEN_HERE
```

### 3. Analyzujte Output
```
🧪 Testing server authentication...
📍 API URL: https://svag.pro
🔑 Token length: 762
🔑 Token preview: eyJhbGciOiJIUzI1NiIsInR5cCI6...

📤 Testing: GET /api/gallery
────────────────────────────────────────────────────────────
📥 Status: 200 OK
📥 Headers: {...}
📥 Body: [{"id":1,"name":"icon1",...}]
✅ SUCCESS

📊 SUMMARY
════════════════════════════════════════════════════════════
Gallery: ✅ PASS
Stats: ✅ PASS
```

---

## ✅ CHECKLIST PRO ÚSPĚŠNÉ FUNGOVÁNÍ

- [ ] Server běží (`npm run dev`)
- [ ] CORS povoluje Authorization header
- [ ] Extension je reloadovaná (`chrome://extensions/`)
- [ ] Popup console ukazuje token length > 0
- [ ] Server logy ukazují `[AUTH] Request headers: { authorization: 'present' }`
- [ ] Server logy ukazují `✅ Authentication successful`
- [ ] Popup console ukazuje `✅ Loaded X icons from API`
- [ ] Icon preview v popup zobrazuje 3 ikony

---

## 📞 POKUD STÁLE NEFUNGUJE

**Zašlete mi tyto logy:**

1. **Popup console** (celý output od "Loading recent icons...")
2. **Server console** (všechny logy začínající [AUTH])
3. **API URL** z popup console
4. **Token expiration** (viz "Zkontrolujte token expiraci" výše)

S těmito informacemi přesně identifikuji kde se flow láme.

