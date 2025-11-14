# 🚀 SVAG - Kompletní Setup Guide

Tento průvodce vás provede celým procesem nastavení svag projektu se Supabase, Stripe a Vercel hostingem.

## 📋 Obsah

1. [Předpoklady](#předpoklady)
2. [Supabase Setup](#1-supabase-setup)
3. [Stripe Setup](#2-stripe-setup)
4. [Lokální Development](#3-lokální-development)
5. [Vercel Deployment](#4-vercel-deployment)
6. [Chrome Extension](#5-chrome-extension)
7. [První Admin Uživatel](#6-první-admin-uživatel)
8. [Testování](#7-testování)
9. [Řešení Problémů](#8-řešení-problémů)

---

## Předpoklady

Před začátkem se ujistěte, že máte:

- ✅ Node.js 18+ nainstalovaný
- ✅ npm nebo yarn
- ✅ Git
- ✅ Účet na [Supabase](https://supabase.com) (free)
- ✅ Účet na [Stripe](https://stripe.com) (test mode)
- ✅ Účet na [Vercel](https://vercel.com) (free)
- ✅ Chrome nebo Edge prohlížeč

---

## 1. Supabase Setup

### 1.1 Vytvoření Projektu

1. Jděte na https://supabase.com
2. Klikněte na **New Project**
3. Vyplňte:
   - **Name**: `svag` (nebo libovolný název)
   - **Database Password**: Silné heslo (uložte si ho!)
   - **Region**: Vyberte nejbližší region
4. Klikněte na **Create new project**
5. Počkejte ~2 minuty na vytvoření projektu

### 1.2 Získání API Keys

1. V levém menu: **Settings** → **API**
2. Zkopírujte:
   - **Project URL** (např. `https://xxxxx.supabase.co`)
   - **anon public** key (začíná `eyJ...`)
   - **service_role** key (začíná `eyJ...`) - **DŮLEŽITÉ: Držte v tajnosti!**

### 1.3 Vytvoření Databázového Schématu

1. V levém menu: **SQL Editor**
2. Klikněte na **New query**
3. Otevřete soubor `supabase-schema.sql` z tohoto projektu
4. Zkopírujte celý obsah souboru do SQL editoru
5. Klikněte na **Run** (nebo stiskněte Cmd/Ctrl + Enter)
6. Měli byste vidět: "Schema created successfully!"

### 1.4 Ověření Tabulek

1. V levém menu: **Table Editor**
2. Měli byste vidět tyto tabulky:
   - `user_profiles`
   - `svg_icons`
   - `payment_history`

✅ **Supabase je připravený!**

---

## 2. Stripe Setup

### 2.1 Vytvoření Účtu

1. Jděte na https://dashboard.stripe.com
2. Zaregistrujte se nebo přihlaste
3. **DŮLEŽITÉ**: Ujistěte se, že jste v **Test Mode** (přepínač vpravo nahoře)

### 2.2 Získání API Keys

1. V levém menu: **Developers** → **API keys**
2. Zkopírujte:
   - **Publishable key** (začíná `pk_test_...`)
   - **Secret key** (začíná `sk_test_...`) - klikněte "Reveal"

### 2.3 Vytvoření Pro Produktu

1. V levém menu: **Products** → **Add product**
2. Vyplňte:
   - **Name**: `svag Pro`
   - **Description**: `1000 SVG ikon, prioritní podpora`
   - **Pricing model**: `Standard pricing`
   - **Price**: `$9.99 USD`
   - **Billing period**: `Monthly`
   - **Recurring**: ✅ Zaškrtněte
3. Klikněte na **Add product**
4. Na stránce produktu zkopírujte **Price ID** (začíná `price_...`)

### 2.4 Nastavení Webhooků

**POZOR**: Tento krok uděláte POZDĚJI, po deployi na Vercel. Prozatím ho přeskočte.

✅ **Stripe základní setup hotový!** (Webhooks přidáte po deployi)

---

## 3. Lokální Development

### 3.1 Instalace Závislostí

```bash
cd /Users/lukas.vilkus/Projects/svag

# Nainstalovat backend závislosti
npm install express cors dotenv @supabase/supabase-js stripe pako
npm install --save-dev nodemon
```

### 3.2 Konfigurace Environment Variables

1. Zkopírujte `env.template` jako `.env`:

```bash
cp env.template .env
```

2. Otevřete `.env` a vyplňte hodnoty:

```env
# Supabase (z kroku 1.2)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Stripe (z kroků 2.2 a 2.3)
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_PRO_PRICE_ID=price_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # Prozatím nechte prázdné

# Frontend (Production)
FRONTEND_URL=https://svag.vercel.app
# For local development: http://localhost:3000

# Server
PORT=3000
NODE_ENV=development
```

### 3.3 Spuštění Serveru

```bash
# V kořenové složce projektu
node server.js

# Nebo s auto-reloadem:
npx nodemon server.js
```

Měli byste vidět:

```
═══════════════════════════════════════════════
🎨  svag Backend Server (Supabase + Stripe)
═══════════════════════════════════════════════

✅  Server běží na:       http://localhost:3000
🖼️  Galerie:              http://localhost:3000/gallery
🚀  Produkce:             https://svag.vercel.app
...
```

### 3.4 Test v Prohlížeči

1. Otevřete: 
   - **Landing page**: https://svag.vercel.app (produkce) / http://localhost:3000 (lokální)
   - **Galerie uživatelů**: https://svag.vercel.app/gallery (produkce) / http://localhost:3000/gallery (lokální)
2. Měli byste vidět:
   - Na root `/` = Landing page s informacemi a emoji 🎨
   - Na `/gallery` = Přihlašovací formulář nebo vaše galerie ikon

✅ **Lokální server běží!**

---

## 4. Vercel Deployment

### 4.1 Instalace Vercel CLI

```bash
npm install -g vercel
```

### 4.2 Přihlášení

```bash
vercel login
```

Postupujte podle instrukcí v terminálu.

### 4.3 První Deployment

```bash
# V kořenové složce projektu
vercel

# Odpovězte na otázky:
# Set up and deploy? Yes
# Which scope? Vyberte váš účet
# Link to existing project? No
# What's your project's name? svag (nebo jiný název)
# In which directory is your code located? ./
# Want to override settings? No
```

Deployment trvá ~1-2 minuty.

### 4.4 Nastavení Environment Variables

Po první deployi:

1. Jděte na https://vercel.com/dashboard
2. Vyberte svůj projekt `svag`
3. **Settings** → **Environment Variables**
4. Přidejte všechny proměnné z `.env` souboru:

```
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_ANON_KEY = eyJxxx...
SUPABASE_SERVICE_ROLE_KEY = eyJxxx...
STRIPE_SECRET_KEY = sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY = pk_test_xxxxx
STRIPE_PRO_PRICE_ID = price_xxxxx
STRIPE_WEBHOOK_SECRET = (prozatím prázdné)
FRONTEND_URL = https://your-project.vercel.app
NODE_ENV = production
```

5. Klikněte na **Save** u každé proměnné

### 4.5 Redeploy s Environment Variables

```bash
vercel --prod
```

### 4.6 Získání Production URL

Po dokončení deploye zkopírujte URL (např. `https://svag-xxxx.vercel.app`)

✅ **Backend je deploynutý na Vercel!**

---

## 2.4 Nastavení Webhooků (Pokračování)

Teď můžete dokončit Stripe webhook setup:

### A. Vytvoření Webhook Endpointu

1. Jděte na https://dashboard.stripe.com
2. **Developers** → **Webhooks**
3. Klikněte na **Add endpoint**
4. **Endpoint URL**: `https://your-project.vercel.app/api/webhooks/stripe`
5. **Events to send**:
   - Klikněte na **Select events**
   - Vyberte:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
6. Klikněte na **Add endpoint**

### B. Získání Webhook Secret

1. Na stránce webhook endpointu klikněte na **Reveal**
2. Zkopírujte **Signing secret** (začíná `whsec_...`)

### C. Aktualizace Vercel Environment Variables

1. Jděte na Vercel Dashboard → Settings → Environment Variables
2. Najděte `STRIPE_WEBHOOK_SECRET`
3. Přidejte hodnotu, kterou jste zkopírovali
4. Uložte a redeployujte:

```bash
vercel --prod
```

✅ **Stripe webhooks jsou připravené!**

---

## 5. Chrome Extension

### 5.1 Načtení Extension

1. Otevřete Chrome
2. Jděte na `chrome://extensions/`
3. Zapněte **Developer mode** (přepínač vpravo nahoře)
4. Klikněte na **Load unpacked**
5. Vyberte složku: `/Users/lukas.vilkus/Projects/svag`
6. Extension se objeví v seznamu

### 5.2 Nastavení API URL v Extension

1. Klikněte na ikonu extension v Chrome
2. V sekci **Nastavení**:
   - **API URL**: `https://your-project.vercel.app`
   - Klikněte **Uložit**

✅ **Extension je připravená!**

---

## 6. První Admin Uživatel

### 6.1 Registrace

1. Otevřete galerii: `https://your-project.vercel.app/gallery`
2. Zaregistrujte se s vaším emailem

### 6.2 Nastavení Admin Práv

1. Jděte na Supabase Dashboard
2. **SQL Editor** → **New query**
3. Spusťte:

```sql
UPDATE user_profiles 
SET is_admin = TRUE 
WHERE email = 'your-admin@email.com';
```

4. Klikněte na **Run**

### 6.3 Ověření

1. Odhlaste se a přihlaste znovu v galerii
2. Měli byste mít admin přístup

✅ **Admin uživatel vytvořen!**

---

## 7. Testování

### 7.1 Test Registrace & Přihlášení

1. Otevřete galerii
2. Zaregistrujte nového uživatele
3. Přihlaste se

### 7.2 Test Přidání Ikony

1. Jděte na nějakou stránku s SVG ikonami (např. heroicons.com)
2. Držte **Cmd** (nebo Ctrl) a najeďte na ikonu
3. Měl by se objevit náhled
4. Klikněte na ikonu → zobrazí se popup menu
5. Najeďte na **Do galerie**
6. Ikona by se měla přidat do galerie

### 7.3 Test Limitu

1. Přidejte několik ikon (do 100)
2. Po dosažení 100 ikon byste měli vidět upgrade notifikaci

### 7.4 Test Stripe Platby (Test Mode)

1. Klikněte na **Upgradovat na Pro** v galerii
2. Měli byste být přesměrováni na Stripe Checkout
3. Použijte testovací kartu:
   - **Číslo**: `4242 4242 4242 4242`
   - **Datum**: Jakékoliv budoucí datum
   - **CVC**: Jakékoliv 3 čísla
   - **Email**: Váš testovací email
4. Dokončete platbu
5. Měli byste být přesměrováni zpět do galerie s Pro tierem

### 7.5 Ověření v Supabase

1. Jděte na Supabase → **Table Editor** → `user_profiles`
2. Najděte svého uživatele
3. Ověřte:
   - `tier` = `pro`
   - `icon_limit` = `1000`
   - `stripe_subscription_id` je vyplněno

✅ **Vše funguje!**

---

## 8. Řešení Problémů

### Problém: Extension nemůže se připojit k API

**Řešení:**
- Zkontrolujte API URL v extension nastavení
- Zkontrolujte, že server běží na Vercelu
- Zkontrolujte Network tab v DevTools pro error detaily

### Problém: Stripe webhook nefunguje

**Řešení:**
- Zkontrolujte, že webhook URL je správná
- Zkontrolujte, že `STRIPE_WEBHOOK_SECRET` je nastavená v Vercel
- Zkontrolujte Stripe Dashboard → Webhooks → váš endpoint → Events log

### Problém: Nelze se přihlásit

**Řešení:**
- Zkontrolujte Supabase Dashboard → Authentication → Users
- Ověřte, že uživatel existuje
- Zkontrolujte, že Supabase keys jsou správné v Vercel

### Problém: Komprese nefunguje

**Řešení:**
- Zkontrolujte, že `pako` je nainstalovaný: `npm list pako`
- Zkontrolujte server logy pro compression errors

### Problém: RLS políčka blokují přístup

**Řešení:**
- Znovu spusťte `supabase-schema.sql`
- Zkontrolujte Supabase Dashboard → Authentication → Policies

---

## 🎉 Hotovo!

Váš svag projekt je plně funkční s:

- ✅ Supabase databází
- ✅ Stripe platbami (test mode)
- ✅ Vercel hostingem
- ✅ SVG kompresí
- ✅ Chrome extension
- ✅ Admin panelem

### Další Kroky:

1. **Produkční Stripe**: Přepněte na live mode a aktualizujte keys
2. **Custom Doména**: Přidejte si vlastní doménu ve Vercel
3. **Monitoring**: Nastavte si Vercel Analytics
4. **Backup**: Nastavte automatické zálohy v Supabase

---

## 📚 Užitečné Odkazy

- [Supabase Dokumentace](https://supabase.com/docs)
- [Stripe Dokumentace](https://stripe.com/docs)
- [Vercel Dokumentace](https://vercel.com/docs)
- [Chrome Extension Dokumentace](https://developer.chrome.com/docs/extensions/)

---

## 💡 Tipy

- **Development**: Používejte `nodemon` pro auto-reload
- **Testování**: Používejte Stripe test mode karty
- **Monitoring**: Sledujte Vercel logy pro errors
- **Bezpečnost**: Nikdy nesdílejte `SUPABASE_SERVICE_ROLE_KEY` nebo `STRIPE_SECRET_KEY`

---

Pokud máte jakékoliv problémy nebo otázky, zkontrolujte logs:

- **Vercel Logs**: Dashboard → your-project → Logs
- **Supabase Logs**: Dashboard → Logs Explorer
- **Stripe Logs**: Dashboard → Developers → Events
- **Chrome Extension Logs**: Chrome DevTools → Console

**Hodně štěstí! 🚀**

