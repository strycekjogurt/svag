#!/bin/bash
# Script pro vytvoření instalovatelného Chrome rozšíření
# Vytvoří čistou složku která se dá jednoduše nainstalovat

echo "🎨 Vytváření instalovatelného SVAG rozšíření..."
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

OUTPUT_DIR="svag-chrome-extension"
ZIP_FILE="svag-chrome-extension.zip"

# Smazat starou složku pokud existuje
if [ -d "$OUTPUT_DIR" ]; then
    echo -e "${YELLOW}⚠️  Odstraňuji starou složku${NC}"
    rm -rf "$OUTPUT_DIR"
fi

# Smazat starý ZIP pokud existuje
if [ -f "$ZIP_FILE" ]; then
    rm "$ZIP_FILE"
fi

# Vytvořit čistou složku pro rozšíření
echo -e "${BLUE}📦 Kopíruji soubory rozšíření...${NC}"
mkdir -p "$OUTPUT_DIR"

# Zkopírovat všechny potřebné soubory
cp manifest.json "$OUTPUT_DIR/"
cp popup.html "$OUTPUT_DIR/"
cp popup.js "$OUTPUT_DIR/"
cp popup.css "$OUTPUT_DIR/"
cp content.js "$OUTPUT_DIR/"
cp content.css "$OUTPUT_DIR/"
cp background.js "$OUTPUT_DIR/"
cp config.js "$OUTPUT_DIR/"
cp -r icons "$OUTPUT_DIR/"
mkdir -p "$OUTPUT_DIR/Gallery"
cp Gallery/gallery-sync.js "$OUTPUT_DIR/Gallery/"

# Vytvořit také ZIP pro snadné sdílení
echo -e "${BLUE}📦 Vytváření ZIP balíčku...${NC}"
cd "$OUTPUT_DIR"
zip -r "../$ZIP_FILE" . -x "*.DS_Store"
cd ..

# Velikosti
FOLDER_SIZE=$(du -sh "$OUTPUT_DIR" | cut -f1)
ZIP_SIZE=$(du -h "$ZIP_FILE" | cut -f1)

echo ""
echo -e "${GREEN}✅ Rozšíření připraveno!${NC}"
echo ""
echo -e "${BLUE}📁 Složka: $OUTPUT_DIR ($FOLDER_SIZE)${NC}"
echo -e "${BLUE}📦 ZIP: $ZIP_FILE ($ZIP_SIZE)${NC}"
echo ""
echo -e "${GREEN}✨ Hotovo!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 ZPŮSOB 1: Instalace ze složky (Doporučeno)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  1. Otevři Chrome"
echo "  2. Jdi na: chrome://extensions/"
echo "  3. Zapni 'Developer mode' (přepínač vpravo nahoře)"
echo "  4. Klikni na 'Load unpacked' (Načíst bez balíčku)"
echo "  5. Vyber složku: $OUTPUT_DIR"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 ZPŮSOB 2: Sdílení ZIP souboru"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  1. Pošli soubor: $ZIP_FILE"
echo "  2. Příjemce ho rozbalí"
echo "  3. Příjemce nainstaluje složku stejným způsobem"
echo ""
echo "💡 TIP: Složka $OUTPUT_DIR je připravena k"
echo "    okamžité instalaci. Můžeš ji přesunout kamkoliv."
echo ""

