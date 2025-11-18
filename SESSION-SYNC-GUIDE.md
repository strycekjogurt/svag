# 🔄 Session Synchronization Guide - v1.2.0

## Co bylo opraveno?

### Problém
- **Extension** měl vlastní tokeny v `chrome.storage.sync`
- **Web gallery** měl vlastní tokeny v `localStorage`
- **Nebyly synchronizované** → různé účty/session
- Logout v extension neodhlásil web
- Login v extension nesynchronizoval s webem

### Řešení
Extension nyní **automaticky synchronizuje** tokeny mezi popup a všemi otevřenými gallery taby.

---

## 🚀 Jak to funguje

### ✅ Login Synchronizace

Když se **přihlásíte v extension popup**:

1. Token se uloží do `chrome.storage.sync` ✅
2. Extension najde všechny otevřené gallery taby ✅
3. Do každého tabu zapíše token do `localStorage` ✅
4. Pokud je tab na `/gallery/login` → přesměruje na `/gallery` ✅
5. Pokud je tab na `/gallery` → reload pro načtení nových dat ✅

**Výsledek:** Extension a web mají **stejnou session** okamžitě.

---

### ✅ Logout Synchronizace

Když se **odhlásíte v extension popup**:

1. Tokeny se vymažou z `chrome.storage.sync` ✅
2. Extension najde všechny otevřené gallery taby ✅
3. Z každého tabu vymaže token z `localStorage` ✅
4. Pokud je tab na `/gallery` → přesměruje na `/gallery/login` ✅

**Výsledek:** Extension i web jsou **odhlášené** okamžitě.

---

## 🧪 Testovací Scénáře

### Scénář 1: Login v Extension → Web se přihlásí

**Postup:**
1. Otevřete gallery web (`https://svag.pro/gallery`) → měl by ukázat login
2. **NEHLASTE SE** na webu
3. Otevřete extension popup
4. Přihlaste se v extension (email + OTP kód)
5. Vraťte se na gallery tab

**Očekávaný výsledek:**
- Gallery tab se **automaticky přesměruje** z `/gallery/login` na `/gallery`
- Uvidíte přihlášenou gallery s vašimi ikonami
- Email v hlavičce odpovídá emailu z extension

---

### Scénář 2: Logout v Extension → Web se odhlásí

**Postup:**
1. Přihlaste se v extension popup
2. Otevřete gallery web → měl by být přihlášen
3. Klikněte na **Logout** v extension popup
4. Vraťte se na gallery tab

**Očekávaný výsledek:**
- Gallery tab se **automaticky přesměruje** na `/gallery/login`
- Extension popup zobrazuje login form
- Obě místa jsou odhlášené

---

### Scénář 3: Save to Gallery s synchronizovanou session

**Postup:**
1. Přihlaste se v extension popup
2. Otevřete gallery web v jiném tabu
3. Otevřete stránku s SVG ikonami (např. GitHub)
4. Najeďte na SVG ikonu
5. Klikněte na **"Save to Gallery"**
6. Vraťte se na gallery tab

**Očekávaný výsledek:**
- Notifikace: **"saved to gallery"** ✅
- V Console: `[background] Response status: 200 OK` ✅
- Gallery tab zobrazuje **nově uloženou ikonu** (refresh stránky)
- Ikona je uložená pod **správným účtem**

---

### Scénář 4: Více otevřených gallery tabů

**Postup:**
1. Otevřete 3 taby s gallery (`https://svag.pro/gallery`)
2. Přihlaste se v extension popup

**Očekávaný výsledek:**
- **Všechny 3 taby** se synchronizují
- Všechny se přesměrují/reloadují
- Všechny zobrazují stejný přihlášený účet

---

## 🔍 Console Logy

### Při Loginu v Extension

**Extension popup console:**
```
✅ Login successful - synchronizing sessions
✅ Synchronized session for tab: https://svag.pro/gallery
```

**Gallery tab console:**
```
🔄 Extension login - localStorage synchronized
```

---

### Při Logoutu v Extension

**Extension popup console:**
```
🔓 Logout clicked - clearing all sessions
✅ Cleared session for tab: https://svag.pro/gallery
✅ Logout complete
```

**Gallery tab console:**
```
🧹 Extension logout - localStorage cleared
```

---

## ⚙️ Technické Detaily

### Manifest Permissions

Přidané v `manifest.json`:

```json
"permissions": [
  "scripting",  // Pro chrome.scripting.executeScript
  "tabs"        // Pro chrome.tabs.query
]
```

### Synchronizační Mechanismus

**Login (popup.js, řádek 489-525):**
```javascript
const tabs = await chrome.tabs.query({});
for (const tab of tabs) {
  if (tab.url && tab.url.includes('/gallery')) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (token, refreshToken, email) => {
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('userEmail', email);
        // Redirect nebo reload
      },
      args: [data.token, data.refreshToken, currentEmail]
    });
  }
}
```

**Logout (popup.js, řádek 591-633):**
```javascript
const tabs = await chrome.tabs.query({});
for (const tab of tabs) {
  if (tab.url && tab.url.includes('/gallery')) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userEmail');
        // Redirect na /gallery/login
      }
    });
  }
}
```

---

## 🐛 Troubleshooting

### Problém: Gallery tab se nepřesměruje po loginu

**Možné příčiny:**
1. Tab nemá permissions pro script injection
2. URL neobsahuje `/gallery` nebo `apiUrl`

**Řešení:**
- Zkontrolujte Console v popup: `⚠️  Could not sync session for tab: ...`
- Ručně reloadněte gallery tab

---

### Problém: "Save to Gallery" stále vrací 401

**Diagnóza:**
Synchronizace funguje, ale token je neplatný i po refreshi.

**Řešení:**
1. Odhlaste se v popup (Logout)
2. Zkontrolujte že gallery tab se přesměroval na login
3. Znovu se přihlaste v popup
4. Ověřte že gallery tab se přesměroval zpět na gallery
5. Zkuste Save to Gallery znovu

---

### Problém: Console ukazuje "Could not sync session"

**Možné příčiny:**
- Tab není na gallery URL
- Tab nemá aktivní content script
- Browser blokuje scripting na tomto tabu

**Řešení:**
Ignorovat - extension automaticky přeskočí taby, které nelze synchronizovat. Ostatní taby se synchronizují správně.

---

## ✅ Checklist Úspěšné Synchronizace

- [ ] Extension reloadovaná (`chrome://extensions/` → 🔄 Reload)
- [ ] Přihlášení v popup synchronizuje všechny gallery taby
- [ ] Odhlášení v popup odhlásí všechny gallery taby
- [ ] Save to Gallery vrací 200 OK místo 401
- [ ] Nově uložené ikony se zobrazují v gallery
- [ ] Console ukazuje "✅ Synchronized session for tab"

---

## 🎯 Očekávané Výsledky

| Akce | Extension Popup | Gallery Web | Výsledek |
|------|----------------|-------------|----------|
| Login v popup | ✅ Přihlášen | ✅ Přihlášen | Sync ✅ |
| Logout v popup | ❌ Odhlášen | ❌ Odhlášen | Sync ✅ |
| Save to Gallery | Používá token | Zobrazí ikonu | 200 OK ✅ |
| Login na webu | ❌ Nesynchronizuje | ✅ Přihlášen | ⚠️  Manuál |

**Poznámka:** Login přímo na webu (ne přes extension) se **nesynchronizuje** do extension. Použijte vždy extension popup pro přihlášení.

---

**Verze:** 1.2.0  
**Datum:** 18.11.2025  
**Status:** Production Ready

