# 🧪 Testing Guide - Gallery Authentication Fix v1.2.0

## Co bylo opraveno?

### Problém
- Extension popup ukazoval stav "přihlášen" ✅
- Ale "Save to Gallery" zobrazovalo "not logged in" ❌
- Token byl validní (vyprší za 54 minut), ale nebyl použit

### Řešení
1. **`getValidToken()`** - větší tolerance, vrací token i bez refreshToken
2. **`sendToGallery()`** - automatic token refresh + retry při 401
3. **Lepší diagnostika** - detailní logy o tom, co se děje

---

## 🚀 Testovací Postup

### Krok 1: Reload Extension

1. Otevřete `chrome://extensions/`
2. Najděte **svag** extension
3. Klikněte na **🔄 Reload**

### Krok 2: Přihlaste se v Popup

1. Klikněte na extension ikonu v toolbaru
2. Pokud nejste přihlášeni, zadejte email a heslo
3. Ověřte, že popup ukazuje **"✅ Přihlášen"**

### Krok 3: Otevřete Test Stránku

Otevřete jednu z těchto stránek:
- `svg-test-cases.html` (lokální test soubor)
- Jakoukoliv stránku se SVG ikonami (např. GitHub, Una aplikace)

### Krok 4: Otevřete Console (F12)

Stiskněte **F12** a přejděte do záložky **Console**

### Krok 5: Spusťte Debug Helper

```javascript
// 1. Zkontrolovat token info
await svagDebug.decodeToken()
```

**Očekávaný výstup:**
```
🔍 Token Info:
   User ID: 123
   Email: your@email.com
   Expirace: 18.11.2025, 22:30:00
   Status: ✅ Platný (54.6 min)
```

### Krok 6: Testovat Direct API Call

```javascript
// 2. Testovat přímý API call
await svagDebug.testGalleryAPI()
```

**Očekávaný výstup (SUCCESS):**
```
🚀 Testuji API call...
   URL: https://svag.pro/api/gallery
   Token length: 287
✅ SUCCESS! { success: true, iconId: "...", message: "..." }
```

**Pokud vidíte ERROR:**
```
❌ ERROR 401: {"error": "Unauthorized"}
```
→ Token je neplatný na API straně (problém na serveru, ne v extensionu)

### Krok 7: Testovat Save to Gallery z UI

1. **Najeďte myší** na nějakou SVG ikonu na stránce
2. Měly by se objevit **dva buttony**: Download a Gallery
3. **Klikněte na "Save to Gallery"**

**Očekávané logy v Console:**

```
[svag v1.2.0] Token expires in 54.6 minutes
[svag v1.2.0] Token is valid, no refresh needed
[svag v1.2.0] sendToGallery: Začínám odesílání...
[svag v1.2.0] sendToGallery: Odesílám přes background script...
[background] saveToGallery: Odesílám do API...
[background] API URL: https://svag.pro/api/gallery
[background] Token preview: eyJhbGciOiJIUzI1Ni...
[background] Response status: 200 OK
[background] saveToGallery: Úspěšně uloženo ✅
[svag v1.2.0] sendToGallery: Úspěšně uloženo do galerie
```

**Očekávaná notifikace:**
```
✅ saved to gallery
```

---

## 🔍 Co hledat v logách?

### ✅ Správné chování

1. **Token je načten:**
   ```
   [svag v1.2.0] Token expires in X minutes
   ```

2. **Token není třeba refreshovat:**
   ```
   [svag v1.2.0] Token is valid, no refresh needed
   ```

3. **Request je odeslán:**
   ```
   [background] saveToGallery: Odesílám do API...
   ```

4. **API vrátí 200 OK:**
   ```
   [background] Response status: 200 OK
   ```

### ⚠️  Automatic Refresh (pokud token brzy vyprší)

Pokud token vyprší za méně než 5 minut, měli byste vidět:

```
🔄 Token expiring soon, attempting refresh...
✅ Token refreshed successfully
[svag v1.2.0] Token is valid, no refresh needed
```

