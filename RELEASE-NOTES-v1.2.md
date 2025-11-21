# svag v1.2.0 - Bulk Download Release Notes

## 🎉 Hlavní nová funkce: Hromadné stahování ikon

### Co je nového?

**Bulk Download (Hromadné stahování)** - Stáhněte všechny SVG ikony na stránce jedním kliknutím do ZIP archivu!

### Funkce

- ✅ **Automatická detekce** - Extension automaticky detekuje všechny SVG ikony na stránce (včetně shadow DOM)
- ✅ **Jeden klik ke stažení** - Tlačítko "Download all (X)" v popup zobrazuje počet nalezených ikon
- ✅ **ZIP archiv** - Všechny ikony se stáhnou jako ZIP soubor pojmenovaný podle domény (např. `example-com.zip`)
- ✅ **Inteligentní pojmenování** - Soubory se pojmenovávají podle názvu ikony nebo `icon-1.svg`, `icon-2.svg` atd.
- ✅ **Čistý SVG** - Používá stejný extraction systém jako jednotlivé stahování (v1.2.0 rewrite)
- ✅ **Deduplikace** - Automaticky filtruje duplikátní ikony
- ✅ **Bezpečnostní limity** - Maximální velikost ZIP 50MB

### Jak používat?

1. Otevřete popup extension na stránce s ikonami
2. Tlačítko vpravo od "⌘ cmd and hover any svg" zobrazí počet detekovaných ikon
3. Klikněte na tlačítko pro stažení všech ikon jako ZIP
4. ZIP se automaticky stáhne do složky Downloads

### UI/UX

- **Umístění**: Tlačítko je umístěno vpravo od helper textu v popup
- **Design**: Malé černé kulaté tlačítko s ikonou download + počtem
- **Loading stavy**: "..." při načítání, "✓" při úspěchu
- **Notifikace**: On-page notifikace po dokončení stahování

### Technické detaily

#### Soubory upravené/přidané:
- `jszip.min.js` - JSZip 3.10.1 knihovna (NOVÝ)
- `manifest.json` - Přidán JSZip do content_scripts, verze 1.2.0
- `popup.html` - Přidáno tlačítko #downloadAllBtn
- `popup.css` - Styling pro .download-all-btn
- `popup.js` - Funkce attachDownloadAllListeners() a detectIconsOnPage()
- `content.js` - Funkce detectAllSvgsOnPage() a downloadAllSvgs()

#### API:
```javascript
// Detekce ikon
chrome.tabs.sendMessage(tab.id, { action: 'detectAllSvgs' })
// Response: { success: true, count: 15 }

// Stažení jako ZIP
chrome.tabs.sendMessage(tab.id, { action: 'downloadAllSvgs' })
// Response: { success: true, count: 15, filename: 'example-com.zip' }
```

#### Pojmenování souborů:
- **Priorita 1**: Použít detekovaný název ikony (z `data-icon`, `aria-label`, `id`, atd.)
- **Priorita 2**: Fallback na `icon-{číslo}.svg`
- **Unikátnost**: Automaticky přidá `-1`, `-2` atd. při kolizi názvů

#### Pojmenování ZIP:
- Extrahováno z `window.location.hostname`
- Tečky nahrazeny pomlčkami: `example.com` → `example-com.zip`

### Testování

Doporučené testovací stránky:
- [Lucide Icons](https://lucide.dev/icons) - ~1000 ikon
- [Heroicons](https://heroicons.com) - ~200 ikon
- [Feather Icons](https://feathericons.com) - ~280 ikon
- [Font Awesome](https://fontawesome.com/icons) - tisíce ikon

### Limity

- **Max velikost ZIP**: 50MB
- **Timeout**: Žádný explicit timeout, ale browser může omezit dlouhé operace
- **Typy stránek**: Nefunguje na `chrome://` a extension pages

### Známé problémy

- Na stránkách s tisíci ikon může trvat několik sekund generování ZIP
- Některé komplexní SVG (s externými sprite soubory) nemusí být správně extrahovány

### Breaking Changes

Žádné! V1.2 je zpětně kompatibilní s v1.1.

### Další vylepšení v1.2

- **Tooltips v popup UI** - Všechna akční tlačítka nyní mají tooltips s popisem funkce
  - Gallery button: "Save to Gallery"
  - Download button: "Download SVG"
  - Switch order: "Switch Button Order"
  - Color scheme: "White Background" / "Black Background"
  - Download All: "Download all X SVGs" (dynamický počet)
  - Open Gallery: "Open Gallery"
  - Resend code: "Resend Code"
- Aktualizovaný popis v manifest.json
- Vylepšené console logy s `[svag v1.2]` prefixem
- Lepší error handling pro bulk operace

---

**Instalace**: Nahrajte rozšíření do Chrome nebo použijte Developer Mode pro lokální testing.

**Dokumentace**: Viz [README.md](./README.md) a [QUICK-START.md](./QUICK-START.md)

