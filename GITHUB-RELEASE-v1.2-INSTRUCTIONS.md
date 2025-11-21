# 🚀 Návod: Vytvoření GitHub Release v1.2.0

Tento návod popisuje kompletní proces pro vytvoření release v1.2.0 s novou funkcí "Bulk Download" a tooltips.

## 📋 Kroky k vytvoření release

### Krok 1: Příprava souborů

Všechny změny již máte připravené:
- [x] Nová funkce Bulk Download implementována
- [x] Tooltips přidány do popup UI
- [x] Manifest.json aktualizován na v1.2.0
- [x] Release notes napsány (`RELEASE-NOTES-v1.2.md`)
- [x] Build skripty aktualizovány (jszip.min.js)

### Krok 2: Vytvoření ZIP balíčku

Spusťte build script pro vytvoření instalovatelného balíčku:

```bash
cd /Users/lukas.vilkus/Projects/svag

# Vytvořit ZIP balíček pro uživatele (distribuci)
./create-installable-extension.sh
```

Tento příkaz vytvoří:
- **Složku**: `svag-chrome-extension/` - pro přímou instalaci
- **ZIP soubor**: `svag-chrome-extension.zip` - pro sdílení/GitHub release

Alternativně pro Chrome Web Store:
```bash
./build-extension.sh
```
To vytvoří: `svag-extension.zip` - optimalizovaný pro Web Store

### Krok 3: Commit a push změn

```bash
cd /Users/lukas.vilkus/Projects/svag

# Zkontrolovat změny
git status

# Přidat všechny změny
git add .

# Commit s popisem
git commit -m "Release v1.2.0 - Bulk Download & Tooltips

- Hromadné stahování SVG ikon do ZIP
- Tooltips pro všechna akční tlačítka
- Aktualizované build skripty
- Vylepšené UX v popup"

# Push do GitHub
git push origin main
```

### Krok 4: Vytvoření Git tagu

```bash
# Vytvořit anotovaný tag
git tag -a v1.2.0 -m "svag v1.2.0 - Bulk Download & Tooltips

Major Features:
- Bulk Download: Stáhněte všechny SVG ikony jedním kliknutím
- Tooltips: Nápověda pro všechna tlačítka v popup
- Vylepšené UX a použitelnost

Full release notes: https://github.com/strycekjogurt/svag/blob/main/RELEASE-NOTES-v1.2.md"

# Push tag do GitHub
git push origin v1.2.0
```

### Krok 5: Vytvoření GitHub Release

#### Varianta A: Přes webové rozhraní (Doporučeno)

1. **Otevřete GitHub repozitář**
   ```
   https://github.com/strycekjogurt/svag
   ```

2. **Přejděte na Releases**
   - Klikněte na "Releases" v pravém bočním panelu
   - Nebo: `https://github.com/strycekjogurt/svag/releases`

3. **Vytvořte nový release**
   - Klikněte "Draft a new release"

4. **Vyplňte informace:**
   - **Tag version**: `v1.2.0` (vyberte z dropdown)
   - **Release title**: `svag v1.2 - Bulk Download & Tooltips`
   - **Description**: Zkopírujte text níže ↓

5. **Přiložte soubory:**
   - Klikněte "Attach binaries by dropping them here"
   - Přiložte: `svag-chrome-extension.zip`

6. **Publikujte:**
   - Klikněte "Publish release"

#### Varianta B: Přes GitHub CLI (gh)

```bash
cd /Users/lukas.vilkus/Projects/svag

# Vytvořit release s připojeným ZIP
gh release create v1.2.0 \
  svag-chrome-extension.zip \
  --title "svag v1.2 - Bulk Download & Tooltips" \
  --notes-file RELEASE-NOTES-v1.2.md
```

---

## 📝 Text pro GitHub Release Description

```markdown
# svag v1.2 - Bulk Download & Tooltips

## 🎉 Hlavní nové funkce

### 1. 📦 Bulk Download - Hromadné stahování ikon

Stáhněte všechny SVG ikony na stránce jedním kliknutím do ZIP archivu!

**Funkce:**
- ✅ Automatická detekce všech SVG na stránce
- ✅ Stažení do ZIP souboru jedním kliknutím
- ✅ Inteligentní pojmenování souborů
- ✅ Deduplikace duplikátních ikon
- ✅ ZIP pojmenovaný podle domény (např. `example-com.zip`)

**Jak používat:**
1. Otevřete popup extension na stránce s ikonami
2. Tlačítko zobrazí počet detekovaných ikon (např. "72")
3. Klikněte na tlačítko pro stažení všech jako ZIP
4. ZIP se automaticky stáhne do Downloads

### 2. 💡 Tooltips v Popup UI

Všechna akční tlačítka nyní mají nápovědu při najetí myší:
- Gallery button: "Save to Gallery"
- Download button: "Download SVG"
- Switch order: "Switch Button Order"
- Color scheme: "White Background" / "Black Background"
- Download All: "Download all X SVGs" (dynamický počet)
- Open Gallery: "Open Gallery"

## 📦 Instalace

**Způsob 1: Developer Mode (Doporučeno)**
1. Stáhněte `svag-chrome-extension.zip`
2. Rozbalte soubor
3. V Chrome otevřete `chrome://extensions/`
4. Zapněte "Developer mode" (vpravo nahoře)
5. Klikněte "Load unpacked"
6. Vyberte rozbalenou složku

