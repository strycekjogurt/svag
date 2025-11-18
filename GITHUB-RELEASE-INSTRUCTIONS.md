# 🚀 Návod: Vytvoření GitHub Release v1.1.0

Tento návod popisuje, jak vytvořit nový release na GitHubu pro verzi v1.1.0.

## ✅ Co už je hotové

- [x] ZIP balíček extension vytvořen (`svag.zip` a `svag-extension.zip`)
- [x] Landing page aktualizována (v1.0 → v1.1)
- [x] Release notes napsány (`RELEASE-NOTES-v1.1.md`)
- [x] Git commit vytvořen
- [x] Git tag v1.1.0 vytvořen

## 📋 Kroky k dokončení

### 1. Push změn do GitHub

Pushněte commit a tag do GitHub:

```bash
cd /Users/lukas.vilkus/Projects/svag

# Push commit
git push origin main

# Push tag
git push origin v1.1.0
```

### 2. Vytvoření GitHub Release

#### Varianta A: Přes webové rozhraní

1. **Otevřete GitHub repozitář**
   ```
   https://github.com/strycekjogurt/svag
   ```

2. **Přejděte na Releases**
   - Klikněte na "Releases" v pravém bočním panelu
   - Nebo přejděte na: `https://github.com/strycekjogurt/svag/releases`

3. **Vytvořte nový release**
   - Klikněte na tlačítko "Draft a new release"

4. **Vyplňte informace**
   - **Tag version**: Vyberte `v1.1.0` z dropdown menu
   - **Release title**: `svag v1.1 - Enhanced SVG Extractor`
   - **Description**: Zkopírujte obsah z `RELEASE-NOTES-v1.1.md` nebo použijte zkrácenou verzi níže

5. **Přiložte soubory**
   - Klikněte "Attach binaries by dropping them here or selecting them"
   - Přiložte soubor: `svag.zip`

6. **Publikujte release**
   - Klikněte "Publish release"

#### Varianta B: Přes GitHub CLI (gh)

Pokud máte nainstalované GitHub CLI:

```bash
cd /Users/lukas.vilkus/Projects/svag

# Vytvořte release a nahrajte ZIP
gh release create v1.1.0 \
  svag.zip \
  --title "svag v1.1 - Enhanced SVG Extractor" \
  --notes-file RELEASE-NOTES-v1.1.md
```

### 3. Ověření

Po vytvoření releasu ověřte:

1. **Release je viditelný**
   - Návštivte: `https://github.com/strycekjogurt/svag/releases`
   - Měl by být vidět release v1.1.0

2. **Download link funguje**
   - Test odkazu: `https://github.com/strycekjogurt/svag/releases/latest/download/svag.zip`
   - Tento odkaz by měl automaticky stahovat `svag.zip`

3. **Landing page odkazy**
   - Návštivte: `https://svag.pro` (nebo lokální server)
   - Ověřte, že download buttony fungují
   - Ověřte, že verze je zobrazena jako v1.1

## 📝 Zkrácená verze release description

Pro GitHub release můžete použít tuto zkrácenou verzi:

```markdown
# svag v1.1 - Enhanced SVG Extractor

## 🎯 Hlavní vylepšení

Verze 1.1 přináší **kompletní přepsání extraction layeru** s důrazem na jednoduchost a robustnost.

### ✨ Co je nového

- ✅ **Nové funkce**: `extractCleanSvg()` a `extractShapes()`
- ✅ **Čistší kód**: z 188 řádků na 157 řádků
- ✅ **100% čistý SVG**: Bez class atributů, s validním fill
- ✅ **Žádné XML errors**: Správné namespaces, validní struktura
- ✅ **20+ podporovaných typů SVG**: Inline, sprites, CSS classes, CSS variables, nested groups...

### 📦 Instalace

1. Stáhněte `svag.zip`
2. Rozbalte soubor
3. V Chrome otevřete `chrome://extensions/`
4. Zapněte Developer mode
5. Klikněte "Load unpacked" a vyberte složku

### 🚀 Použití

1. Držte **⌘ (Cmd)** nebo **Ctrl**
2. Najeďte myší na SVG ikonu
3. Klikněte pro stažení nebo odeslání do galerie

---

**Plná dokumentace**: https://github.com/strycekjogurt/svag#readme  
**Web**: https://svag.pro
```

## 🔍 Troubleshooting

### Problem: Tag už existuje na GitHubu

```bash
# Smazat tag lokálně
git tag -d v1.1.0

# Smazat tag na GitHubu
git push origin :refs/tags/v1.1.0

# Vytvořit nový tag
git tag -a v1.1.0 -m "svag v1.1.0 - Enhanced SVG Extractor"
git push origin v1.1.0
```

### Problem: Release už existuje

1. Přejděte na existující release
2. Klikněte "Edit"
3. Aktualizujte informace a soubory
4. Klikněte "Update release"

### Problem: ZIP soubor není připojený

1. Otevřete release na GitHubu
2. Klikněte "Edit"
3. Přetáhněte `svag.zip` do oblasti "Attach binaries"
4. Klikněte "Update release"

## ✅ Checklist

- [ ] Push commit na GitHub
- [ ] Push tag na GitHub
- [ ] Vytvořit GitHub release
- [ ] Přiložit svag.zip
- [ ] Ověřit download link
- [ ] Ověřit landing page odkazy
- [ ] Oznámit uživatelům (volitelné)

---

**Poznámka**: Jakmile je release publikován, odkazy s `/releases/latest/download/svag.zip` budou automaticky odkazovat na nejnovější verzi.

