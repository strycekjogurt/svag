# 📦 Shrnutí migrace na svag.pro

## ✅ CO BYLO HOTOVO

### 🔧 Změněné soubory (22 souborů)

#### Extension soubory
- ✅ `config.js` - API URL: `https://svag.pro`
- ✅ `manifest.json` - gallery matches
- ✅ `popup.js` - 2 odkazy
- ✅ `popup.html` - hidden API URL
- ✅ `background.js` - sync login
- ✅ `content.js` - 2 odkazy
- ✅ `svag-chrome-extension/config.js` - API URL

#### Backend soubory
- ✅ `server.js` - FRONTEND_URL fallback
- ✅ `env.template` - FRONTEND_URL komentář

#### Dokumentace (7 souborů)
- ✅ `README.md` - 4 odkazy
- ✅ `SETUP.md` - 4 odkazy
- ✅ `DEPLOYMENT-GUIDE.md` - 1 odkaz
- ✅ `PRODUCTION-READY.md` - 16 odkazů
- ✅ `BACKEND-README.md` - 1 odkaz
- ✅ `LANDING-PAGE.md` - 2 odkazy
- ✅ `Gallery/README.md` - 2 odkazy

### 📦 Nové soubory
- ✅ `svag-extension.zip` (36K) - přebudovaná extension
- ✅ `MIGRACE-SVAG-PRO.md` - detailní návod na migraci
- ✅ `SUPABASE-RESEND-ZMENY.md` - návod pro Supabase změny

### 🔍 Ověření
- ✅ Všechny odkazy na `svag.vercel.app` změněny na `svag.pro`
- ✅ Zbývá pouze `server.js.backup` (backup soubor - ignorovat)
- ✅ Chrome extension přebudována s novými odkazy
- ✅ Konfigurace připravena

---

## 📋 CO MUSÍTE UDĚLAT VY (3 kroky)

### 1️⃣ DNS u registrátora (5 minut)

Přihlaste se do správy domény svag.pro a přidejte:

**A record:**
```
Name:  @
Value: 76.76.21.21
```

**CNAME record:**
```
Name:  www
Value: cname.vercel-dns.com
```

📖 **Návod:** Viz `MIGRACE-SVAG-PRO.md` sekce 1

---

### 2️⃣ Vercel Dashboard (10 minut)

1. Přejděte na: https://vercel.com/dashboard
2. Vyberte projekt **svag**
3. **Settings → Domains** → **Add Domain**
4. Přidejte: `svag.pro` (Primary)
5. Přidejte: `www.svag.pro` (Redirect to svag.pro)
6. **Settings → Environment Variables**
7. Změňte `FRONTEND_URL` na: `https://svag.pro`
8. **Redeploy** aplikaci

📖 **Návod:** Viz `MIGRACE-SVAG-PRO.md` sekce 2

---

### 3️⃣ Supabase Dashboard (5 minut)

1. Přejděte na: https://supabase.com/dashboard
2. **Authentication → URL Configuration**
3. **Site URL:** změňte na `https://svag.pro`
4. **Redirect URLs:** přidejte:
   - `https://svag.pro/**`
   - `https://www.svag.pro/**`
5. **Email Templates:** zkontrolujte (měly by používat variables)

📖 **Návod:** Viz `SUPABASE-RESEND-ZMENY.md`

---

## ✅ CHECKLIST

### Kódové změny (hotové)
- [x] Aktualizovány config soubory
- [x] Aktualizován manifest.json
- [x] Aktualizovány extension scripty
- [x] Aktualizována dokumentace
- [x] Přebudována Chrome extension
- [x] Vytvořeny návody

### Manuální kroky (čekají na vás)
- [ ] DNS záznamy přidány u registrátora
- [ ] Custom domény přidány ve Vercel
- [ ] SSL certifikáty aktivní (automaticky po DNS)
- [ ] Site URL změněn v Supabase
- [ ] Redirect URLs aktualizovány v Supabase
- [ ] FRONTEND_URL změněn ve Vercel
- [ ] Aplikace redeployed ve Vercel

### Testování (po dokončení)
- [ ] Landing page funguje na svag.pro
- [ ] www.svag.pro přesměruje na svag.pro
- [ ] API endpointy fungují
- [ ] Chrome extension se připojuje na novou doménu
- [ ] Registrace nových uživatelů funguje
- [ ] Přihlášení existujících uživatelů funguje
- [ ] Galerie funguje a synchronizuje

---

## 📚 Dokumenty k přečtení

1. **MIGRACE-SVAG-PRO.md** - Kompletní návod krok po kroku
2. **SUPABASE-RESEND-ZMENY.md** - Detaily o Supabase změnách

---

## 🎯 Rychlý start

Pokud chcete rychle začít:

```bash
# 1. Otevřete MIGRACE-SVAG-PRO.md
# 2. Postupujte podle sekcí 1-4
# 3. Zkontrolujte checklist v sekci 📝
# 4. Otestujte podle sekce 5
```

---

## ⏱️ Odhadovaný čas

- **DNS konfigurace:** 5 minut
- **Vercel setup:** 10 minut  
- **Supabase setup:** 5 minut
- **DNS propagace:** 5-60 minut
- **Testování:** 10 minut

**Celkem:** ~30-90 minut (většina času je čekání na DNS)

---

## 🚀 Po dokončení

1. ✅ Otestujte všechny funkce
2. ✅ Sledujte logy první den (Vercel Logs)
3. ✅ Můžete ponechat `svag.vercel.app` jako fallback
4. ✅ Nahrajte nový `svag-extension.zip` do Chrome Web Store

---

## 📊 Statistiky změn

- **Změněných souborů:** 22
- **Nahrazených odkazů:** ~40
- **Nových dokumentů:** 3
- **Velikost extension:** 36K
- **Čas migrace kódu:** ~15 minut ✅
- **Čas manuálních kroků:** ~30 minut ⏳

---

## ❓ Máte problémy?

Projděte sekci **🆘 Řešení problémů** v:
- `MIGRACE-SVAG-PRO.md`
- `SUPABASE-RESEND-ZMENY.md`

Běžné problémy:
- DNS se nepropaguje → Použijte https://dnschecker.org
- Vercel neověří doménu → Refresh po 5 minutách
- Extension nefunguje → Zkontrolujte Console (F12)
- OTP nepřichází → Zkontrolujte Site URL v Supabase

---

**Hodně štěstí! 🍀**

---

**Vytvořeno:** 15. listopadu 2025  
**Autor:** AI Assistant  
**Projekt:** svag.pro migration

