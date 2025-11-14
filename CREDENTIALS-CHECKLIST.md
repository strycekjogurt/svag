# 📝 Credentials Checklist

> **Uložte si všechny tyto hodnoty** - budete je potřebovat pro Vercel environment variables

## ✅ Supabase (https://supabase.com)

```
□ Project URL:
  https://_____________________.supabase.co

□ Anon/Public Key:
  eyJ_____________________________________________

□ Service Role Key: (⚠️ TAJNÉ!)
  eyJ_____________________________________________
```

**Kde najít:**
- Supabase Dashboard → Settings → API

---

## ✅ Stripe (https://dashboard.stripe.com)

```
□ Publishable Key:
  pk_test_________________________________________

□ Secret Key: (⚠️ TAJNÉ!)
  sk_test_________________________________________

□ Price ID (Pro produkt):
  price___________________________________________

□ Webhook Secret: (vyplníte později)
  whsec___________________________________________
```

**Kde najít:**
- API Keys: Developers → API keys
- Price ID: Products → SVAG Pro → Price ID
- Webhook Secret: Developers → Webhooks → signing secret

---

## ✅ Vercel (https://vercel.com)

```
□ Production URL:
  https://svag-_____.vercel.app
```

**Získáte po první deployment**

---

## 📋 Kopírovat do Vercel Environment Variables

Po získání všech credentials, přidejte je do Vercel:

1. Vercel Dashboard → Settings → Environment Variables
2. Pro každou proměnnou:
   - Key: název proměnné
   - Value: hodnota shora
   - Environment: ✅ Production, Preview, Development

```env
SUPABASE_URL=https://_____.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET= (prázdné zatím)
FRONTEND_URL=https://svag-_____.vercel.app
NODE_ENV=production
```

---

## 🔒 Bezpečnost

⚠️ **NIKDY nesdílejte:**
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

✅ **Můžete sdílet:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `FRONTEND_URL`

---

## 💾 Backup

Uložte tyto credentials na bezpečné místo:
- 🔐 Password manager (1Password, Bitwarden)
- 📁 Šifrovaný soubor
- ☁️ Secure cloud storage

**NIKDY** je neukládejte:
- ❌ V Git repository
- ❌ Ve plain textu
- ❌ Na veřejných místech

