# 🚀 SVAG - Deployment Guide

> **Rychlý průvodce deployment** - Následujte tyto kroky pro zpřístupnění SVAG veřejnosti

---

## ✅ Co už je připraveno

- ✅ Privacy Policy endpoint v `server.js`
- ✅ API URL konfigurace v Chrome Extension
- ✅ ZIP balíček pro Chrome Web Store: `svag-extension.zip`
- ✅ Databázové schéma: `supabase-schema.sql`
- ✅ Environment template: `env.template`

---

## 📋 Checklist - Co potřebujete udělat

### FÁZE 1: Supabase Setup (15-20 minut)

#### [ ] Krok 1: Vytvoření Supabase projektu
1. Jděte na https://supabase.com a přihlaste se
2. Klikněte **New Project**
3. Vyplňte:
   - **Name**: `svag` (nebo vlastní)
   - **Database Password**: Silné heslo - **ULOŽTE SI HO!**
   - **Region**: `Europe (Frankfurt)` nebo nejbližší
   - **Plan**: Free
4. Klikněte **Create new project**
5. ⏳ Počkejte ~2 minuty

#### [ ] Krok 2: Získání API credentials
1. V Supabase Dashboard: **Settings** → **API**
2. Zkopírujte a **ULOŽTE SI**:
   ```
   Project URL: https://xxxxx.supabase.co
   anon public key: eyJ...
   service_role key: eyJ... (⚠️ TAJNÉ!)
   ```

#### [ ] Krok 3: Vytvoření databáze
1. V Dashboard: **SQL Editor** → **New query**
2. Otevřete soubor `supabase-schema.sql` v editoru
3. Zkopírujte **celý obsah** souboru
4. Vložte do SQL editoru
5. Klikněte **Run** (nebo Cmd/Ctrl + Enter)
6. ✅ Měli byste vidět: "Schema created successfully!"

#### [ ] Krok 4: Konfigurace Email Auth
1. V Dashboard: **Authentication** → **Providers**
2. Najděte **Email** provider
3. Ujistěte se, že je **Enabled** ✅
4. **Confirm email**: Můžete vypnout pro testování
5. Klikněte **Save**

**✅ Supabase hotovo!**

---

### FÁZE 2: Stripe Setup (10-15 minut)

#### [ ] Krok 1: Vytvoření Stripe účtu
1. Jděte na https://stripe.com
2. Klikněte **Sign up** a vyplňte registraci
3. Ověřte email
4. **DŮLEŽITÉ**: Ujistěte se, že jste v **Test Mode** (přepínač vpravo nahoře)

#### [ ] Krok 2: Získání API Keys
1. V Stripe Dashboard: **Developers** → **API keys**
2. Zkopírujte a **ULOŽTE SI**:
   ```
   Publishable key: pk_test_xxxxx
   Secret key: sk_test_xxxxx (klikněte "Reveal")
   ```

#### [ ] Krok 3: Vytvoření Pro produktu
1. V Dashboard: **Products** → **Add product**
2. Vyplňte:
   - **Name**: `SVAG Pro`
   - **Description**: `1000 SVG ikon + prioritní podpora`
   - **Pricing model**: Standard pricing
   - **Price**: `9.99` USD
   - **Billing period**: Monthly
   - **Recurring**: ✅ Zaškrtněte
3. Klikněte **Add product**
4. **Zkopírujte Price ID** (začíná `price_...`) - **ULOŽTE SI!**

**✅ Stripe Test Mode hotovo!**

⚠️ **Webhooks nastavíme později po Vercel deployment**

---

### FÁZE 3: Vercel Deployment (15-20 minut)

#### [ ] Krok 1: Instalace Vercel CLI
```bash
npm install -g vercel
```

#### [ ] Krok 2: Přihlášení k Vercel
```bash
vercel login
```
Postupujte podle instrukcí v browseru.

#### [ ] Krok 3: První deployment
```bash
cd /Users/lukas.vilkus/Projects/svag
vercel
```

Odpovězte na otázky:
- **Set up and deploy?** → Yes
- **Which scope?** → Vyberte váš účet
- **Link to existing project?** → No
- **Project name?** → `svag`
- **In which directory is your code?** → `./`
- **Override settings?** → No

