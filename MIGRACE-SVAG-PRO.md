# 🚀 Migrace na doménu svag.pro

## ✅ Hotové změny v kódu

Všechny odkazy na `svag.vercel.app` byly aktualizovány na `svag.pro` v následujících souborech:

### Extension soubory
- ✅ `config.js` - API URL
- ✅ `manifest.json` - gallery matches
- ✅ `popup.js` - API URL a error messages
- ✅ `popup.html` - hidden API URL input
- ✅ `background.js` - sync login API URL
- ✅ `content.js` - token refresh a gallery API
- ✅ `svag-chrome-extension/` - všechny soubory v extension složce

### Backend soubory
- ✅ `server.js` - FRONTEND_URL fallback
- ✅ `env.template` - FRONTEND_URL komentáře

### Dokumentace
- ✅ `README.md`
- ✅ `SETUP.md`
- ✅ `DEPLOYMENT-GUIDE.md`
- ✅ `PRODUCTION-READY.md`
- ✅ `BACKEND-README.md`
- ✅ `LANDING-PAGE.md`
- ✅ `Gallery/README.md`

### Build
- ✅ Chrome extension byl přebudován: `svag-extension.zip` (36K)

---

## 📋 Manuální kroky k dokončení

### 1. DNS konfigurace u registrátora

Přihlaste se do správy domény svag.pro u vašeho registrátora a přidejte tyto DNS záznamy:

**Pro apex doménu (svag.pro):**
```
Typ:   A
Name:  @ (nebo prázdné)
Value: 76.76.21.21
TTL:   Auto nebo 3600
```

**Pro www subdoménu (www.svag.pro):**
```
Typ:   CNAME
Name:  www
Value: cname.vercel-dns.com
TTL:   Auto nebo 3600
```

⏱️ **Čas propagace:** 5-60 minut (záleží na registrátorovi)

---

### 2. Vercel Dashboard - Přidání custom domény