**Způsob 2: Chrome Web Store**
*Připravujeme...*

## 🚀 Použití

**Základní použití:**
1. Držte **⌘ (Cmd)** nebo **Ctrl**
2. Najeďte myší na SVG ikonu
3. Klikněte pro stažení nebo odeslání do galerie

**Hromadné stahování:**
1. Otevřete popup extension
2. Klikněte na tlačítko "Download all" vpravo nahoře
3. Všechny ikony se stáhnou jako ZIP

## 🔧 Technické detaily

- JSZip 3.10.1 pro vytváření ZIP archivů
- Detekce SVG včetně shadow DOM
- Maximální velikost ZIP: 50MB
- Deduplikace podle SVG obsahu

## 🐛 Známé problémy

- Na stránkách s tisíci ikon může generování ZIP trvat několik sekund
- Nefunguje na `chrome://` stránkách

## 🔗 Odkazy

- **Web**: https://svag.pro
- **Dokumentace**: [README.md](https://github.com/strycekjogurt/svag#readme)
- **Release Notes**: [RELEASE-NOTES-v1.2.md](https://github.com/strycekjogurt/svag/blob/main/RELEASE-NOTES-v1.2.md)

---

**Zpětná kompatibilita**: v1.2 je plně kompatibilní s v1.1 - žádné breaking changes!
```

---

## ✅ Checklist před publikací

- [ ] Build skripty spuštěny (`./create-installable-extension.sh`)
- [ ] ZIP soubor vytvořen (`svag-chrome-extension.zip`)
- [ ] Všechny změny commitnuty
- [ ] Commit pushnutý na GitHub (`git push origin main`)
- [ ] Tag vytvořen (`git tag -a v1.2.0`)
- [ ] Tag pushnutý na GitHub (`git push origin v1.2.0`)
- [ ] GitHub release vytvořen
- [ ] ZIP soubor připojen k releasu
- [ ] Download link funguje
- [ ] Landing page aktualizována (volitelné)

## 🔍 Ověření po publikaci

1. **Zkontrolovat release na GitHubu:**
   ```
   https://github.com/strycekjogurt/svag/releases/tag/v1.2.0
   ```

2. **Test download linku:**
   ```
   https://github.com/strycekjogurt/svag/releases/latest/download/svag-chrome-extension.zip
   ```
   Tento link by měl automaticky stáhnout nejnovější verzi.

3. **Lokální test instalace:**
   - Stáhněte ZIP z releasu
   - Rozbalte a nainstalujte v Chrome
   - Otestujte Bulk Download funkci
   - Otestujte všechny tooltips

## 🎯 Co dělat po releasu

1. **Oznámit uživatelům** (volitelné)
   - Twitter/X post
   - Product Hunt update
   - Email existujícím uživatelům

2. **Aktualizovat landing page** (volitelné)
   - Změnit verzi v1.1 → v1.2
   - Přidat zmínku o Bulk Download
   - Aktualizovat screenshots

3. **Publikovat na Chrome Web Store** (volitelné)
   - Upload `svag-extension.zip`
   - Update Store Listing
   - Submit for review

---

## 🆘 Troubleshooting

### ZIP soubor neexistuje

```bash
cd /Users/lukas.vilkus/Projects/svag
./create-installable-extension.sh
```

### Tag už existuje

```bash
# Smazat lokální tag
git tag -d v1.2.0

# Smazat remote tag
git push origin :refs/tags/v1.2.0

# Vytvořit nový
git tag -a v1.2.0 -m "Release message"
git push origin v1.2.0
```

### Release už existuje na GitHubu

1. Přejít na existující release
2. Kliknout "Edit"
3. Aktualizovat informace
4. Kliknout "Update release"

---

**Poznámka**: Jakmile je release publikován, odkaz `/releases/latest/download/svag-chrome-extension.zip` automaticky odkazuje na nejnovější verzi!

🎉 **Hotovo! Gratulujeme k vydání v1.2!**