### ❌ Error Scenáře

#### Scénář A: Token není v storage

```
[svag v1.2.0] getValidToken: Token chybí v storage
not logged in
```

**Řešení:** Přihlaste se v popup

#### Scénář B: Token je vypršelý

```
[svag v1.2.0] Token EXPIRED, cannot use
not logged in
```

**Řešení:** Extension automaticky otevře popup pro přihlášení

#### Scénář C: API vrací 401 i po refresh

```
[svag v1.2.0] Gallery API error 401: Unauthorized - attempting token refresh
[svag v1.2.0] Attempting to refresh token...
[svag v1.2.0] Token refreshed successfully, retrying gallery save...
[background] Response status: 401 Unauthorized
[svag v1.2.0] Token refresh failed or unavailable
session expired - please login
```

**Řešení:** Odhlaste se a znovu se přihlaste v popup

#### Scénář D: Connection error

```
[svag v1.2.0] Runtime error: ...
connection error
```

**Možné příčiny:**
- Background script nereaguje
- Chrome runtime error
- Network problém

---

## 🎯 Checklist úspěšného testu

- [ ] Extension reloadovaná
- [ ] Přihlášen v popup (✅ zelený stav)
- [ ] `svagDebug.decodeToken()` ukazuje validní token
- [ ] `svagDebug.testGalleryAPI()` vrací SUCCESS (200)
- [ ] Najetí myší na SVG zobrazí buttony
- [ ] Kliknutí na "Save to Gallery" zobrazí "saved to gallery"
- [ ] V Console vidím "[background] Response status: 200 OK"
- [ ] Ikona se objeví v galerii na svag.pro

---

## 🐛 Co dělat, když test selže?

### Test 6 úspěšný, ale Test 7 selhává (401)

**Diagnóza:** Direct API call funguje, ale přes background script ne.

**Možná příčina:**
- Token se neposílá správně z content.js do background.js
- Background script posílá špatný Authorization header

**Debug:**
```javascript
// V Console zkontrolovat background logy
// Měly by obsahovat:
[background] Token preview: eyJhbGciOiJIUzI1Ni...
```

### Test 6 selhává s 401

**Diagnóza:** Token je na API straně neplatný.

**Možné příčiny:**
1. Token není správně signed (API problém)
2. Token je pro jiný environment (dev vs prod)
3. User ID v tokenu neexistuje v databázi

**Řešení:**
1. Odhlaste se v popup
2. Znovu se přihlaste
3. Opakujte test

### Test 6 i 7 selhávají s "Token chybí v storage"

**Diagnóza:** Login v popup neuložil token.

**Řešení:**
1. Zkontrolovat popup.js console (během loginu)
2. Ověřit že `chrome.storage.sync.set()` se volá
3. Ověřit v Console:
   ```javascript
   chrome.storage.sync.get(['apiToken'], console.log)
   ```

---

## 📊 Expected Results Summary

| Test | Co testuje | Očekávaný výsledek |
|------|-----------|-------------------|
| 1 | Extension reload | Žádné errory |
| 2 | Login | "✅ Přihlášen" v popup |
| 3 | Load test page | SVG ikony viditelné |
| 4 | Open Console | Žádné errory při načtení |
| 5 | svagDebug.decodeToken() | Token info, Status: ✅ Platný |
| 6 | svagDebug.testGalleryAPI() | ✅ SUCCESS! 200 OK |
| 7 | Save to Gallery (UI) | "saved to gallery" |

---

## 🎉 Pokud všechny testy projdou

Gratulujeme! Gallery Authentication Flow funguje správně.

- ✅ Token se správně načítá z storage
- ✅ Token se automaticky refreshuje před expirací
- ✅ Při 401 se zkusí refresh + retry
- ✅ Ikony se ukládají do galerie

---

**Verze:** 1.2.0  
**Datum:** 18.11.2025  
**Status:** Ready for testing