1. Přihlaste se na [vercel.com/dashboard](https://vercel.com/dashboard)
2. Vyberte projekt **svag**
3. Přejděte na **Settings → Domains**
4. Klikněte na **Add Domain**
5. Přidejte: `svag.pro`
   - Označte jako **Primary Domain**
   - Vercel automaticky vytvoří SSL certifikát
6. Klikněte na **Add Domain** znovu
7. Přidejte: `www.svag.pro`
   - Nastavte **Redirect** na `svag.pro`

Vercel automaticky ověří DNS záznamy a nastaví HTTPS.

---

### 3. Supabase Dashboard - Aktualizace URL

Přihlaste se do [Supabase Dashboard](https://supabase.com/dashboard):

#### A) Site URL
1. Přejděte na: **Authentication → URL Configuration**
2. Najděte pole **Site URL**
3. Změňte z: `https://svag.vercel.app`
4. Na: `https://svag.pro`
5. Klikněte **Save**

#### B) Redirect URLs
1. Ve stejné sekci najděte **Redirect URLs**
2. Přidejte tyto URL (každou na nový řádek):
   ```
   https://svag.pro/**
   https://www.svag.pro/**
   ```
3. **Volitelně:** Můžete ponechat i staré URL pro přechodné období:
   ```
   https://svag.vercel.app/**
   ```
4. Klikněte **Save**

#### C) Email Templates (kontrola)
1. Přejděte na: **Authentication → Email Templates**
2. Zkontrolujte všechny šablony:
   - **Confirm signup**
   - **Magic Link**
   - **Change Email Address**
3. Pokud obsahují hardcodovaný `svag.vercel.app`, nahraďte za:
   - `{{ .SiteURL }}` (doporučeno - používá Site URL z nastavení)
   - nebo `https://svag.pro` (pevně)

---

### 4. Environment variables ve Vercel

1. V **Vercel Dashboard → Settings → Environment Variables**
2. Najděte proměnnou: **FRONTEND_URL**
3. Změňte hodnotu z: `https://svag.vercel.app`
4. Na: `https://svag.pro`
5. Klikněte **Save**
6. **Důležité:** Redeploy aplikace pro aplikování změn
   - Přejděte na **Deployments**
   - Klikněte na poslední deployment
   - Vyberte **... → Redeploy**

---

### 5. Testování po migraci

Po dokončení všech kroků otestujte:

#### ✅ Landing Page
- [ ] Otevřete `https://svag.pro` - měla by se načíst hlavní stránka
- [ ] Otevřete `https://www.svag.pro` - mělo přesměrovat na `https://svag.pro`
- [ ] Zkontrolujte, že HTTPS funguje (zelený zámek v prohlížeči)

#### ✅ API Endpointy
- [ ] `https://svag.pro/health` - mělo vrátit `{"status":"ok"}`
- [ ] `https://svag.pro/api/gallery` - mělo vrátit JSON s ikonami (pokud přihlášen)

#### ✅ Chrome Extension
1. Nahrajte nový `svag-extension.zip` do Chrome:
   - Otevřete `chrome://extensions/`
   - Zapněte **Developer mode**
   - Klikněte **Load unpacked** nebo **Update**
2. Otestujte přihlášení:
   - [ ] Zadejte email
   - [ ] Ověřte, že OTP kód přijde na email
   - [ ] Přihlaste se
3. Otestujte stahování SVG:
   - [ ] Najděte SVG na nějaké stránce
   - [ ] Zkuste ho stáhnout do galerie
   - [ ] Otevřete galerii: `https://svag.pro/gallery`
   - [ ] Ověřte, že ikona je v galerii

#### ✅ Autentizace
- [ ] Test registrace nového uživatele
- [ ] Test přihlášení existujícího uživatele
- [ ] Test OTP kódů z emailu

---

## 🔄 Zpětná kompatibilita

**Vercel automaticky zachová:**
- `svag.vercel.app` bude nadále fungovat jako sekundární doména
- Všechny požadavky na `svag.vercel.app` můžete později přesměrovat na `svag.pro`

**Doporučení:**
- Ponechte `svag.vercel.app` aktivní alespoň 1-2 týdny
- Sledujte logy pro případné requesty na starou doménu
- Po ověření, že vše funguje, můžete nastavit redirect

---

## 📝 Checklist

- [ ] **DNS záznamy přidány** u registrátora
- [ ] **Custom domény přidány** ve Vercel (svag.pro + www.svag.pro)
- [ ] **SSL certifikáty aktivní** (automaticky Vercel)
- [ ] **Site URL změněn** v Supabase
- [ ] **Redirect URLs aktualizovány** v Supabase
- [ ] **Email templates zkontrolovány** v Supabase
- [ ] **FRONTEND_URL změněn** ve Vercel
- [ ] **Aplikace redeployed** ve Vercel
- [ ] **Landing page funguje** na svag.pro
- [ ] **API endpointy fungují** na svag.pro
- [ ] **Chrome extension funguje** s novou doménou
- [ ] **Autentizace funguje** (registrace + login)

---

## 🆘 Řešení problémů

### DNS se nepropaguje
- Zkontrolujte DNS pomocí: https://dnschecker.org/#A/svag.pro
- Počkejte 5-60 minut na globální propagaci

### Vercel neověří doménu
- Zkontrolujte, že DNS záznamy jsou správně nastavené
- V Vercel klikněte na **Refresh** u domény

### SSL certifikát se nevytváří
- Počkejte 5-10 minut po ověření DNS
- Vercel automaticky vytvoří Let's Encrypt certifikát

### Extension nefunguje s novou doménou
- Zkontrolujte Console v extension (F12 v popup)
- Ověřte, že `config.js` má správnou URL: `https://svag.pro`
- Zkuste extension reinstalovat

### Supabase emaily nefungují
- Zkontrolujte Site URL v Supabase
- Zkontrolujte Redirect URLs v Supabase
- Zkontrolujte spam složku

---

## 📞 Kontakt

Pokud narazíte na problémy, zkontrolujte:
1. **Vercel Dashboard** → Deployments → Logs
2. **Supabase Dashboard** → Logs
3. **Chrome DevTools** → Console (F12)

---

**Poslední aktualizace:** 15. listopadu 2025
**Verze:** 1.0.0

