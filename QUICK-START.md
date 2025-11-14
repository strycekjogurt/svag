# ⚡ Quick Start - SVAG Deployment

> **3 hlavní kroky k publikaci**

## 1️⃣ Setup služeb (30 minut)

### Supabase
```bash
1. https://supabase.com → New Project
2. Zkopírujte: URL, anon_key, service_role_key
3. SQL Editor → Vložte obsah supabase-schema.sql → Run
```

### Stripe
```bash
1. https://stripe.com → Sign up
2. Test Mode → Developers → API keys
3. Products → Add product → $9.99/month
4. Zkopírujte: publishable_key, secret_key, price_id
```

---

## 2️⃣ Deploy backend (15 minut)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd /Users/lukas.vilkus/Projects/svag
vercel

# Set environment variables v Vercel Dashboard
# Settings → Environment Variables → Přidat všechny z env.template

# Redeploy
vercel --prod
```

**Zkopírujte si production URL:** `https://svag-xxxxx.vercel.app`

---

## 3️⃣ Publikovat extension (20 minut)

```bash
# 1. Aktualizovat API URL v popup.html
vim popup.html
# Změňte: value="https://svag-xxxxx.vercel.app"

# 2. Build ZIP
./build-extension.sh

# 3. Upload do Chrome Web Store
# → https://chrome.google.com/webstore/devconsole
# → New Item → Upload svag-extension.zip
```

---

## ✅ Hotovo!

**Co dál:**
- 🧪 Test: `https://svag-xxxxx.vercel.app/gallery`
- 📊 Monitor: Vercel/Supabase/Stripe dashboards
- ⏳ Čekat 24-72h na Chrome Web Store review

**Kompletní návod:** `DEPLOYMENT-GUIDE.md`

