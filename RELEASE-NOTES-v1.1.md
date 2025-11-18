# svag v1.1 - Enhanced SVG Extractor

## 🎯 Hlavní vylepšení

### Kompletní přepsání extraction layeru

Verze 1.1 přináší zásadní vylepšení způsobu extrakce SVG ikon z webových stránek. Celý extraction layer byl přepsán od základu s důrazem na jednoduchost, robustnost a čistotu výsledného kódu.

## ✨ Co je nového

### Nové funkce

- **`extractCleanSvg(svgElement)`** - Hlavní funkce pro extrakci čistého SVG
  - Vytváří nový čistý `<svg>` element od začátku
  - Přidává správné xmlns namespaces
  - Získává viewBox (z SVG nebo symbolu)
  - Vrací `{content: string, name: string}`

- **`extractShapes(sourceElement)`** - Extrahuje všechny shape elementy
  - Kopíruje geometry atributy (path, circle, rect, ellipse, line, polygon, polyline)
  - Aplikuje computed fill z CSS
  - Expanduje `<use>` elementy inline
  - Podporuje rekurzivní zpracování groups

### Klíčová vylepšení

- ✅ **Odstranění starého kódu**: Odstraněny funkce `compileSvgShapes()` a `compileShape()` (188 řádků)
- ✅ **Jednodušší architektura**: 2 hlavní funkce místo 10+ pomocných funkcí (157 řádků nového kódu)
- ✅ **100% čistý SVG**: Bez class atributů, s validním fill
- ✅ **Žádné XML errory**: Správné namespaces, validní struktura
- ✅ **Robustnější zpracování**: Pokrývá všechny use cases systematicky

### Principy nového extraktoru

1. **Jednoduchost** - Dvě hlavní funkce místo složité hierarchie
2. **Computed styles** - VŽDY aplikovat computed fill/stroke z CSS
3. **Žádné třídy** - NIKDY nekopírovat class atributy
4. **Expandovat use** - VŽDY vyřešit `<use>` elementy inline
5. **Fallback** - Použít currentColor jako fallback pro fill

## 🎨 Podporované typy SVG

Nový extraktor podporuje všechny moderní způsoby implementace SVG:

- ✅ Inline `<svg>` elementy v buttonech
- ✅ SVG s `<use>` elementy - sprite reference
- ✅ SVG s fill z CSS tříd
- ✅ Path s CSS classes - fill a stroke z CSS
- ✅ SVG s CSS proměnnými `var(--color)`
- ✅ SVG uvnitř select elementů
- ✅ Nested SVG groups
- ✅ Multiple paths s různými fill hodnotami
- ✅ SVG s xlink:href
- ✅ SVG pouze se stroke (bez fill)
- ✅ Kombinace různých shape elementů
- ✅ Ellipse a line elementy
- ✅ Polygon a polyline elementy
- ✅ SVG s data-dssvgid atributem
- ✅ Komplexní nested struktury s multiple groups
- ✅ SVG bez explicitního fill (currentColor)
- ✅ SVG s pointer-events: none
- ✅ Mix - sprite use + CSS class + transform
- ✅ Edge cases - path s currentColor

## 📊 Výsledky

- 🎯 **Čistější kód** - o 31 řádků méně, lepší čitelnost
- 🎯 **Robustnější** - pokrývá všechny use cases systematicky
- 🎯 **100% čistý SVG** - bez class atributů, s validním fill
- 🎯 **Žádné XML errors** - správné namespaces, validní struktura

## 🧪 Testování

Vytvořen kompletní testovací soubor `svg-test-cases.html` s 20 reálnými příklady:
- Buttony s inline SVG
- Selecty s ikonami
- Menu items
- Nested SVG
- Sprite systémy
- CSS třídy
- CSS proměnné

## 📦 Instalace

1. Stáhněte si `svag.zip`
2. Rozbalte soubor
3. Otevřete Chrome na `chrome://extensions/`
4. Zapněte Developer mode
5. Klikněte "Load unpacked"
6. Vyberte rozbalenou složku svag

## 🚀 Použití

1. Držte **⌘ (Cmd)** na Mac nebo **Ctrl** na Windows/Linux
2. Najeďte myší na SVG ikonu
3. Zobrazí se náhled ikony
4. Klikněte pro otevření menu s akcemi:
   - 💾 **Stáhnout** - uloží SVG soubor
   - 🖼️ **Do galerie** - pošle do vaší online galerie

## 🔗 Odkazy

- **GitHub**: https://github.com/strycekjogurt/svag
- **Web**: https://svag.pro
- **Dokumentace**: https://github.com/strycekjogurt/svag#readme

---

**Poznámka**: Tato verze je plně kompatibilní se všemi předchozími verzemi. Všechna existující nastavení a galerie zůstávají zachována.

