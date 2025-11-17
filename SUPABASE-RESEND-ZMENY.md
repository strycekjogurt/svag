# 🔐 Změny v Supabase a Resend pro svag.pro

## 📧 Resend

### ✅ Žádné změny potřeba!

Projekt **nepoužívá Resend**. Všechny autentizační emaily (OTP kódy, aktivační linky) se posílají přímo přes **Supabase Auth**.

---

## 🗄️ Supabase - KRITICKÉ ZMĚNY

### 1. Site URL (⚠️ POVINNÉ)

**Kde:** Authentication → URL Configuration → Site URL

**Změna:**
```
Staré: https://svag.vercel.app
Nové:  https://svag.pro
```

**Co to ovlivňuje:**
- Základní URL pro všechny auth redirecty
- URL v email šablonách (pokud používají `{{ .SiteURL }}`)
- OAuth callback URLs

---

### 2. Redirect URLs (⚠️ POVINNÉ)

**Kde:** Authentication → URL Configuration → Redirect URLs

**Přidat tyto URL:**
```
https://svag.pro/**
https://www.svag.pro/**
```

**Volitelně ponechat (pro přechodné období):**
```
https://svag.vercel.app/**
```

**Co to ovlivňuje:**
- Kam Supabase může přesměrovat po autentizaci
- Bezpečnostní whitelist pro OAuth flow
- Magic Link redirecty

---

### 3. Email Templates (⚠️ DOPORUČENO ZKONTROLOVAT)

**Kde:** Authentication → Email Templates

**Šablony ke kontrole:**
1. **Confirm signup** (`activate-email-supabase.html`)
2. **Magic Link** (`magiclink-supabase.html`)
3. **Change Email Address**
4. **Reset Password**

**Co hledat:**
- Hardcodované odkazy typu `https://svag.vercel.app/...`
- Pokud najdete, nahraďte za:
  - `{{ .SiteURL }}/...` (doporučeno - dynamické)
  - nebo `https://svag.pro/...` (statické)

**Příklad změny:**
```html
<!-- PŘED -->
<a href="https://svag.vercel.app/activate">Aktivovat účet</a>

<!-- PO (varianta 1 - doporučeno) -->
<a href="{{ .SiteURL }}/activate">Aktivovat účet</a>

<!-- PO (varianta 2) -->
<a href="https://svag.pro/activate">Aktivovat účet</a>
```

**Šablony v projektu:**
- `emails/activate-email-supabase.html` - používá `{{ .ConfirmationURL }}` ✅ (v pořádku)
- `emails/magiclink-supabase.html` - používá `{{ .Token }}` ✅ (v pořádku)

> ✅ **Vaše šablony v projektu již používají Supabase variables, takže stačí změnit Site URL.**

---

## 🔍 Jak ověřit, že vše funguje

### Test 1: Registrace nového uživatele
1. Otevřete extension popup
2. Zadejte nový email
3. Měl by přijít OTP kód z `noreply@mail.app.supabase.io`
4. Email by měl obsahovat správné odkazy na `svag.pro`

### Test 2: Přihlášení existujícího uživatele
1. Otevřete extension popup
2. Zadejte existující email
3. Měl by přijít OTP kód
4. Ověřte přihlášení

### Test 3: Galerie
1. Přihlaste se v extension
2. Otevřete `https://svag.pro/gallery`
3. Měli byste být automaticky přihlášeni
4. Synchronizace mezi extension a galerií by měla fungovat

---

## 📊 Co se NEMĚNÍ

- **SUPABASE_URL** - zůstává stejný
- **SUPABASE_ANON_KEY** - zůstává stejný
- **SUPABASE_SERVICE_ROLE_KEY** - zůstává stejný
- **Database schema** - žádné změny
- **RLS policies** - žádné změny
- **Functions & Triggers** - žádné změny

---

## 🔐 Environment Variables (.env)

**V projektu:**
```env
# Tyto hodnoty zůstávají BEZ ZMĚNY
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Pouze tato hodnota se mění
FRONTEND_URL=https://svag.pro  # ← ZMĚNĚNO
```

**Ve Vercel Dashboard:**
```
Settings → Environment Variables
FRONTEND_URL = https://svag.pro  # ← ZMĚNĚNO
```

---

## ⚠️ Časté problémy

### OTP kódy nepřicházejí
**Příčina:** Site URL není nastaven správně v Supabase
**Řešení:** Zkontrolujte Authentication → URL Configuration

### Aktivační linky vedou na starou doménu
**Příčina:** Email templates obsahují hardcodovaný `svag.vercel.app`
**Řešení:** Nahraďte za `{{ .SiteURL }}` nebo `svag.pro`

### Extension nemůže uložit ikonu do galerie
**Příčina:** CORS nebo API URL není správně nastaveno
**Řešení:** 
- Zkontrolujte `config.js` obsahuje `https://svag.pro`
- Zkontrolujte server.js má správný CORS
- Redeploy aplikace ve Vercel

### Galerie nefunguje po přihlášení
**Příčina:** Redirect URLs nejsou nastaveny v Supabase
**Řešení:** Přidejte `https://svag.pro/**` do Redirect URLs

---

## 📝 Checklist

- [ ] **Site URL změněn** na `https://svag.pro` v Supabase
- [ ] **Redirect URLs přidány** (`svag.pro/**` a `www.svag.pro/**`)
- [ ] **Email templates zkontrolovány** (žádné hardcodované URL)
- [ ] **FRONTEND_URL změněn** v .env a Vercel
- [ ] **Otestována registrace** s OTP kódem
- [ ] **Otestováno přihlášení** existujícího uživatele
- [ ] **Otestována galerie** a synchronizace s extension

---

## 📞 Supabase Dashboard URLs

- **Hlavní dashboard:** https://supabase.com/dashboard
- **Authentication settings:** https://supabase.com/dashboard/project/[PROJECT-ID]/auth/url-configuration
- **Email templates:** https://supabase.com/dashboard/project/[PROJECT-ID]/auth/templates

---

**Poznámka:** Po změně Site URL v Supabase může trvat 1-2 minuty, než se změny projeví. Není potřeba restartovat Supabase projekt.

---

**Poslední aktualizace:** 15. listopadu 2025

