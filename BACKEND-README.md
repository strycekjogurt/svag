# 🎨 svag Backend

Backend server pro svag Chrome extension s Supabase, Stripe platbami a SVG kompresí.

## 🚀 Rychlý Start

### 1. Instalace závislostí

```bash
npm install
```

### 2. Konfigurace

Zkopírujte `env.template` jako `.env` a vyplňte hodnoty:

```bash
cp env.template .env
```

### 3. Spuštění

```bash
# Produkční mode
npm start

# Development mode (s auto-reload)
npm run dev
```

Server běží na: 
- Local: http://localhost:3000
- Production: https://svag.pro
  - Landing page: `/` (root)
  - User gallery: `/gallery`

## 📁 Soubory

- `server.js` - Hlavní server soubor
- `backend-package.json` - Závislosti (přejmenujte na `package.json`)
- `supabase-schema.sql` - SQL schéma pro Supabase
- `env.template` - Šablona pro environment variables
- `vercel.json` - Konfigurace pro Vercel deployment
- `SETUP.md` - Kompletní setup guide
- `.gitignore` - Git ignore soubor

## 🔧 API Endpointy

### Autentizace
- `POST /api/auth/register` - Registrace
- `POST /api/auth/login` - Přihlášení

### Galerie
- `GET /api/gallery` - Získat ikony uživatele
- `POST /api/gallery` - Přidat novou ikonu
- `DELETE /api/gallery/:id` - Smazat ikonu
- `GET /api/gallery/stats` - Statistiky (current/limit)

### Billing (Stripe)
- `GET /api/pricing` - Získat pricing info
- `POST /api/create-checkout-session` - Vytvořit Stripe checkout
- `POST /api/cancel-subscription` - Zrušit subscription
- `POST /api/webhooks/stripe` - Stripe webhook endpoint

### Admin
- `GET /api/admin/users` - Seznam všech uživatelů
- `PUT /api/admin/users/:id/limit` - Aktualizovat limit
- `DELETE /api/admin/users/:id` - Smazat uživatele
- `GET /api/admin/stats` - Globální statistiky

### HTML Stránky
- `GET /gallery` - Webová galerie
- `GET /admin` - Admin panel
- `GET /health` - Health check

## 💰 Pricing

- **Free**: 100 ikon, základní podpora
- **Pro**: 1000 ikon za $9.99/měsíc

## 🗜️ Komprese

SVG ikony jsou automaticky komprimovány pomocí gzip, což šetří ~60-70% místa:

- Původní SVG: 10 KB
- Komprimovaný: ~3 KB
- Úspora: ~70%

## 🔐 Bezpečnost

- JWT tokeny pro autentizaci
- Row Level Security (RLS) v Supabase
- Stripe webhook signature verification
- HTTPS only v produkci

## 📊 Limity

### Supabase Free Tier
- 500 MB databáze
- 1 GB storage
- 50,000 MAU
- 2 GB bandwidth

**Odhad kapacity**: ~1000 uživatelů s plnou galerií

### Vercel Free Tier
- 100 GB bandwidth/měsíc
- Neomezené deployments
- Automatické HTTPS

## 🐛 Debugging

### Server logy
```bash
# Vercel
vercel logs

# Lokálně
node server.js
```

### Supabase logy
Dashboard → Logs Explorer

### Stripe události
Dashboard → Developers → Events

## 📚 Další Informace

Viz kompletní setup guide v `SETUP.md`

## 🤝 Support

Pro otázky a problémy, zkontrolujte:
- Server logy ve Vercel
- Supabase logs
- Stripe webhook events
- Chrome DevTools Console (pro extension)

