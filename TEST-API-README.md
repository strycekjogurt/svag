# 🧪 Test API Token - svag v1.2.0

Tento balíček obsahuje dva testovací nástroje pro ladění problémů s JWT tokenem a API calls.

## 📁 Soubory

1. **test-api-token.html** - Interaktivní HTML nástroj (běží v browseru)
2. **test-api-token.js** - CLI nástroj (běží v Node.js)

---

## 🌐 HTML Nástroj (Doporučený)

### Jak spustit:

1. **Otevřete extension v Chrome**
2. **Klikněte na extension ikonu** → Extension popup se otevře
3. **Zkontrolujte, že jste přihlášeni** (zelený stav)
4. **Otevřete `test-api-token.html`** přímo v Chrome (přetáhněte soubor do browseru nebo otevřete přes `File > Open File`)

### Použití:

1. **Klikněte na "📦 Načíst token z extension"**
   - Automaticky načte token z `chrome.storage.sync`
   - Dekóduje token a zobrazí info (User ID, Email, Expirace)
   
2. **Zkontrolujte token info:**
   - ✅ Platný → Token má ještě čas do vypršení
   - ❌ VYPRŠEL → Token je neplatný, odhlaste se a znovu se přihlaste
   
3. **Klikněte na "🚀 Testovat API volání"**
   - Odešle testovací request na `https://svag.pro/api/gallery`
   - Zobrazí detailní výsledky (status, headers, response body)

### Co nástroj testuje:

- ✅ Dekódování JWT tokenu
- ✅ Kontrola expirace
- ✅ Skutečný POST request na API
- ✅ Response status (200, 401, 400, etc.)
- ✅ Response body (JSON nebo text)

### Výhody HTML nástroje:

- ✅ Má přístup k `chrome.storage.sync` (automatické načtení tokenu)
- ✅ Vizuální rozhraní
- ✅ Detailní logy s timestampy
- ✅ Barevné rozlišení (success/error/info)

---

## 🖥️ CLI Nástroj (Node.js)

### Jak spustit:

```bash
# Varianta 1: S tokenem jako argument
node test-api-token.js "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Varianta 2: Interaktivní (skript se zeptá)
node test-api-token.js
```

### Co nástroj testuje:

- ✅ Dekódování JWT tokenu
- ✅ Kontrola expirace
- ✅ Skutečný HTTPS POST request na API
- ✅ Response status (200, 401, 400, etc.)
- ✅ Response body a headers

### Jak získat token pro CLI:

1. Otevřete Chrome DevTools (F12)
2. Přejděte do **Console**
3. Zadejte:
   ```javascript
   chrome.storage.sync.get(['apiToken'], (result) => console.log(result.apiToken));
   ```
4. Zkopírujte token
5. Vložte do CLI nástroje

---

## 🐛 Ladění problému s 401 Unauthorized

### Krok 1: Rozšířené logy v background.js

V `background.js` jsem přidal detailní debug logy:

```javascript
console.log('[background] API URL:', request.apiUrl);
console.log('[background] Token preview:', token.substring(0, 20) + '...');
console.log('[background] SVG size:', request.data?.svg?.length);
console.log('[background] Response status:', response.status);
```

### Krok 2: Reload extension

1. Otevřete `chrome://extensions/`
2. Klikněte na **🔄 Reload** u svag extension
3. Otevřete DevTools (F12) → **Console**
4. Otevřete kteroukoliv stránku se SVG (např. `svg-test-cases.html`)
5. Najeďte myší na SVG ikonu
6. Klikněte na **Save to Gallery**

### Krok 3: Zkontrolujte logy

V Console by měly být tyto logy:

```
[svag v1.2.0] Token expires in X minutes
[svag v1.2.0] sendToGallery: Sending to API...
[background] saveToGallery: Odesílám do API...
[background] API URL: https://svag.pro/api/gallery
[background] Token preview: eyJhbGciOiJIUzI1Ni...
[background] SVG size: 234 chars
[background] Response status: 200 OK  (nebo 401 Unauthorized)
```

### Krok 4: Spusťte HTML test nástroj

1. Otevřete `test-api-token.html`
2. Klikněte na "📦 Načíst token z extension"
3. Zkontrolujte **Token Info** (je token platný?)
4. Klikněte na "🚀 Testovat API volání"
5. Zkontrolujte výsledek

---

## 🎯 Co dělat, když token nefunguje?

### Případ A: Token je vypršelý

```
Token expires in -15.3 minutes  ❌ VYPRŠEL
```

**Řešení:**
1. Klikněte na extension popup
2. Odhlaste se (Logout)
3. Znovu se přihlaste
4. Zkuste znovu

### Případ B: Token je platný, ale API vrací 401

```
Token expires in 54.6 minutes  ✅ Platný
Response status: 401 Unauthorized  ❌
```

**Možné příčiny:**

1. **Token není správně dekódovaný** → Zkontrolujte v HTML nástroji
2. **Token je poškozený při přenosu** → Zkontrolujte background.js logy
3. **API endpoint očekává jiný formát tokenu** → Zkontrolujte API dokumentaci
4. **Token byl revokován na serveru** → Odhlaste se a znovu se přihlaste

**Řešení:**

1. Zkontrolujte logy v `background.js` (token preview)
2. Spusťte HTML test nástroj a porovnejte token
3. Zkuste se odhlásit a znovu přihlásit
4. Zkontrolujte, jestli `refreshToken` funguje (měl by automaticky refreshovat token před expirací)

### Případ C: Token není v storage

```
❌ Token nenalezen v extension storage
```

**Řešení:**
1. Přihlaste se v extension popup
2. Zkontrolujte storage:
   ```javascript
   chrome.storage.sync.get(['apiToken', 'refreshToken', 'apiUrl'], console.log);
   ```

---

## 📊 Výstup testů

### ✅ SUCCESS (200 OK):

```
✅ SUCCESS! API call byl úspěšný.
Response: {
  "success": true,
  "iconId": "12345",
  "message": "Icon saved to gallery"
}
```

### ❌ ERROR (401 Unauthorized):

```
❌ ERROR! API vrátil 401
Response body: {"error": "Unauthorized", "message": "Token invalid or expired"}

💡 TIP: Token je neplatný nebo vypršel.
   → Zkuste se odhlásit a znovu přihlásit v extension popup.
```

### ❌ ERROR (400 Bad Request):

```
❌ ERROR! API vrátil 400
Response body: {"error": "Bad Request", "message": "SVG data is invalid"}

💡 TIP: Špatný formát requestu.
   → Zkontrolujte, jestli SVG data jsou validní.
```

---

## 🔍 Debug Checklist

- [ ] Extension je reloadovaná (`chrome://extensions/` → 🔄 Reload)
- [ ] Console je otevřená (DevTools → Console)
- [ ] Vidím logy z `[svag v1.2.0]` a `[background]`
- [ ] Token je platný (nezmizel před více než X minutami)
- [ ] HTML test nástroj ukazuje stejný token jako console
- [ ] API URL je správná (`https://svag.pro/api/gallery`)
- [ ] SVG data jsou validní (obsahují `<svg>` element)

---

## 📞 Kontakt

Pokud ani jeden z testů nefunguje a API stále vrací 401, pošlete mi:

1. **Logy z Console** (celý výpis)
2. **Screenshot z HTML test nástroje** (včetně Token Info)
3. **Token preview** (prvních 30 a posledních 10 znaků)

---

**Verze:** 1.2.0  
**Datum:** 18.11.2025