⏳ Počkejte na deployment (~2 minuty)

**📝 Zkopírujte si production URL** (např. `https://svag-xxxxx.vercel.app`)

#### [ ] Krok 4: Nastavení Environment Variables
1. Jděte na https://vercel.com/dashboard
2. Vyberte projekt **svag**
3. **Settings** → **Environment Variables**
4. Přidejte tyto proměnné (použijte hodnoty z Supabase a Stripe):

```env
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_ANON_KEY = eyJ...
SUPABASE_SERVICE_ROLE_KEY = eyJ...
STRIPE_SECRET_KEY = sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY = pk_test_xxxxx
STRIPE_PRO_PRICE_ID = price_xxxxx
STRIPE_WEBHOOK_SECRET = (necháme prázdné zatím)
FRONTEND_URL = https://svag-xxxxx.vercel.app (vaše production URL)
NODE_ENV = production
```

Pro každou proměnnou:
- Klikněte **Add New**
- **Key**: název proměnné
- **Value**: hodnota
- **Environment**: Production, Preview, Development (všechny ✅)
- Klikněte **Save**

#### [ ] Krok 5: Redeploy s environment variables
```bash
vercel --prod
```

#### [ ] Krok 6: Test deployment
Otevřete v prohlížeči:
```
https://svag-xxxxx.vercel.app/health
```
Měli byste vidět: `{"status":"ok","timestamp":"..."}`

**✅ Backend je na Vercelu!**

---

### FÁZE 4: Dokončení Stripe Webhooks

#### [ ] Krok 1: Vytvoření Webhook endpointu
1. Jděte na https://dashboard.stripe.com
2. **Developers** → **Webhooks** → **Add endpoint**
3. **Endpoint URL**: `https://svag-xxxxx.vercel.app/api/webhooks/stripe`
   (použijte svou production URL!)
4. **Events to send** → Select events:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
5. Klikněte **Add endpoint**

#### [ ] Krok 2: Získání Webhook Secret
1. Na stránce webhook endpointu klikněte **Reveal** signing secret
2. Zkopírujte hodnotu (začíná `whsec_...`)

#### [ ] Krok 3: Aktualizace Vercel ENV
1. Vercel Dashboard → Settings → Environment Variables
2. Najděte `STRIPE_WEBHOOK_SECRET`
3. Vložte zkopírovanou hodnotu
4. Klikněte **Save**
5. Redeploy:
```bash
vercel --prod
```

**✅ Stripe webhooks funkční!**

---

### FÁZE 5: Aktualizace Chrome Extension

#### [ ] Krok 1: Aktualizovat API URL v popup.html
1. Otevřete soubor: `popup.html`
2. Najděte řádek: `<input type="hidden" id="apiUrl" value="https://svag.vercel.app" />`
3. Změňte na vaši production URL: `https://svag-xxxxx.vercel.app`
4. Uložte soubor

#### [ ] Krok 2: Znovu vytvořit ZIP balíček
```bash
./build-extension.sh
```

**✅ Extension připravena pro Web Store!**

---

### FÁZE 6: Chrome Web Store Publikace (30 minut + review)

#### [ ] Krok 1: Vytvoření Developer účtu
1. Jděte na https://chrome.google.com/webstore/devconsole
2. Přihlaste se Google účtem
3. Zaplaťte **$5 jednorázový poplatek**
4. Vyplňte developer informace

#### [ ] Krok 2: Upload extension
1. V Developer Dashboard: **New Item**
2. Klikněte **Choose file**
3. Nahrajte `svag-extension.zip`
4. Klikněte **Upload**

#### [ ] Krok 3: Vyplnění Store Listing
**Store Listing tab:**
- **Detailed description**: 
```
SVAG je Chrome extension pro snadné stahování a správu SVG ikon z webových stránek.

✨ Funkce:
• Cmd/Ctrl + hover - zobrazí náhled SVG ikony
• Cmd/Ctrl + klik - menu s akcemi (stáhnout/uložit do galerie)
• Online galerie s neomezeným úložištěm
• Komprese SVG pro úsporu místa
• Vyhledávání a třídění ikon
• Free: 100 ikon, Pro: 1000 ikon

🎨 Funguje na všech stránkách s SVG ikonami.
```
- **Category**: Developer Tools
- **Language**: Czech nebo English

