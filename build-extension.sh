#!/bin/bash
# Script pro vytvoření ZIP balíčku Chrome Extension pro Web Store
# Použití: ./build-extension.sh

echo "🎨 Building SVAG Chrome Extension for Web Store..."
echo ""

# Barvy pro výstup
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Název výstupního souboru
OUTPUT_FILE="svag-extension.zip"

# Kontrola zda už existuje
if [ -f "$OUTPUT_FILE" ]; then
    echo -e "${YELLOW}⚠️  Soubor $OUTPUT_FILE už existuje${NC}"
    read -p "Chcete ho přepsat? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Zrušeno"
        exit 1
    fi
    rm "$OUTPUT_FILE"
fi

echo -e "${BLUE}📦 Vytváření ZIP balíčku...${NC}"
echo ""

# Vytvořit ZIP pouze s extension soubory (vyloučit backend a development files)
zip -r "$OUTPUT_FILE" \
  manifest.json \
  popup.html \
  popup.js \
  popup.css \
  content.js \
  content.css \
  background.js \
  config.js \
  icons/ \
  Gallery/gallery-sync.js \
  -x "*.DS_Store" \
  -x "*.git*" \
  -x "__MACOSX/*" \
  -x ".DS_Store"

echo ""
echo -e "${GREEN}✅ ZIP balíček vytvořen: $OUTPUT_FILE${NC}"
echo ""

# Zobrazit velikost
SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
echo -e "${BLUE}📊 Velikost: $SIZE${NC}"
echo ""

# Zobrazit obsah
echo -e "${BLUE}📋 Obsah balíčku:${NC}"
unzip -l "$OUTPUT_FILE"

echo ""
echo -e "${GREEN}✨ Hotovo!${NC}"
echo ""
echo "📝 Další kroky:"
echo "  1. Otevřete: https://chrome.google.com/webstore/devconsole"
echo "  2. Klikněte 'New Item'"
echo "  3. Nahrajte soubor: $OUTPUT_FILE"
echo "  4. Vyplňte Store Listing (popis, ikony, screenshots)"
echo "  5. Submit for review"
echo ""