#### [ ] Krok 4: Graphic Assets
Budete potřebovat vytvořit:
- **Small promotional tile** (440x280)
- **Large promotional tile** (920x680)
- **Marquee** (1400x560)
- **Screenshots** (1280x800) - alespoň 1

💡 Tip: Můžete použít Canva nebo Figma pro vytvoření těchto obrázků

#### [ ] Krok 5: Privacy Policy
- **Single purpose**: Stahování a správa SVG ikon
- **Host permissions justification**: Přístup k SVG elementům na stránkách
- **Privacy policy URL**: `https://svag-xxxxx.vercel.app/privacy`

#### [ ] Krok 6: Submit for review
1. Zkontrolujte všechny sekce
2. Klikněte **Submit for review**
3. ⏳ Revize trvá **24-72 hodin**

**✅ Extension odesláno na review!**

---

### FÁZE 7: Testování (před publikací)

#### [ ] Test 1: Registrace a přihlášení
1. Otevřete `https://svag-xxxxx.vercel.app/gallery`
2. Zadejte email
3. Zkontrolujte email (Supabase pošle OTP kód nebo aktivační link)
4. Dokončete registraci

#### [ ] Test 2: Chrome Extension
1. Načtěte unpacked extension v Chrome (`chrome://extensions/`)
2. Otevřete stránku s SVG (např. heroicons.com)
3. Cmd/Ctrl + hover na ikonu → měl by se objevit náhled
4. Cmd/Ctrl + klik → menu
5. "Do galerie" → ověřte že se ikona objevila v galerii

#### [ ] Test 3: Stripe platba (test mode)
1. V galerii klikněte "Upgradovat na Pro"
2. Použijte test kartu: `4242 4242 4242 4242`
3. Datum: jakékoliv budoucí
4. CVC: 123
5. Dokončete platbu
6. Ověřte upgrade v galerii (1000 ikon limit)

#### [ ] Test 4: Nastavení prvního admin uživatele
1. Supabase Dashboard → SQL Editor → New query
2. Spusťte:
```sql
UPDATE user_profiles 
SET is_admin = TRUE 
WHERE email = 'vas-email@example.com';
```

**✅ Vše funguje!**

---

## 🎉 Gratulujeme!

Váš projekt je připraven pro veřejnost!

### Co dělat dál?

**Během čekání na Chrome Web Store review:**
- ✅ Sdílejte galerii s přáteli: `https://svag-xxxxx.vercel.app/gallery`
- ✅ Sledujte Vercel Analytics pro traffic
- ✅ Monitorujte Supabase Dashboard pro nové uživatele
- ✅ Připravte marketing materiály

**Po schválení extension:**
- 🚀 Sdílejte na Twitter, Reddit, Product Hunt
- 📝 Napište blog post o vývoji
- 📊 Sledujte Stripe Dashboard pro platby
- 🐛 Sbírejte feedback od uživatelů

---

## 🆘 Řešení problémů

### Extension nemůže se připojit k API
- ✅ Zkontrolujte API URL v popup.html
- ✅ Zkontrolujte že server běží: `https://svag-xxxxx.vercel.app/health`
- ✅ Zkontrolujte browser console (F12) pro chyby

### Stripe webhook nefunguje
- ✅ Zkontrolujte webhook URL: `https://svag-xxxxx.vercel.app/api/webhooks/stripe`
- ✅ Zkontrolujte `STRIPE_WEBHOOK_SECRET` ve Vercel ENV
- ✅ Stripe Dashboard → Webhooks → Events log

### Nelze se přihlásit
- ✅ Zkontrolujte Supabase Dashboard → Authentication → Users
- ✅ Ověřte že Email provider je enabled
- ✅ Zkontrolujte spam folder pro aktivační email

---

## 📞 Podpora

Máte problém? Zkontrolujte logy:
- **Vercel Logs**: Dashboard → your-project → Logs
- **Supabase Logs**: Dashboard → Logs Explorer
- **Stripe Logs**: Dashboard → Developers → Events
- **Chrome Extension**: Chrome DevTools → Console

---

**Hodně štěstí! 🚀**

